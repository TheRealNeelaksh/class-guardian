'use server';

import { prisma } from '@/lib/prisma';

export async function hasSemester(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
        const count = await prisma.semester.count({
            where: {
                userId,
            },
        });

        return count > 0;
    } catch (error) {
        console.error("Failed to check semester existence:", error);
        return false;
    }
}
