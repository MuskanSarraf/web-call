import { supabase } from "../lib/supabase";
import type { SignalMessage } from "../types/signaling";

export const getCallChannelName = (
 userId: string,
  otherUserId: string,
): string => {
  const users = [userId, otherUserId].sort();

  return `call:${users[0]}:${users[1]}`;
};

export const createSignalingChannel = (
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

        onSignal(signal);
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