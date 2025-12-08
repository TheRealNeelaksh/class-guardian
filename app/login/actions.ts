"use server";

import { compare } from "bcryptjs";

import { isRoastMode } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import type { UserRecord } from "@/lib/types";

export type LoginResult =
  | { ok: true; user: UserRecord }
  | { ok: false; error: string };

export async function loginAction(email: string, pin: string): Promise<LoginResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { ok: false, error: "No account found for that email." };
    }

    const isMatch = await compare(pin, user.pinHash);

    if (!isMatch) {
      return {
        ok: false,
        error: isRoastMode(user)
          ? "Bruh. You forgot your own PIN?"
          : "Wrong PIN. Try again.",
      };
    }

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        pinHash: user.pinHash,
        createdAt: user.createdAt.getTime(),
        toneMode: user.toneMode as UserRecord["toneMode"],
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return { ok: false, error: "Could not sign in. Please try again." };
  }
}
