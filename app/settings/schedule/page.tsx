import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma'; // Using prisma directly in server component is fine, or actions.
import { getSemesterSchedule } from '@/app/actions/scheduleActions';
import ScheduleManager from './ScheduleManager';
import { redirect } from 'next/navigation';

export default async function SchedulePage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('classguard-userid')?.value;

    if (!userId) {
        // fallback
        return <div>Please log in</div>;
    }

    const semester = await prisma.semester.findFirst({
        where: { userId },
        select: { id: true }
    });

    if (!semester) {
        redirect('/onboarding/semester-setup');
    }

    const schedule = await getSemesterSchedule(semester.id);

    return (
        <div className="h-full bg-background flex flex-col">
            <header className="flex-shrink-0 w-full border-b bg-background/95 backdrop-blur py-4 px-6">
                <h1 className="text-2xl font-semibold tracking-tight">Calendar & Schedule</h1>
                <p className="text-sm text-muted-foreground">Manage your holidays and review exam dates.</p>
            </header>

            <div className="flex-1 overflow-y-auto">
                <ScheduleManager
                    semesterId={semester.id}
                    initialHolidays={schedule.holidays}
                    initialExams={schedule.examBlocks}
                />
            </div>
        </div>
    );
}
