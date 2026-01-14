'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Input is now raw rows, not a grid
interface ValidRow {
    day: string;
    type: 'THEORY' | 'LAB' | 'FREE';
    startTime: string;
    endTime: string;
    subject: string | null;
}

interface SaveTimetableParams {
    userId: string;
    rows: ValidRow[];
    subjectMapping: Record<string, string>;
    replace?: boolean;
}

export async function saveTimetable({
    userId,
    rows,
    subjectMapping,
    replace = false,
}: SaveTimetableParams) {
    if (!userId) {
        return { success: false, error: 'User ID is required' };
    }

    try {
        await prisma.$transaction(async (tx) => {
            if (replace) {
                // Delete existing entries for this user
                // We need to find entries linked to timeslots created by this user
                // OR just delete entries where the user is the owner of the timeslot?
                // Actually, entries don't have createdById. TimeSlots do.
                // TimetableEntry -> TimeSlot -> User

                // First delete entries
                await tx.timetableEntry.deleteMany({
                    where: {
                        timeSlot: {
                            createdById: userId
                        }
                    }
                });

                // Then delete TimeSlots
                await tx.timeSlot.deleteMany({
                    where: {
                        createdById: userId
                    }
                });

                // Subjects? We should KEEP subjects as they are the user's "vocabulary".
            }

            // 1. Create/Find Subjects
            const subjectMap = new Map<string, string>(); // NewName -> SubjectId

            for (const [raw, newName] of Object.entries(subjectMapping)) {
                let subject = await tx.subject.findFirst({
                    where: {
                        name: newName,
                        createdById: userId,
                    }
                });

                if (!subject) {
                    subject = await tx.subject.create({
                        data: {
                            name: newName,
                            rawAliases: JSON.stringify([raw]),
                            createdById: userId,
                        }
                    });
                } else {
                    // Update aliases
                    let aliases: string[] = [];
                    try {
                        aliases = JSON.parse(subject.rawAliases);
                    } catch {
                        aliases = [];
                    }
                    if (!aliases.includes(raw)) {
                        aliases.push(raw);
                        await tx.subject.update({
                            where: { id: subject.id },
                            data: { rawAliases: JSON.stringify(aliases) }
                        });
                    }
                }
                subjectMap.set(newName, subject.id);
            }

            // 2. Create TimeSlots (Deduped by label "start-end")
            // Extract unique time intervals from parsed rows
            const slotSet = new Set<string>();
            rows.forEach(r => {
                // We only care about rows that will be entries (Logic says "Create one TimetableEntry per CSV row where type !== FREE")
                // But what about TimeSlots? "Create or reuse TimeSlot records using (start_time, end_time)"
                // Should we create TimeSlots for FREE rows? Probably not necessary if no entry links to it?
                // Prompt says: "Create or reuse TimeSlot records using (start_time, end_time)"
                // And "Bind timetable and subjects to the logged-in user."
                // Let's create slots for ALL rows just in case, but usually only needed for entries.
                // Actually, if we skip FREE rows for entries, do we need the slot? 
                // Let's stick to non-FREE rows boundaries mainly, but if a FREE row defines a unique slot structure...?
                // Actually, logical slots are defined by the Class. A FREE block is just empty space.
                // So we extract unique (startTime, endTime) from NON-FREE rows.
                if (r.type !== 'FREE') {
                    slotSet.add(`${r.startTime}-${r.endTime}`);
                }
            });

            const timeSlotMap = new Map<string, string>(); // Label -> ID
            let order = 0;

            const sortedSlots = Array.from(slotSet).sort(); // Sort chronologically naturally (HH:mm is sortable)

            for (const label of sortedSlots) {
                let slot = await tx.timeSlot.findFirst({
                    where: {
                        label: label,
                        createdById: userId
                    }
                });

                if (!slot) {
                    slot = await tx.timeSlot.create({
                        data: {
                            label: label, // "HH:mm-HH:mm"
                            order: order++, // Order might be loose here if multiple days mixed, but roughly chronological
                            createdById: userId
                        }
                    });
                }
                timeSlotMap.set(label, slot.id);
            }

            // 3. Create Timetable Entries
            // "Create one TimetableEntry per CSV row where type !== FREE"
            for (const row of rows) {
                if (row.type === 'FREE') continue;
                if (!row.subject) continue; // Should be caught by validation, but safety check.

                const newName = subjectMapping[row.subject];
                if (!newName) continue;

                const label = `${row.startTime}-${row.endTime}`;
                const subjectId = subjectMap.get(newName);
                const timeSlotId = timeSlotMap.get(label);

                if (subjectId && timeSlotId) {
                    // We allow multiple entries per slot id if different days? Yes.
                    // Unique constraint? (day, timeSlotId) usually.

                    const existing = await tx.timetableEntry.findFirst({
                        where: {
                            day: row.day,
                            timeSlotId,
                        }
                    });

                    if (existing) {
                        await tx.timetableEntry.update({
                            where: { id: existing.id },
                            data: { subjectId, type: row.type }
                        });
                    } else {
                        await tx.timetableEntry.create({
                            data: {
                                day: row.day,
                                timeSlotId,
                                subjectId,
                                type: row.type
                            }
                        });
                    }
                }
            }
        });

        revalidatePath('/planner');
        return { success: true };
    } catch (error) {
        console.error("Save Timetable Error:", error);
        return { success: false, error: 'Failed to save timetable.' };
    }
}
