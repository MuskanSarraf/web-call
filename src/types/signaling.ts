export type SignalType =
  | "offer"
  | "answer"
  | "ice-candidate"
  | "call-rejected"
  |"call-ended";

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
    })
  | (SignalMetadata & {
      type: "call-rejected";
      data: null;
    })
  | (SignalMetadata & {
      type: "call-ended";
      data: null;
    });