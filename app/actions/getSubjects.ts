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
            },
            distinct: ['name']
        });

        return subjects.map(s => s.name);
    } catch (error) {
        console.error("Failed to fetch subjects:", error);
        return [];
    }
}
