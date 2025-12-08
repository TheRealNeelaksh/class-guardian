"use server";

import { compare } from "bcryptjs";

import { getDb } from "@/lib/db";

import type { UserRecord } from "@/lib/db";

export type LoginResult =
  | { ok: true; user: UserRecord }
  | { ok: false; error: string };

export async function loginAction(email: string, pin: string): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();

  const user = await db.users.where("email").equals(normalizedEmail).first();

  if (!user) {
    return { ok: false, error: "No account found for that email." };
  }

  const isMatch = await compare(pin, user.pinHash);

  if (!isMatch) {
    return { ok: false, error: "Incorrect PIN." };
  }

  return { ok: true, user };
}
