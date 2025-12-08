"use server";

import { compare } from "bcryptjs";
import { getDb } from "@/lib/db";
import { isRoastMode } from "@/lib/auth-utils";

export async function loginAction(email: string, pin: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();

  const user = await db.users.where("email").equals(normalizedEmail).first();

  if (!user) {
    return { ok: false, error: "No account found for that email." };
  }

  const isMatch = await compare(pin, user.pinHash);

  if (!isMatch) {
    return { 
      ok: false, 
      error: isRoastMode(user) 
        ? "Bruh. You forgot your own PIN?" 
        : "Wrong PIN. Try again." 
    };
  }

  return { ok: true, user };
}

