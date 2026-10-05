export const createPeerConnection = (): RTCPeerConnection => {//This creates the WebRTC connection.

//STUN helps the browsers discover how they can communicate through their networks.
  return new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  });
};

export const getMicrophoneStream =//acquire the user's microphone stream access
  async (): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
  };