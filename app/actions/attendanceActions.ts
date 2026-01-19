'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type TodaySummary = {
    total: number;
    completed: number;
    remaining: number;
    attended: number;
    riskMessage?: string; // One-line risk summary
    riskLevel?: 'GOOD' | 'WARNING' | 'CRITICAL';
};

export type SubjectMeta = {
    attendancePercentage: number;
    consecutiveAbsences: number;
    safeSkips: number;
    isCritical: boolean; // True if safeSkips <= 0 (or some threshold) or already failing
    requiredClasses: number;
    totalScheduled: number;
};

export type TodayData = {
    instances: any[];
    summary: TodaySummary;
    meta: Record<string, SubjectMeta>;
    emptyReason: 'NONE' | 'HOLIDAY' | 'EXAM' | 'WEEKEND' | 'NO_CLASSES';
    emptyReasonName?: string; // "Diwali", "Mid-Sem"
};

export async function getTodayData(userId: string): Promise<TodayData> {
    if (!userId) {
        return {
            instances: [],
            summary: { total: 0, completed: 0, remaining: 0, attended: 0 },
            meta: {},
            emptyReason: 'NONE'
        };
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        // 0. Fetch Semester Info for Risk Calc
        const semester = await prisma.semester.findFirst({
            where: { userId },
            include: { holidays: true, examBlocks: true }
        });

        const minPct = semester?.minAttendancePct || 75.0;

        // 1. Fetch Today's Instances
        const instances = await prisma.classInstance.findMany({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                subject: true
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        // 2. Calculate Summary from *Today's* instances
        const summary: TodaySummary = {
            total: instances.length,
            completed: 0,
            remaining: 0,
            attended: 0
        };

        instances.forEach(i => {
            if (i.endTime < now) {
                summary.completed++;
            } else {
                summary.remaining++;
            }

            const status = i.status as string;
            if (status === 'PRESENT' || status === 'EXCUSED') {
                summary.attended++;
            }
        });

        // 3. Risk Intelligence Calculation
        const subjectIds = Array.from(new Set(instances.map(i => i.subjectId)));
        const meta: Record<string, SubjectMeta> = {};

        if (subjectIds.length > 0 && semester) {
            // We need stats across the WHOLE semester for these subjects
            const allSemesterInstances = await prisma.classInstance.findMany({
                where: {
                    userId,
                    subjectId: { in: subjectIds },
                    date: {
                        gte: semester.startDate,
                        lte: semester.endDate
                    }
                },
                select: {
                    subjectId: true,
                    status: true,
                    date: true,
                    startTime: true
                },
                orderBy: { date: 'desc' }
            });

            let criticalSubjectsCount = 0;
            let minSafeSkipsGlobally = 999;
            let lowestSafeSubject = '';

            subjectIds.forEach(subId => {
                const subInstances = allSemesterInstances.filter(i => i.subjectId === subId);

                const totalScheduled = subInstances.length;
                const attended = subInstances.filter(i => ['PRESENT', 'EXCUSED'].includes(i.status)).length;

                // Current % (Held so far)
                // heldSoFar = count of instances where startTime <= now
                // attended = count of PRESENT/EXCUSED among heldSoFar
                // Denominator for % MUST be heldSoFar.
                const heldInstances = subInstances.filter(i => i.startTime <= now);
                const heldSoFar = heldInstances.length;

                // Note: 'attended' calculated above (line 127) was based on 'subInstances' (all semester).
                // We need 'attendedSoFar' specifically for the percentage.
                const attendedSoFar = heldInstances.filter(i => ['PRESENT', 'EXCUSED'].includes(i.status)).length;

                // Clamp to 100% just in case, though logically shouldn't exceed if filtered correctly.
                // Formula: (attendedSoFar / heldSoFar) * 100
                let currentPct = 100;
                if (heldSoFar > 0) {
                    currentPct = Math.min(100, Math.round((attendedSoFar / heldSoFar) * 100));
                }

                // RISK MATH (Constraint based)
                // Use TOTAL Scheduled for this.
                // required = ceil(minPct * totalScheduled)
                // canSkip = max(0, (attendedSoFar + remaining) - required)
                // Note: (attendedSoFar + remaining) is essentially "Potential Maximum Attendance"

                const remaining = subInstances.filter(i => i.startTime > now).length;
                const required = Math.ceil(totalScheduled * (minPct / 100));

                // Potential Total = What I have now + What I can get if I attend everything left
                const potentialTotalAttended = attendedSoFar + remaining;
                const canSkip = Math.max(0, potentialTotalAttended - required);

                // Critical?
                const isCritical = canSkip <= 0;

                // Consecutive Absences (Walk back from most recent held instance)
                let consecutiveAbsences = 0;
                for (const i of heldInstances) { // heldInstances is likely desc sorted if subInstances was?
                    // subInstances was sorted desc. heldInstances filter preserves order? Usually yes.
                    // Let's ensure heldInstances is sorted desc.
                    if (i.status === 'ABSENT') consecutiveAbsences++;
                    else break;
                }

                if (isCritical) criticalSubjectsCount++;
                if (canSkip < minSafeSkipsGlobally) {
                    minSafeSkipsGlobally = canSkip;
                    lowestSafeSubject = instances.find(i => i.subjectId === subId)?.subject.name || 'Subject';
                }

                meta[subId] = {
                    attendancePercentage: currentPct,
                    consecutiveAbsences,
                    safeSkips: canSkip,
                    isCritical,
                    requiredClasses: required,
                    totalScheduled
                };
            });

            // Generate One-Liner
            // Phrasing Rules: "Maximum safe absences remaining: X" (Stricter)
            if (criticalSubjectsCount > 0) {
                summary.riskLevel = 'CRITICAL';
                summary.riskMessage = `You have no room for error in ${criticalSubjectsCount} subject${criticalSubjectsCount > 1 ? 's' : ''}.`;
            } else if (minSafeSkipsGlobally <= 2) {
                summary.riskLevel = 'WARNING';
                summary.riskMessage = `Maximum safe absences remaining: ${minSafeSkipsGlobally} (in ${lowestSafeSubject}).`;
            } else {
                summary.riskLevel = 'GOOD';
                summary.riskMessage = `Maximum safe absences remaining: ${minSafeSkipsGlobally} (in your tightest subject).`;
            }
        }

        // 4. Empty Reason & Description
        let emptyReason: TodayData['emptyReason'] = 'NONE';
        let emptyReasonName: string | undefined = undefined;

        if (instances.length === 0) {
            if (!semester) {
                emptyReason = 'NO_CLASSES';
            } else {
                const holiday = semester.holidays.find(h => now >= h.startDate && now <= h.endDate);
                const exam = semester.examBlocks.find(e => now >= e.startDate && now <= e.endDate);

                const day = now.getDay();
                const isWeekend = day === 0 || day === 6;

                if (holiday) {
                    emptyReason = 'HOLIDAY';
                    emptyReasonName = holiday.name || 'Holiday';
                } else if (exam) {
                    emptyReason = 'EXAM';
                    emptyReasonName = exam.name || 'Exam Period';
                } else if (isWeekend) {
                    emptyReason = 'WEEKEND';
                } else {
                    emptyReason = 'NO_CLASSES';
                }
            }
        }

        return { instances, summary, meta, emptyReason, emptyReasonName };

    } catch (e) {
        console.error("getTodayData failed:", e);
        return {
            instances: [],
            summary: { total: 0, completed: 0, remaining: 0, attended: 0, riskMessage: "Data unavailable", riskLevel: 'WARNING' },
            meta: {},
            emptyReason: 'NONE'
        };
    }
}

export async function markAttendance(instanceId: string, status: 'PRESENT' | 'ABSENT' | 'EXCUSED') {
    try {
        const instance = await prisma.classInstance.findUnique({
            where: { id: instanceId },
            select: { startTime: true, userId: true }
        });

        if (!instance) return { success: false, error: "Class not found" };

        const now = new Date();
        if (now < instance.startTime) {
            return { success: false, error: "Cannot mark attendance for future classes" };
        }

        await prisma.classInstance.update({
            where: { id: instanceId },
            data: {
                status,
                statusUpdatedAt: now,
                statusUpdatedBy: instance.userId
            }
        });

        revalidatePath('/today');
        return { success: true };

    } catch (e) {
        console.error("markAttendance failed:", e);
        return { success: false, error: "Failed to update attendance" };
    }
}
