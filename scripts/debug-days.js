
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Days ---');

    const user = await prisma.user.findFirst();
    if (!user) return;

    const entries = await prisma.timetableEntry.findMany({
        where: { timeSlot: { createdById: user.id } },
        select: { day: true }
    });

    const distinctDays = [...new Set(entries.map(e => e.day))];
    console.log('Distinct Days in Timetable:', distinctDays);

    const instances = await prisma.classInstance.findMany({
        where: { userId: user.id },
        take: 20
    });
    console.log('First 20 Inst Dates:', instances.map(i => i.date.toISOString().split('T')[0]));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
