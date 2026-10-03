export type SignalType =
  | "offer"
  | "answer"
  | "ice-candidate";

type SignalMetadata = {
  senderId: string;
  receiverId: string;
};

export type SignalMessage =
  | (SignalMetadata & {
      type: "offer";
      data: RTCSessionDescriptionInit;
    })
  | (SignalMetadata & {
      type: "answer";
      data: RTCSessionDescriptionInit;
    })
  | (SignalMetadata & {
      type: "ice-candidate";
      data: RTCIceCandidateInit;
    });