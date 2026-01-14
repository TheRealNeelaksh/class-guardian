'use server';

import { prisma } from '@/lib/prisma';

export async function hasTimetable(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
        // Check if user has any time slots created
        const count = await prisma.timeSlot.count({
            where: {
                createdById: userId,
            },
        });

        return count > 0;
    } catch (error) {
        console.error("Failed to check timetable existence:", error);
        return false;
    }
}
