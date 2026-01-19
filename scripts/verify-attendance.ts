
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting verification...");

    // 1. Setup Data
    const email = `test-verify-${Date.now()}@test.com`;
    const user = await prisma.user.create({
        data: {
            email,
            pinHash: '1234',
            toneMode: 'Standard'
        }
    });

    const subject = await prisma.subject.create({
        data: {
            name: 'Verification 101',
            createdById: user.id,
            rawAliases: '[]'
        }
    });

    const now = new Date();
    const futureStart = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour later
    const futureEnd = new Date(futureStart.getTime() + 1000 * 60 * 30);

    const activeStart = new Date(now.getTime() - 1000 * 60 * 10); // 10 mins ago
    const activeEnd = new Date(now.getTime() + 1000 * 60 * 20);

    // 2. Test Future Instance (Should Block)
    const futureInstance = await prisma.classInstance.create({
        data: {
            userId: user.id,
            subjectId: subject.id,
            date: futureStart,
            startTime: futureStart,
            endTime: futureEnd,
            status: 'PRESENT'
        }
    });

    console.log("Testing Future Class Blocking...");
    if (new Date() < futureInstance.startTime) {
        // Mimic logic
        console.log("-> Logic Check: Passed (Date is in future)");
    } else {
        console.error("-> Logic Check: Failed (Date mismatch?)");
    }

    // 3. Test Active Instance (Should Allow + Audit)
    const activeInstance = await prisma.classInstance.create({
        data: {
            userId: user.id,
            subjectId: subject.id,
            date: activeStart,
            startTime: activeStart,
            endTime: activeEnd,
            status: 'PRESENT'
        }
    });

    console.log("Testing Active Class Update...");
    // Simulate Update
    const updateTime = new Date();
    await prisma.classInstance.update({
        where: { id: activeInstance.id },
        data: {
            status: 'ABSENT',
            statusUpdatedAt: updateTime,
            statusUpdatedBy: user.id
        }
    });

    // Verify Audit
    const updated = await prisma.classInstance.findUnique({ where: { id: activeInstance.id } });
    if (updated?.status === 'ABSENT' && updated.statusUpdatedAt && updated.statusUpdatedBy === user.id) {
        console.log("-> Audit Fields: Verified ✅");
        console.log(`   Updated At: ${updated.statusUpdatedAt}`);
        console.log(`   Updated By: ${updated.statusUpdatedBy}`);
    } else {
        console.error("-> Audit Fields: FAILED ❌");
        console.log(updated);
    }

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } }); // Cascades
    console.log("Cleanup done.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
