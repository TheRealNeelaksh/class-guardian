
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Semester Dates ---');
    const user = await prisma.user.findFirst();
    if (!user) return;

    const semester = await prisma.semester.findFirst({
        where: { userId: user.id }
    });

    if (semester) {
        console.log(`Semester Found:`);
        console.log(`  Start: ${semester.startDate.toISOString()}`);
        console.log(`  End:   ${semester.endDate.toISOString()}`);
    } else {
        console.log('No Semester Found');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
