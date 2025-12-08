"use server";

import { hash } from "bcryptjs";

import { getDb, type ToneMode, type UserRecord } from "@/lib/db";

export type SignupResult =
  | { ok: true; user: UserRecord }
  | { ok: false; error: string };

export async function signupAction(email: string, pin: string, toneMode: ToneMode): Promise<SignupResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();

  const existing = await db.users.where("email").equals(normalizedEmail).first();
  if (existing) {
    return { ok: false, error: "This email is already linked to an account. Log in instead." };
  }

  const pinHash = await hash(pin, 10);
  const createdAt = Date.now();

  const id = await db.users.add({
    email: normalizedEmail,
    pinHash,
    createdAt,
    toneMode,
  });

  return {
    ok: true,
    user: { id, email: normalizedEmail, pinHash, createdAt, toneMode },
  };
}

