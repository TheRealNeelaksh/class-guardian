"use server";

import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import type { ToneMode, UserRecord } from "@/lib/types";

export type SignupResult =
  | { ok: true; user: UserRecord }
  | { ok: false; error: string };

export async function signupAction(
  email: string,
  pin: string,
  toneMode: ToneMode,
): Promise<SignupResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return { ok: false, error: "This email is already linked to an account. Log in instead." };
    }

    const pinHash = await hash(pin, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        pinHash,
        toneMode,
      },
    });

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        pinHash: user.pinHash,
        createdAt: user.createdAt.getTime(),
        toneMode: user.toneMode as ToneMode,
      },
    };
  } catch (error) {
    console.error("Signup error:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { ok: false, error: "This email is already linked to an account. Log in instead." };
    }
    return { ok: false, error: "Could not complete signup. Please try again." };
  }
}



