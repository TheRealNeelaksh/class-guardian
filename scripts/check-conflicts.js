
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Holidays & Exams ---');
    const user = await prisma.user.findFirst();
    if (!user) return;

    const semester = await prisma.semester.findFirst({
        where: { userId: user.id },
        include: { examBlocks: true, holidays: true }
    });

    if (semester) {
        console.log('Exam Blocks:');
        semester.examBlocks.forEach(e =>
            console.log(`  ${e.startDate.toISOString()} -> ${e.endDate.toISOString()}`)
        );

        console.log('Holidays:');
        semester.holidays.forEach(h =>
            console.log(`  ${h.startDate.toISOString()} -> ${h.endDate.toISOString()}`)
        );

        const today = new Date('2026-01-14T12:00:00Z'); // Roughly mid-day
        const isExam = semester.examBlocks.some(e => today >= e.startDate && today <= e.endDate);
        const isHoliday = semester.holidays.some(h => today >= h.startDate && today <= h.endDate);

        console.log(`Is Jan 14 Conflicted? Exam: ${isExam}, Holiday: ${isHoliday}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
