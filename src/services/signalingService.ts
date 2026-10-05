import { supabase } from "../lib/supabase";
import type { SignalMessage } from "../types/signaling";

export const getCallChannelName = (//creates the same channel name for both users.
 userId: string,
  otherUserId: string,
): string => {
  const users = [userId, otherUserId].sort();

  return `call:${users[0]}:${users[1]}`;
};

// User A ID = abc
// User B ID = xyz
// call:abc:xyz-same realtime channel name for both users, so they can communicate with each other.

export const createSignalingChannel = (// this function creates a signaling channel for WebRTC communication between two users using Supabase Realtime.
  userId: string,
  otherUserId: string,
  onSignal: (signal: SignalMessage) => void,
) => {
  const channelName = getCallChannelName(userId, otherUserId);

  const channel = supabase
    .channel(channelName)
    .on(
      "broadcast",
      { event: "signal" },
      ({ payload }) => {
        const signal = payload as SignalMessage;

        if (
          signal.senderId === userId
        ) {
          return;
        }

        onSignal(signal);//call signal received from the other user. with offer, answer, ice-candidate, call-rejected, or call-ended.
      },
    )
    .subscribe();

  return channel;
};

export const sendSignal = async (
  channel: ReturnType<typeof supabase.channel>,
  signal: SignalMessage,
): Promise<void> => {
  await channel.send({
    type: "broadcast",
    event: "signal",
    payload: signal,
  });
};