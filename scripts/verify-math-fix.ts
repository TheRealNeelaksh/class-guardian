
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Math Logic Verification...");

    const semesterMinPct = 75.0;

    // 1. Setup User & Semester
    const email = `math-test-${Date.now()}@test.com`;
    const user = await prisma.user.create({
        data: { email, pinHash: '1234', toneMode: 'Standard' }
    });

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 10);
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 10);

    const semester = await prisma.semester.create({
        data: {
            userId: user.id,
            startDate,
            endDate,
            minAttendancePct: semesterMinPct
        }
    });

    const subject = await prisma.subject.create({
        data: { name: 'Math Logic 101', createdById: user.id, rawAliases: '[]' }
    });

    // 2. Data Scenario
    // Total Scheduled: 20
    // Required: Ceil(20 * 0.75) = 15.
    // Held So Far: 5.
    // Attended: 3.
    // Remaining: 15.

    // EXPECTED OUTPUTS:
    // Attendance % = (3 / 5) * 100 = 60%. (NOT (3/15) or (3/20)).
    // Safe Skips:
    //   Potential Attended = 3 (attended) + 15 (remaining) = 18.
    //   Required = 15.
    //   Safe Skips = 18 - 15 = 3.

    const instances = [];

    // Create 5 PAST instances (Held)
    for (let i = 0; i < 5; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        d.setHours(10, 0, 0, 0);
        instances.push({
            userId: user.id, subjectId: subject.id, date: d, startTime: d, endTime: new Date(d.getTime() + 3600000),
            status: i < 3 ? 'PRESENT' : 'ABSENT' // 3 Present, 2 Absent
        });
    }

    // Create 15 FUTURE instances (Remaining)
    for (let i = 0; i < 15; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + 1 + i); // Start tomorrow
        d.setHours(10, 0, 0, 0);
        instances.push({
            userId: user.id, subjectId: subject.id, date: d, startTime: d, endTime: new Date(d.getTime() + 3600000),
            status: 'PRESENT' // Future defaults to present usually
        });
    }

    await prisma.classInstance.createMany({ data: instances });

    console.log("-> Data Setup Complete. Running checks...");

    // Replicating Logic from attendanceActions.ts
    const allSemesterInstances = await prisma.classInstance.findMany({
        where: { userId: user.id, subjectId: subject.id },
        orderBy: { date: 'desc' }
    });

    // A. Pct Check
    const heldInstances = allSemesterInstances.filter(i => i.startTime <= now);
    const heldSoFar = heldInstances.length; // Should be 5
    const attendedSoFar = heldInstances.filter(i => ['PRESENT', 'EXCUSED'].includes(i.status)).length; // Should be 3

    let currentPct = 100;
    if (heldSoFar > 0) {
        currentPct = Math.min(100, Math.round((attendedSoFar / heldSoFar) * 100));
    }

    console.log(`Held: ${heldSoFar}. Attended: ${attendedSoFar}. Pct: ${currentPct}%`);
    if (currentPct === 60) console.log("✅ Percentage Logic Correct (60%)");
    else console.error(`❌ Percentage Logic Failed. Got ${currentPct}%, Expected 60%.`);

    // B. Risk Check
    const totalScheduled = allSemesterInstances.length; // 20
    const remaining = allSemesterInstances.filter(i => i.startTime > now).length; // 15
    const required = Math.ceil(totalScheduled * (semesterMinPct / 100)); // 15

    const potentialTotal = attendedSoFar + remaining; // 3 + 15 = 18
    const safeSkips = Math.max(0, potentialTotal - required); // 18 - 15 = 3

    console.log(`Total: ${totalScheduled}. Required: ${required}. Potential: ${potentialTotal}. Safe Skips: ${safeSkips}.`);
    if (safeSkips === 3) console.log("✅ Safe Skips Logic Correct (3)");
    else console.error(`❌ Safe Skips Logic Failed. Got ${safeSkips}, Expected 3.`);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
    console.log("Cleanup done.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
