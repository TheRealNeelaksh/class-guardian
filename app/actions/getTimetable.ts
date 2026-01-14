'use server';

import { prisma } from '@/lib/prisma';

export interface TimetableData {
    id: string;
    day: string;
    startTime: string; // From TimeSlot
    endTime: string;   // From TimeSlot (derived or stored? TimeSlot has label/order. Wait.)
    subject: string;
    type: string; // 'THEORY' | 'LAB' (DB doesn't strictly store Type on Entry? It stores on Subject? No, Type is CSV property.)
    // Wait, DB schema:
    // TimetableEntry { day, timeSlotId, subjectId }
    // TimeSlot { label, order } -> "HH:mm-HH:mm" usually.
    // Subject { name, rawAliases }

    // We lost "Type" (THEORY/LAB) persistence if we didn't add it to Schema!
    // Let's check Schema.
}

// Check Schema first in task? No, I viewed it.
// Model Subject: id, name, rawAliases
// Model TimeSlot: id, label, order
// Model TimetableEntry: id, day, timeSlotId, subjectId

export interface TimetableData {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    subject: string;
    type: string;
}

export async function getTimetable(userId: string): Promise<TimetableData[]> {
    if (!userId) return [];

    try {
        const entries = await prisma.timetableEntry.findMany({
            where: {
                timeSlot: {
                    createdById: userId
                }
            },
            include: {
                subject: true,
                timeSlot: true
            }
        });

        const data: TimetableData[] = entries.map(entry => {
            const [start, end] = entry.timeSlot.label.split('-');
            return {
                id: entry.id,
                day: entry.day,
                startTime: start,
                endTime: end,
                subject: entry.subject.name,
                type: entry.type // Now available
            };
        });

        // Add sorting logic if needed (day, start time)
        // But UI handles rendering based on pos.
        return data;

    } catch (error) {
        console.error("Failed to fetch timetable:", error);
        return [];
    }
}
