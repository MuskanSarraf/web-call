import { supabase } from "../lib/supabase";
import type { Message, SendMessageInput } from "../types/message";

export const sendMessage = async (
  senderId: string,
  input: SendMessageInput,
): Promise<Message> => {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: senderId,
      receiver_id: input.receiverId,
      message: input.message,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    senderId: data.sender_id,
    receiverId: data.receiver_id,
    message: data.message,
    createdAt: data.created_at,
  };
};

export const getMessages = async (
  currentUserId: string,
  otherUserId: string,
): Promise<Message[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
    )
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data.map((item) => ({
    id: item.id,
    senderId: item.sender_id,
    receiverId: item.receiver_id,
    message: item.message,
    createdAt: item.created_at,
  }));
};