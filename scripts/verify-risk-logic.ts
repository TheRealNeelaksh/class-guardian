
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Risk Intelligence Logic Verification...");

    // 1. Setup Data
    const email = `risk-test-${Date.now()}@test.com`;
    const user = await prisma.user.create({
        data: { email, pinHash: '1234', toneMode: 'Standard' }
    });

    const now = new Date();

    // Create Semester: 10 Days Long. Min Attendance 80%.
    // 10 Classes Total. 8 Required.
    // Can miss 2.
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 5); // Started 5 days ago
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 4); // Ends in 4 days

    const semester = await prisma.semester.create({
        data: {
            userId: user.id,
            startDate,
            endDate,
            minAttendancePct: 80.0
        }
    });

    const subject = await prisma.subject.create({
        data: { name: 'Risk 101', createdById: user.id, rawAliases: '[]' }
    });

    // Create 10 Instances
    // 5 Past (Held)
    // 5 Future (Remaining)

    // Scenario 1: Attended all 5 past.
    // Total: 10. Required: 8.
    // Attended: 5. Remaining: 5.
    // Potential = 5+5 = 10.
    // CanSkip = 10 - 8 = 2.
    // Status: SAFE.

    // Scenario 2: Attended 2 of 5 past. Missed 3.
    // Attended: 2. Remaining: 5.
    // Potential = 2+5 = 7.
    // Required: 8.
    // CanSkip = 7 - 8 = -1.
    // Status: CRITICAL.

    const instances = [];
    for (let i = 0; i < 10; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        date.setHours(10, 0, 0, 0);

        // Past if i < 5. Future if i >= 5.
        // Let's set first 5 as PRESENT initially.
        const status = i < 5 ? 'PRESENT' : 'PRESENT'; // Future defaults to present usually, but logic counts them as "Remaining" regardless of status

        instances.push({
            userId: user.id,
            subjectId: subject.id,
            date: date,
            startTime: date,
            endTime: new Date(date.getTime() + 3600000),
            status
        });
    }

    await prisma.classInstance.createMany({ data: instances });

    console.log("-> Data Setup Complete.");

    // CALL getTodayData Logic Simulation
    // We can't easily call the server action from here without mocking headers/next.
    // So we replicate the query logic to verify our algorithm.

    const allInstances = await prisma.classInstance.findMany({
        where: { userId: user.id, subjectId: subject.id },
        orderBy: { date: 'asc' }
    });

    // Algorithm Check
    const total = allInstances.length; // 10
    const required = Math.ceil(total * 0.8); // 8

    // Case 1: All Present
    let attended = allInstances.filter(i => i.startTime <= now && i.status === 'PRESENT').length; // 5
    let remaining = allInstances.filter(i => i.startTime > now).length; // 5

    let safeSkips = Math.max(0, (attended + remaining) - required);
    console.log(`Case 1 (5/5 Attended): Required ${required}. Attended ${attended}. Remaining ${remaining}.`);
    console.log(`-> Safe Skips: ${safeSkips} (Expected: 2)`);
    if (safeSkips === 2) console.log("✅ Case 1 Passed"); else console.error("❌ Case 1 Failed");

    // Case 2: Miss 3
    // Update 3 past instances to ABSENT
    const pastIds = allInstances.filter(i => i.startTime <= now).slice(0, 3).map(i => i.id);
    await prisma.classInstance.updateMany({
        where: { id: { in: pastIds } },
        data: { status: 'ABSENT' }
    });

    const updatedInstances = await prisma.classInstance.findMany({ where: { userId: user.id } });
    attended = updatedInstances.filter(i => i.startTime <= now && i.status === 'PRESENT').length; // 2
    remaining = updatedInstances.filter(i => i.startTime > now).length; // 5

    safeSkips = Math.max(0, (attended + remaining) - required);
    // (2+5) - 8 = 7 - 8 = -1 -> max(0, -1) = 0
    console.log(`Case 2 (2/5 Attended): Required ${required}. Attended ${attended}. Remaining ${remaining}.`);
    console.log(`-> Safe Skips: ${safeSkips} (Expected: 0 - Critical)`);

    // Verify Logic says Critical
    const potential = attended + remaining;
    if (potential < required) {
        console.log("-> CRITICAL FLAG TRUE ✅ (Already failing)");
    } else {
        console.error("-> CRITICAL FLAG FALSE ❌");
    }


    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
    console.log("Cleanup done.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
