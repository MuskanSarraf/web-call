import { supabase } from "../lib/supabase";

export const signUp = async (//Supabase creates the authentication account.
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

export const signIn = async (//If successful, Supabase creates an authenticated session.
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

export const signOut = async () => {//This removes the current authentication session.
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};