import { supabase } from "../lib/supabase";
import type { Profile } from "../types/profile";

export const getProfiles = async (
  currentUserId: string,
): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", currentUserId)
    .order("email", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data.map((item) => ({
    id: item.id,
    email: item.email,
    createdAt: item.created_at,
  }));
};