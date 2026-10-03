import { supabase } from "../lib/supabase";

export const signUp = async (
  email: string,
  password: string,
) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const signIn = async (
  email: string,
  password: string,
) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};