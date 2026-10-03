export type CallStatus =
  | "idle"
  | "calling"
  | "incoming"
  | "connected"
  | "ended";

export type CallState = {
  status: CallStatus;
  callerId: string | null;
  receiverId: string | null;
};