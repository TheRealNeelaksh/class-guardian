'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSemesterSchedule(semesterId: string) {
    if (!semesterId) return { holidays: [], examBlocks: [] };

    try {
        const semester = await prisma.semester.findUnique({
            where: { id: semesterId },
            include: {
                holidays: { orderBy: { startDate: 'asc' } },
                examBlocks: { orderBy: { startDate: 'asc' } }
            }
        });

        if (!semester) return { holidays: [], examBlocks: [] };

        return {
            holidays: semester.holidays,
            examBlocks: semester.examBlocks
        };
    } catch (e) {
        console.error("getSemesterSchedule failed:", e);
        return { holidays: [], examBlocks: [] };
    }
}

// TODO: Refine these update functions to handle complex updates (add/remove)
// For now, simpler "add" actions or "delete" actions might be better than bulk update?
// User asked to "see and edit one or more exam blocks".

export async function addHoliday(semesterId: string, start: Date, end: Date, name?: string) {
    try {
        await prisma.holiday.create({
            data: {
                semesterId,
                startDate: start,
                endDate: end,
                name: name || undefined
            }
        });
        revalidatePath('/today'); // Today view state might change
        revalidatePath('/settings/schedule');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to add holiday' };
    }
}

export async function deleteHoliday(holidayId: string) {
    try {
        await prisma.holiday.delete({ where: { id: holidayId } });
        revalidatePath('/today');
        revalidatePath('/settings/schedule');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed' };
    }
}

export async function addExamBlock(semesterId: string, start: Date, end: Date, name?: string) {
    try {
        await prisma.examBlock.create({
            data: {
                semesterId,
                startDate: start,
                endDate: end,
                name: name || undefined
            }
        });
        revalidatePath('/today');
        revalidatePath('/settings/schedule');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to add exam block' };
    }
}

export async function deleteExamBlock(blockId: string) {
    try {
        await prisma.examBlock.delete({ where: { id: blockId } });
        revalidatePath('/today');
        revalidatePath('/settings/schedule');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed' };
    }
}
