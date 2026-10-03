import { supabase } from "../lib/supabase";

export const subscribeToMessages = (
  callback: (message: {
    id: number;
    senderId: string;
    receiverId: string;
    message: string;
    createdAt: string;
  }) => void,
) => {
  const channel = supabase
    .channel("messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const newMessage = payload.new;

        callback({
          id: newMessage.id,
          senderId: newMessage.sender_id,
          receiverId: newMessage.receiver_id,
          message: newMessage.message,
          createdAt: newMessage.created_at,
        });
      },
    )
    .subscribe();

  return channel;
};