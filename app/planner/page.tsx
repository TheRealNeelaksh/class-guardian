'use client';

import { useEffect, useState } from 'react';
import { getTimetable, TimetableData } from '@/app/actions/getTimetable';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Calendar, PenLine, Loader2, ArrowRight, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

// CSS Color Map (Duplicate of Preview for now, extract shared component later?)
const TYPE_COLORS: Record<string, string> = {
  THEORY: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  LAB: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-800',
  FREE: 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800',
};

// Dimensions
const MIN_START = 8 * 60; // 08:00
const MAX_END = 20 * 60; // 20:00 
const TOTAL_MINUTES = MAX_END - MIN_START;

function timeToMin(time: string) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export default function PlannerPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [timetable, setTimetable] = useState<TimetableData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getTimetable(user.id).then(data => {
        setTimetable(data);
        setLoading(false);
      });
    }
  }, [user]);

  const handleDownloadCSV = () => {
    if (!timetable.length) return;

    // Header
    let csvContent = "day,type,start_time,end_time,subject\n";

    // Deduplication Set for Time Ranges
    const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const processedRanges: Record<string, { start: number; end: number }[]> = {};
    validDays.forEach(d => processedRanges[d] = []);

    // Sort rows by Day -> Start Time (ASC) -> End Time (DESC)
    // This prioritizes larger blocks over smaller ones starting at the same time
    const sortedRows = [...timetable].sort((a, b) => {
      const dayDiff = validDays.indexOf(a.day) - validDays.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;

      const startDiff = a.startTime.localeCompare(b.startTime);
      if (startDiff !== 0) return startDiff;

      return b.endTime.localeCompare(a.endTime);
    });

    sortedRows.forEach(row => {
      const startMin = timeToMin(row.startTime);
      const endMin = timeToMin(row.endTime);

      // Check collision with already processed ranges for this day
      const hasOverlap = processedRanges[row.day].some(range => {
        // Standard interval intersection check: StartA < EndB && StartB < EndA
        return startMin < range.end && range.start < endMin;
      });

      if (!hasOverlap) {
        // Escape subject if contains commas
        const subject = row.subject.includes(',') ? `"${row.subject}"` : row.subject;
        csvContent += `${row.day},${row.type},${row.startTime},${row.endTime},${subject}\n`;

        // Mark this range as occupied
        processedRanges[row.day].push({ start: startMin, end: endMin });
      }
    });

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "classguard_timetable.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle initial auth load delay
  if (!user) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // Determine dynamic range
  let actualMin = MIN_START;
  let actualMax = MAX_END;

  if (timetable.length > 0) {
    const starts = timetable.map(r => timeToMin(r.startTime));
    const ends = timetable.map(r => timeToMin(r.endTime));
    actualMin = Math.min(MIN_START, Math.min(...starts));
    actualMax = Math.max(MAX_END, Math.max(...ends));
  }

  const displayMin = Math.floor(actualMin / 60) * 60;
  const displayMax = Math.ceil(actualMax / 60) * 60;
  const totalDisplayMin = displayMax - displayMin;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 overflow-hidden">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Calendar className="w-6 h-6" />
          Planner
        </h1>
        <button
          onClick={() => {
            // Force navigation to edit? Need to think about this flow.
            // For now, redirect to create, assuming verified access.
            // But if I redirect to /onboarding, it bounces back here.
            // If I redirect to /onboarding/create, it's allowed? 
            // Let's check middleware.
            // Middleware only protects `/onboarding`.
            // But `app/onboarding/page.tsx` checks logical existence.
            // `app/onboarding/create/page.tsx` DOES NOT check existence. 
            // So user CAN go to /onboarding/create directly to "Edit".
            // But the store is empty! 
            // I will leave this as a todo for full edit support, allowing just viewing for now.
            // Or simply:
            router.push('/onboarding/create');
          }}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <PenLine className="w-4 h-4" />
          Edit Timetable
        </button>
        <button
          onClick={handleDownloadCSV}
          className="ml-2 text-sm font-medium px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex items-center gap-2"
          title="Export as CSV"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center border rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : timetable.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/10 text-center p-8 space-y-4">
          <p className="text-neutral-500">You haven't set up your timetable yet.</p>
          <button
            onClick={() => router.push('/onboarding/create')} // Direct link to bypass check? No, /onboarding redirects here ONLY if exists. If it doesn't exist, /onboarding shows entry.
            // Wait, if timetable.length == 0, `hasTimetable` should be false?
            // Why was user redirected here?
            // Maybe `hasTimetable` checks TimeSlots, but here we check Entries?
            // If inconsistent, user might be stuck.
            // Safest: Redirect to /onboarding
            onClick={() => router.push('/onboarding')}
            className="text-primary font-bold hover:underline flex items-center gap-1"
          >
            Set it up now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden flex relative">
          {/* Time Axis */}
          <div className="w-16 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 overflow-hidden">
            <div className="h-10 border-b border-neutral-200 dark:border-neutral-800"></div>
            <div className="relative" style={{ height: `${(totalDisplayMin / 60) * 60}px` }}>
              {Array.from({ length: (displayMax - displayMin) / 60 + 1 }).map((_, i) => {
                const time = displayMin + i * 60;
                const h = Math.floor(time / 60);
                const label = `${h.toString().padStart(2, '0')}:00`;
                if (i === (displayMax - displayMin) / 60) return null;

                return (
                  <div key={i} className="absolute w-full text-center text-xs text-neutral-400 font-mono -translate-y-2" style={{ top: `${i * 60}px` }}>
                    {label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Days Columns */}
          <div className="flex-1 flex overflow-x-auto overflow-y-auto">
            {days.map((day) => {
              const dayRows = timetable.filter(r => r.day === day);

              return (
                <div key={day} className="flex-1 min-w-[120px] border-r border-neutral-100 dark:border-neutral-800/50 last:border-r-0 relative">
                  <div className="h-10 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 sticky top-0 z-10">
                    <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{day}</span>
                  </div>

                  <div className="absolute inset-0 top-10 pointer-events-none z-0">
                    {Array.from({ length: (displayMax - displayMin) / 60 }).map((_, i) => (
                      <div key={i} className="h-[60px] border-b border-neutral-100 dark:border-neutral-800/30 w-full"></div>
                    ))}
                  </div>

                  <div className="relative z-10" style={{ height: `${(totalDisplayMin / 60) * 60}px` }}>
                    {dayRows.map((row, idx) => {
                      const startMin = timeToMin(row.startTime);
                      const endMin = timeToMin(row.endTime);

                      const top = ((startMin - displayMin) / 60) * 60;
                      const height = ((endMin - startMin) / 60) * 60;

                      return (
                        <div
                          key={idx}
                          className={`absolute inset-x-1 rounded-md border p-1 sm:p-2 text-xs overflow-hidden flex flex-col transition-all hover:z-20 hover:shadow-md
                                                    ${TYPE_COLORS[row.type] || TYPE_COLORS['THEORY']}
                                                `}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`
                          }}
                          title={`${row.startTime} - ${row.endTime} | ${row.subject}`}
                        >
                          <div className="font-semibold truncate">
                            {row.subject}
                          </div>
                          <div className="text-[10px] opacity-80 mt-auto truncate">
                            {row.startTime} - {row.endTime}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
