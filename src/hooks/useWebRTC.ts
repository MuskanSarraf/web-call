import { useEffect, useRef, useState } from "react";
import {
  createPeerConnection,
  getMicrophoneStream,
} from "../services/webrtcService";
import {
  createSignalingChannel,
  sendSignal,
} from "../services/signalingService";
import {
  createCall,
  getLatestCallingCall,
  updateCall,
} from "../services/callService";
import type { SignalMessage } from "../types/signaling";

export const useWebRTC = (
  userId: string,
  otherUserId: string | null,
) => {
  //userefs-values need to survive React renders without causing unnecessary re-renders.
  const peerConnectionRef =
    useRef<RTCPeerConnection | null>(null);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const channelRef =
    useRef<ReturnType<typeof createSignalingChannel> | null>(null);

  const pendingCandidatesRef =
    useRef<RTCIceCandidateInit[]>([]);

  const pendingOfferRef =
    useRef<RTCSessionDescriptionInit | null>(null);

  const remoteAudioRef =
    useRef<HTMLAudioElement | null>(null);

  const callIdRef =
    useRef<number | null>(null);

  const callStartedAtRef =
    useRef<Date | null>(null);

  const answeredAtRef =
    useRef<Date | null>(null);

  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);

  /*
   * Clean up WebRTC resources-closes the peer connection, stops the local media tracks, and resets the state.
   * This does NOT update the database or send signals.
   */
  const cleanupCall = () => {
    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    peerConnectionRef.current?.close();

    localStreamRef.current = null;
    peerConnectionRef.current = null;

    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;

    callIdRef.current = null;
    callStartedAtRef.current = null;
    answeredAtRef.current = null;

    setIsCalling(false);
    setIncomingCall(false);
  };

  /*
   * Send ICE candidates to the other user-How can I actually reach the other browser?
   */
  const setupIceCandidateHandler = (
    peerConnection: RTCPeerConnection,
  ) => {
    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      if (!channelRef.current || !otherUserId) {
        return;
      }

      void sendSignal(channelRef.current, {
        type: "ice-candidate",
        senderId: userId,
        receiverId: otherUserId,
        data: event.candidate.toJSON(),
      });
    };
  };

  /*
   * Attach the remote audio stream to the audio element.
   */
  const setupRemoteAudio = (
    peerConnection: RTCPeerConnection,
  ) => {
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;

      if (!remoteStream || !remoteAudioRef.current) {
        return;
      }

      remoteAudioRef.current.srcObject = remoteStream;

      void remoteAudioRef.current.play().catch(() => {
        // Browser may require user interaction before audio playback.
      });
    };
  };

  /*
   * Handle incoming WebRTC signaling messages.
   */
  useEffect(() => {
    if (!otherUserId) {
      return;
    }

    const handleSignal = async (// Handle incoming WebRTC signaling messages.
      signal: SignalMessage,
    ): Promise<void> => {
      /*
       * Someone is calling us.
       * We only store the offer here.
       * The actual microphone/peer connection is created
       * after the user clicks Accept.
       */
      if (signal.type === "offer") {
        pendingOfferRef.current =
          signal.data as RTCSessionDescriptionInit;

        setIncomingCall(true);

        return;
      }

      /*
       * Caller receives the answer.
       */
      if (signal.type === "answer") {
        const peerConnection =
          peerConnectionRef.current;

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(
          signal.data as RTCSessionDescriptionInit,
        );

        for (const candidate of pendingCandidatesRef.current) {
          await peerConnection.addIceCandidate(candidate);
        }

        pendingCandidatesRef.current = [];

        answeredAtRef.current = new Date();

        if (callIdRef.current) {
          await updateCall(callIdRef.current, {
            status: "connected",
            answeredAt: answeredAtRef.current.toISOString(),
          });
        }

        setIsCalling(true);

        return;
      }

      /*
       * ICE candidate arrived.
       */
      if (signal.type === "ice-candidate") {
        const peerConnection =
          peerConnectionRef.current;

        if (!peerConnection) {
          return;
        }

        const candidate =
          signal.data as RTCIceCandidateInit;

        /*
         * ICE can arrive before the remote description.
         * Store it temporarily.
         */
        if (!peerConnection.remoteDescription) {
          pendingCandidatesRef.current.push(candidate);

          return;
        }

        await peerConnection.addIceCandidate(candidate);

        return;
      }

      /*
       * Caller rejected our call.
       */
      if (signal.type === "call-rejected") {
        if (callIdRef.current) {
          await updateCall(callIdRef.current, {
            status: "rejected",
            endedAt: new Date().toISOString(),
          });
        }

        cleanupCall();

        return;
      }

      /*
       * Other user ended the call.
       */
      if (signal.type === "call-ended") {
        if (callIdRef.current) {
          const endedAt = new Date();

          const answeredAt =
            answeredAtRef.current;

          const duration = answeredAt
            ? Math.floor(
                (endedAt.getTime() -
                  answeredAt.getTime()) /
                  1000,
              )
            : 0;

          await updateCall(callIdRef.current, {
            status: "ended",
            endedAt: endedAt.toISOString(),
            duration,
          });
        }

        cleanupCall();
      }
    };

    const channel = createSignalingChannel(
      userId,
      otherUserId,
      (signal) => {
        void handleSignal(signal);
      },
    );

    channelRef.current = channel;

    return () => {
      void channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, otherUserId]);

  /*
   * Start an outgoing call.
   */
  const startCall = async (): Promise<void> => {
    if (!otherUserId) {
      return;
    }

    try {
      /*
       * 1. Create call metadata in DB.
       */
      const callId = await createCall(
        userId,
        otherUserId,
      );

      callIdRef.current = callId;
      callStartedAtRef.current = new Date();

      /*
       * 2. Get microphone.
       */
      const stream = await getMicrophoneStream();

      /*
       * 3. Create WebRTC connection.
       */
      const peerConnection =
        createPeerConnection();

      setupIceCandidateHandler(peerConnection);
      setupRemoteAudio(peerConnection);

      /*
       * 4. Add microphone tracks-Send this microphone audio through this connection.
       */
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      localStreamRef.current = stream;
      peerConnectionRef.current = peerConnection;

      /*
       * 5. Create offer-want to establish a WebRTC connection with these capabilities.
       */
      const offer =
        await peerConnection.createOffer();

      await peerConnection.setLocalDescription(
        offer,
      );

      if (!channelRef.current) {
        throw new Error(
          "Call signaling channel is not ready.",
        );
      }

      /*
       * 6. Send offer to receiver.
       */
      await sendSignal(channelRef.current, { //supabase realtime broadcasts this offer to the other user.
        type: "offer",
        senderId: userId,
        receiverId: otherUserId,
        data: offer,
      });

      setIsCalling(true);
    } catch (error) {
      /*
       * If WebRTC setup fails after creating the DB row,
       * mark the call as failed.
       */
      if (callIdRef.current) {
        try {
          await updateCall(callIdRef.current, {
            status: "failed",
            endedAt: new Date().toISOString(),
          });
        } catch {
          // Keep the original call error.
        }
      }

      cleanupCall();

      throw error;
    }
  };

  /*
   * Accept an incoming call.
   */
  const acceptCall = async (): Promise<void> => {
    if (!otherUserId) {
      return;
    }

    const pendingOffer = pendingOfferRef.current;//pendingOfferRef.current is set when the other user sends an offer. It is stored in a ref so that it can be accessed later when the user accepts the call.

    if (!pendingOffer) {
      return;
    }

    try {
      /*
       * Find the DB row created by the caller.
       */
      const callId = await getLatestCallingCall(
        otherUserId,
        userId,
      );

      if (!callId) {
        throw new Error(
          "Call record was not found.",
        );
      }

      callIdRef.current = callId;

      /*
       * Get receiver microphone.
       */
      const stream = await getMicrophoneStream();

      /*
       * Create receiver WebRTC connection.
       */
      const peerConnection =
        createPeerConnection();

      setupIceCandidateHandler(peerConnection);
      setupRemoteAudio(peerConnection);

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      localStreamRef.current = stream;
      peerConnectionRef.current = peerConnection;

      /*
       * Set caller's offer as remote description.
       */
      await peerConnection.setRemoteDescription(
        pendingOffer,
      );

      /*
       * Add ICE candidates that arrived early.
       */
      for (const candidate of pendingCandidatesRef.current) {
        await peerConnection.addIceCandidate(candidate);
      }

      pendingCandidatesRef.current = [];

      /*
       * Create answer.
       */
      const answer =
        await peerConnection.createAnswer();

      await peerConnection.setLocalDescription(
        answer,
      );

      if (!channelRef.current) {
        throw new Error(
          "Call signaling channel is not ready.",
        );
      }

      /*
       * Send answer to caller.
       */
      await sendSignal(channelRef.current, {
        type: "answer",
        senderId: userId,
        receiverId: otherUserId,
        data: answer,
      });

      answeredAtRef.current = new Date();

      /*
       * Update DB.
       */
      await updateCall(callId, {
        status: "connected",
        answeredAt:
          answeredAtRef.current.toISOString(),
      });

      pendingOfferRef.current = null;

      setIncomingCall(false);
      setIsCalling(true);
    } catch (error) {
      cleanupCall();
      throw error;
    }
  };

  /*
   * Reject an incoming call.
   */
  const rejectCall = async (): Promise<void> => {
    if (!otherUserId) {
      return;
    }

    /*
     * Find the caller's DB call record.
     */
    const callId = await getLatestCallingCall(
      otherUserId,
      userId,
    );

    /*
     * Tell caller that we rejected.
     */
    if (channelRef.current) {
      await sendSignal(channelRef.current, {
        type: "call-rejected",
        senderId: userId,
        receiverId: otherUserId,
        data: null,
      });
    }

    /*
     * Update database.
     */
    if (callId) {
      await updateCall(callId, {
        status: "rejected",
        endedAt: new Date().toISOString(),
      });
    }

    pendingOfferRef.current = null;
    setIncomingCall(false);
  };

  /*
   * End an active call.
   */
  const endCall = async (): Promise<void> => {
    if (!otherUserId) {
      cleanupCall();
      return;
    }

    /*
     * Tell the other user first.
     */
    if (channelRef.current) {
      await sendSignal(channelRef.current, {
        type: "call-ended",
        senderId: userId,
        receiverId: otherUserId,
        data: null,
      });
    }

    /*
     * Update call metadata.
     */
    if (callIdRef.current) {
      const endedAt = new Date();

      const answeredAt =
        answeredAtRef.current;

      const duration = answeredAt
        ? Math.floor(
            (endedAt.getTime() -
              answeredAt.getTime()) /
              1000,
          )
        : 0;

      await updateCall(callIdRef.current, {
        status: "ended",
        endedAt: endedAt.toISOString(),
        duration,
      });
    }

    cleanupCall();
  };

  /*
   * Clean up when the component is removed.
   */
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(
        (track) => {
          track.stop();
        },
      );

      peerConnectionRef.current?.close();
    };
  }, []);

  return {
    isCalling,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    remoteAudioRef,
  };
};