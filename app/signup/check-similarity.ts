"use server";

import { prisma } from "@/lib/prisma";
import { similarityScore } from "@/lib/levenshtein";

export type SimilarityCheckResult =
  | { hasSimilar: true; similarEmail: string }
  | { hasSimilar: false };

export async function checkSimilarityAction(email: string): Promise<SimilarityCheckResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const users = await prisma.user.findMany({
      select: { email: true },
    });

    const similar = users.find((user) => similarityScore(normalizedEmail, user.email) > 75);

    if (similar) {
      return { hasSimilar: true, similarEmail: similar.email };
    }

    return { hasSimilar: false };
  } catch (error) {
    console.error("Similarity check error:", error);
    return { hasSimilar: false };
  }
}



