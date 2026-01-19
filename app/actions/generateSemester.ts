'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface GenerateSemesterParams {
    userId: string;
    startDate: string; // ISO Date String
    endDate: string;   // ISO Date String
    exams: { start: string; end: string }[];
    holidays: { start: string; end: string }[];
}

export async function createSemester({
    userId,
    startDate,
    endDate,
    exams,
    holidays
}: GenerateSemesterParams) {
    if (!userId) return { success: false, error: 'User required' };

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
        return { success: false, error: 'Start date must be before end date.' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Create Semester Record
            const semester = await tx.semester.create({
                data: {
                    userId,
                    startDate: start,
                    endDate: end,
                    examBlocks: {
                        create: exams.map(e => ({
                            startDate: new Date(e.start),
                            endDate: new Date(e.end)
                        }))
                    },
                    holidays: {
                        create: holidays.map(h => ({
                            startDate: new Date(h.start),
                            endDate: new Date(h.end)
                        }))
                    }
                },
                include: {
                    examBlocks: true,
                    holidays: true
                }
            });

            // 2. Fetch User's Timetable
            // We need entries AND their timeslots to know the time
            const entries = await tx.timetableEntry.findMany({
                where: {
                    timeSlot: { createdById: userId }
                },
                include: {
                    timeSlot: true,
                    subject: true // To double check subject exists? Not strictly needed for ID but good for debugging
                }
            });

            if (entries.length === 0) {
                // No timetable, but semester created. 
                // Maybe user wants to add classes later? 
                // But prompt says "On submit: Save semester data -> Generate class instances".
                // We should proceed.
            }

            // 3. Generate Class Instances
            const instancesToCreate = [];
            const dayMap = {
                'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6
            };

            // Iterate through every day of the semester
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                // Check if date is inside any Exam Block or Holiday
                const currentDate = new Date(d);

                const isExam = semester.examBlocks.some(e => currentDate >= e.startDate && currentDate <= e.endDate);
                const isHoliday = semester.holidays.some(h => currentDate >= h.startDate && currentDate <= h.endDate);

                if (isExam || isHoliday) continue;

                const dayOfWeek = currentDate.getDay(); // 0-6

                // Find timetable entries for this day of week
                const dailyEntries = entries.filter(e => {
                    // entries.day is 'MON', 'TUE' etc.
                    return dayMap[e.day as keyof typeof dayMap] === dayOfWeek;
                });

                const dailyInstancesRaw: {
                    subjectId: string,
                    start: Date,
                    end: Date,
                    date: Date
                }[] = [];

                for (const entry of dailyEntries) {
                    // Parse Time (HH:mm)
                    const [startH, startM] = entry.timeSlot.label.split('-')[0].split(':').map(Number);
                    const [endH, endM] = entry.timeSlot.label.split('-')[1].split(':').map(Number);

                    // Create Date objects for Start/End Time on this specific date
                    const instanceStart = new Date(currentDate);
                    instanceStart.setHours(startH, startM, 0, 0);

                    const instanceEnd = new Date(currentDate);
                    instanceEnd.setHours(endH, endM, 0, 0);

                    dailyInstancesRaw.push({
                        subjectId: entry.subjectId,
                        start: instanceStart,
                        end: instanceEnd,
                        date: new Date(currentDate)
                    });
                }

                // Sort by start time
                dailyInstancesRaw.sort((a, b) => a.start.getTime() - b.start.getTime());

                // Merge Logic: If Subject matches and Start == Previous End, Merge.
                const mergedInstances: typeof dailyInstancesRaw = [];

                dailyInstancesRaw.forEach(inst => {
                    const last = mergedInstances[mergedInstances.length - 1];
                    if (last && last.subjectId === inst.subjectId && last.end.getTime() === inst.start.getTime()) {
                        // Merge extension
                        last.end = inst.end;
                    } else {
                        mergedInstances.push(inst);
                    }
                });

                // Add to main list
                mergedInstances.forEach(m => {
                    instancesToCreate.push({
                        userId,
                        subjectId: m.subjectId,
                        date: m.date,
                        startTime: m.start,
                        endTime: m.end,
                        status: 'PRESENT'
                    });
                });
            }

            // Batch Insert
            if (instancesToCreate.length > 0) {
                await tx.classInstance.createMany({
                    data: instancesToCreate
                });
            }
        });

        revalidatePath('/today');
        return { success: true };

    } catch (e) {
        console.error("Semester Generation Error:", e);
        return { success: false, error: 'Failed to create semester.' };
    }
}
