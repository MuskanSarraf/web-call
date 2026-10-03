import { supabase } from "../lib/supabase";

export type CallStatus =
  | "calling"
  | "connected"
  | "rejected"
  | "ended"
  | "failed";

export type CallUpdate = {
  status?: CallStatus;
  answeredAt?: string;
  endedAt?: string;
  duration?: number;
};

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

export const getLatestCallingCall = async (
  callerId: string,
  receiverId: string,
): Promise<number | null> => {
  const { data, error } = await supabase
    .from("calls")
    .select("id")
    .eq("caller_id", callerId)
    .eq("receiver_id", receiverId)
    .eq("status", "calling")
    .order("started_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
};

export const updateCall = async (
  callId: number,
  values: CallUpdate,
): Promise<void> => {
  const updateData: {
    status?: CallStatus;
    answered_at?: string;
    ended_at?: string;
    duration?: number;
  } = {};

  if (values.status !== undefined) {
    updateData.status = values.status;
  }

  if (values.answeredAt !== undefined) {
    updateData.answered_at = values.answeredAt;
  }

  if (values.endedAt !== undefined) {
    updateData.ended_at = values.endedAt;
  }

  if (values.duration !== undefined) {
    updateData.duration = values.duration;
  }

  const { error } = await supabase
    .from("calls")
    .update(updateData)
    .eq("id", callId);

  if (error) {
    throw error;
  }
};