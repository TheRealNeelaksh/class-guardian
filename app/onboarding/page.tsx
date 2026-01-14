import Link from 'next/link';
import { ArrowRight, CalendarDays, Upload, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { hasTimetable } from '@/app/actions/checkTimetable';

export default async function OnboardingPage() {
  // 1. Auth Check (Double safety, Middleware should catch this)
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    redirect('/login');
  }

  // 2. Timetable Existence Check
  const exists = await hasTimetable(userId);

  if (exists) {
    // Case 1: Timetable exists -> Redirect to Calendar View
    redirect('/planner');
  }

  // Case 2: No timetable exists -> Show Entry Screen
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-2xl text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Hero Content */}
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-lg transform rotate-3">
            <CalendarDays className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Let&apos;s set up your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
              Smart Timetable
            </span>
          </h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
            No more confusing spreadsheets. <br />
            Create a beautiful, interactive schedule in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 w-full px-4 max-w-md mx-auto">

          {/* Primary Action: Create Manually */}
          <Link
            href="/onboarding/create"
            className="group p-6 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border border-transparent shadow-lg hover:opacity-90 transition-all text-left relative overflow-hidden ring-1 ring-white/20"
          >
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-neutral-900/10 flex items-center justify-center shrink-0">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Create Manually</h3>
                <p className="text-sm opacity-80 mt-1">Add classes block by block. <br />Perfect for custom schedules.</p>
              </div>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
              <ArrowRight className="w-5 h-5" />
            </div>
          </Link>

          {/* Secondary Action: Import from CSV (Disabled style) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-left relative overflow-hidden opacity-75 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-neutral-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-700 dark:text-neutral-300">Import from CSV</h3>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                  Pause for Upgrades
                </span>
              </div>
            </div>
            <div className="mt-4 text-xs text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-800/50 pt-3">
              CSV upload is currently disabled in favor of manual creation correctness.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
