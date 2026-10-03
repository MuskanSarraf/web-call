import { useEffect, useRef, useState } from "react";
import {
  createPeerConnection,
  getMicrophoneStream,
} from "../services/webrtcService";
import {
  createSignalingChannel,
  sendSignal,
} from "../services/signalingService";
import type { SignalMessage } from "../types/signaling";



export const useWebRTC = (
  userId: string,
  otherUserId: string | null,
) => {
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

  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);

  const setupRemoteAudio = (
  peerConnection: RTCPeerConnection,
  ) => {
  peerConnection.ontrack = (event) => {
    const [remoteStream] = event.streams;

    if (!remoteStream || !remoteAudioRef.current) {
      return;
    }

    remoteAudioRef.current.srcObject = remoteStream;
  };
  };

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

  useEffect(() => {
    if (!otherUserId) {
      return;
    }
    const handleSignal = async (signal: SignalMessage) => {
      if (signal.type === "offer") {
        pendingOfferRef.current = signal.data;
        setIncomingCall(true);
        return;
      }

      if (signal.type === "ice-candidate") {
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection?.remoteDescription) {
          pendingCandidatesRef.current.push(signal.data);
          return;
        }

        await peerConnection.addIceCandidate(signal.data);
        return;
      }

      if (
        signal.type === "call-rejected" ||
        signal.type === "call-ended"
      ) {
        localStreamRef.current?.getTracks().forEach((track) => {
          track.stop();
        });
        peerConnectionRef.current?.close();
        localStreamRef.current = null;
        peerConnectionRef.current = null;
        pendingCandidatesRef.current = [];
        pendingOfferRef.current = null;
        setIsCalling(false);
        setIncomingCall(false);
        return;
      }

      if (signal.type === "answer") {
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(signal.data);

        for (const candidate of pendingCandidatesRef.current) {
          await peerConnection.addIceCandidate(candidate);
        }

        pendingCandidatesRef.current = [];
        setIsCalling(true);
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

  const startCall = async () => {
    if (!otherUserId) {
      return;
    }

    const stream = await getMicrophoneStream();

    const peerConnection = createPeerConnection();

    setupIceCandidateHandler(peerConnection);
    setupRemoteAudio(peerConnection);

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    localStreamRef.current = stream;
    peerConnectionRef.current = peerConnection;

    const offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    if (!channelRef.current) {
      return;
    }

    await sendSignal(channelRef.current, {
      type: "offer",
      senderId: userId,
      receiverId: otherUserId,
      data: offer,
    });

    setIsCalling(true);
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(
      (track) => {
        track.stop();
      },
    );

    peerConnectionRef.current?.close();

    localStreamRef.current = null;
    peerConnectionRef.current = null;

    pendingCandidatesRef.current = [];

    setIsCalling(false);
  };

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
      const acceptCall = async () => {
  if (!otherUserId) {
    return;
  }

  if (!pendingOfferRef.current) {
    return;
  }

  const stream = await getMicrophoneStream();

  const peerConnection = createPeerConnection();

  setupIceCandidateHandler(peerConnection);
  setupRemoteAudio(peerConnection);

  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });

  localStreamRef.current = stream;
  peerConnectionRef.current = peerConnection;

  await peerConnection.setRemoteDescription(
    pendingOfferRef.current,
  );

  for (const candidate of pendingCandidatesRef.current) {
    await peerConnection.addIceCandidate(candidate);
  }

  pendingCandidatesRef.current = [];

  const answer =
    await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(answer);

  if (!channelRef.current) {
    return;
  }

  await sendSignal(channelRef.current, {
    type: "answer",
    senderId: userId,
    receiverId: otherUserId,
    data: answer,
  });

  pendingOfferRef.current = null;

  setIncomingCall(false);
  setIsCalling(true);
  }; 
  const rejectCall = async () => {
  if (!channelRef.current || !otherUserId) {
    return;
  }

  await sendSignal(channelRef.current, {
    type: "call-rejected",
    senderId: userId,
    receiverId: otherUserId,
    data: null,
  });

  pendingOfferRef.current = null;

  setIncomingCall(false);
};

  return {
    isCalling,
    incomingCall,
    startCall,
    acceptCall,
    endCall,
    rejectCall,
    remoteAudioRef,
  };
};