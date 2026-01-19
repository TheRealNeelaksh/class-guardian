
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging DB State (Refined) ---');

    const user = await prisma.user.findFirst();
    if (!user) { console.log('No user'); return; }

    // 1. Check WED entries
    const wedEntries = await prisma.timetableEntry.findMany({
        where: {
            timeSlot: { createdById: user.id },
            day: 'WED'
        },
        include: { subject: true }
    });
    console.log(`Timetable Entries for WED: ${wedEntries.length}`);
    wedEntries.forEach(e => console.log(`  [WED] ${e.subject.name}`));

    // 2. Check Instances near today
    const instances = await prisma.classInstance.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
        take: 20 // Look at first 20 to see start of semester? 
        // Actually, let's look at instances around Jan 14
    });

    console.log('Sample Filtered Instances (Jan 10 - Jan 20):');
    const all = await prisma.classInstance.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' }
    });

    const rangeStart = new Date('2026-01-10T00:00:00Z');
    const rangeEnd = new Date('2026-01-20T00:00:00Z');

    const near = all.filter(i => {
        const d = new Date(i.date);
        return d >= rangeStart && d <= rangeEnd;
    });

    if (near.length === 0) {
        console.log('No instances found between Jan 10 and Jan 20.');
        console.log('First 5 instances ever:');
        all.slice(0, 5).forEach(i => console.log(`  ${i.date.toISOString()} - ${i.status}`));
    } else {
        near.forEach(i => console.log(`  ${new Date(i.date).toISOString()} - ${i.status}`));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
