'use server';

import { prisma } from '@/lib/prisma';

export async function getUserSubjects(userId: string) {
    if (!userId) return [];

    try {
        const subjects = await prisma.subject.findMany({
            where: {
                createdById: userId,
            },
            select: {
                name: true,
                rawAliases: true,
            }
        });

        // We return a comprehensive list of all "known" strings: 
        // 1. The canonical name (e.g. "Math")
        // 2. Any aliases (e.g. "math", "Mathematics")

        const knownSet = new Set<string>();

        subjects.forEach((s: { name: string; rawAliases: string | null }) => {
            knownSet.add(s.name);
            if (s.rawAliases) {
                try {
                    const aliases = JSON.parse(s.rawAliases);
                    if (Array.isArray(aliases)) {
                        aliases.forEach((a: string) => knownSet.add(a));
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
        });

        return Array.from(knownSet);
    } catch (e) {
        console.error("Failed to fetch user subjects:", e);
        return [];
    }
}
