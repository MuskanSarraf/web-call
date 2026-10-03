import { supabase } from "../lib/supabase";

export const createCall = async (
  callerId: string,
  receiverId: string,
): Promise<number> => {
  const { data, error } = await supabase
    .from("calls")
    .insert({
      caller_id: callerId,
      receiver_id: receiverId,
      status: "calling",
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
};

export const updateCall = async (
  callId: number,
  values: {
    status?: string;
    answeredAt?: string;
    endedAt?: string;
    duration?: number;
  },
): Promise<void> => {
  const { error } = await supabase
    .from("calls")
    .update({
      status: values.status,
      answered_at: values.answeredAt,
      ended_at: values.endedAt,
      duration: values.duration,
    })
    .eq("id", callId);

  if (error) {
    throw error;
  }
};