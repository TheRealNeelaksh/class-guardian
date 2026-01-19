import { getTodayData } from '@/app/actions/attendanceActions';
import { hasSemester } from '@/app/actions/checkSemester';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TodayClient from './TodayClient';

export default async function TodayPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('classguard-userid')?.value;

  if (userId) {
    const has = await hasSemester(userId);
    if (!has) {
      redirect('/onboarding/semester-setup');
    }
  }

  // If userId is missing, getTodayData returns safe empty structure.
  // Ideally, we redirect to login or handle it.
  // The app architecture relies on Middleware or client handling for login, 
  // but if we are here we should have ID. 
  // Passing safely.

  const data = await getTodayData(userId || '');

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <TodayClient data={data} />
    </div>
  );
}
