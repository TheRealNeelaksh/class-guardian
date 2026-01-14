'use client';

import { useOnboardingStore, CSVRow } from '@/app/store/useOnboardingStore';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Loader2, Calendar } from 'lucide-react';
import { saveTimetable } from '@/app/actions/saveTimetable';
import { hasTimetable } from '@/app/actions/checkTimetable';

// CSS Color Map for subjects/types
const TYPE_COLORS = {
    THEORY: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    LAB: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    FREE: 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800',
};

// Dimensions
const MIN_START = 8 * 60; // 08:00
const MAX_END = 20 * 60; // 20:00 (Can be dynamic)
const TOTAL_MINUTES = MAX_END - MIN_START;

function timeToMin(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

export default function PreviewTimetablePage() {
    const router = useRouter();
    const { parsedTimetable } = useOnboardingStore();
    const { user } = useAuthStore();

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!parsedTimetable || !parsedTimetable.rows || parsedTimetable.rows.length === 0) {
            router.replace('/onboarding/create');
        }
    }, [parsedTimetable, router]);

    if (!parsedTimetable || !parsedTimetable.rows) return null;

    const { rows } = parsedTimetable;
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    // Determine dynamic range
    let actualMin = MIN_START;
    let actualMax = MAX_END;

    if (rows.length > 0) {
        const starts = rows.map(r => timeToMin(r.startTime));
        const ends = rows.map(r => timeToMin(r.endTime));
        actualMin = Math.min(MIN_START, Math.min(...starts));
        actualMax = Math.max(MAX_END, Math.max(...ends));
    }

    // Round to hours
    const displayMin = Math.floor(actualMin / 60) * 60;
    const displayMax = Math.ceil(actualMax / 60) * 60;
    const totalDisplayMin = displayMax - displayMin;

    const [showConfirmReplace, setShowConfirmReplace] = useState(false);
    const [pendingReplace, setPendingReplace] = useState(false); // Track if user agreed to replace, for the rename redirect flow

    // Use a ref to store if we checked subjects to avoid double-fetching if not needed? 
    // Actually, simple flow: 
    // 1. User Clicks "Save & Finish"
    // 2. Check if Timetable Exists
    //    YES -> Show "Confirm Replace" Modal -> User Clicks "Replace" -> Go to Step 3
    //    NO -> Go to Step 3
    // 3. Check for Unknown Subjects
    //    YES -> Redirect to /rename-subjects
    //    NO -> Execute Save Immediately

    const handleInitialSave = async () => {
        if (!user) return;
        setIsSaving(true);
        // Check if user has existing timetable
        const exists = await hasTimetable(user.id);
        if (exists) {
            setShowConfirmReplace(true);
            setIsSaving(false);
        } else {
            // No existing timetable, proceed to check subjects directly
            checkSubjectsAndSave(false);
        }
    };

    const handleConfirmReplace = () => {
        setShowConfirmReplace(false);
        checkSubjectsAndSave(true);
    };

    const checkSubjectsAndSave = async (replace: boolean) => {
        setIsSaving(true);
        try {
            // Import dynamically to avoid top-level server action issues in client components if any
            const { getUserSubjects } = await import('@/app/actions/getUserSubjects');
            const existingSubjects = await getUserSubjects(user!.id);

            // Extract CSV subjects
            const csvSubjects = new Set(rows.map(r => r.subject).filter(s => s)); // Filter nulls

            // Find unknowns (Case-sensitive check? Logic says "Raw subject labels are candidates")
            // We compare exact strings.
            const unknowns: string[] = [];
            csvSubjects.forEach(s => {
                if (s && !existingSubjects.includes(s)) {
                    unknowns.push(s);
                }
            });

            if (unknowns.length > 0) {
                // Must Rename
                router.push('/onboarding/rename-subjects');
                // Note: The rename page needs to know if "replace" was intended. 
                // Currently rename page re-checks `hasTimetable` and assumes replace if exists.
                // This is safe because if we are here, we are saving a new timetable.
            } else {
                // All known, save directly
                executeSave(replace);
            }

        } catch (e) {
            console.error(e);
            setError("Failed to validate subjects.");
            setIsSaving(false);
        }
    };

    // Logic extracted to separate function
    const executeSave = async (replace: boolean) => {
        if (!user) return;
        setIsSaving(true);
        setError(null);

        // Identity mapping for manual subjects
        const subjectMapping: Record<string, string> = {};
        rows.forEach(r => {
            if (r.subject) {
                subjectMapping[r.subject] = r.subject;
            }
        });

        try {
            const result = await saveTimetable({
                userId: user.id,
                rows: rows,
                subjectMapping,
                replace
            });

            if (result.success) {
                router.push('/onboarding/semester-setup');
            } else {
                setError(result.error || "Failed to save.");
            }
        } catch (e) {
            setError("An unexpected error occurred.");
        } finally {
            setIsSaving(false);
            setShowConfirmReplace(false);
        }
    };

    // Original handleSave is deprecated in favor of executeSave/handleInitialSave flow
    // Removing old handleSave...

    /* 
    const handleSave = async () => { ... } // REMOVED
    */

    return (
        <div className="min-h-screen flex flex-col items-center bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 overflow-hidden relative">

            {/* Confirmation Modal */}
            {showConfirmReplace && (
                <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-xl max-w-sm w-full border border-neutral-200 dark:border-neutral-800 space-y-4">
                        <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Replace Existing Timetable?</h3>
                        <p className="text-neutral-600 dark:text-neutral-400">
                            You already have a saved timetable. Importing/Saving this new one will <strong>permanently replace</strong> your existing schedule.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowConfirmReplace(false)}
                                className="flex-1 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmReplace}
                                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                            >
                                Replace
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="w-full flex justify-between items-center p-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Preview Schedule</h1>
                        <p className="text-xs text-neutral-500">Google Calendar View</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => router.back()}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Edit
                    </button>
                    <button
                        onClick={handleInitialSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save & Finish
                    </button>
                </div>
            </div>

            {error && (
                <div className="w-full bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-center py-2 text-sm">
                    {error}
                </div>
            )}

            {/* Calendar Grid */}
            <div className="flex-1 w-full overflow-y-auto p-4 sm:p-8">
                <div className="max-w-7xl mx-auto bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden flex relative min-h-[600px]">

                    {/* Time Axis */}
                    <div className="w-16 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                        {/* Header Spacer */}
                        <div className="h-10 border-b border-neutral-200 dark:border-neutral-800"></div>
                        <div className="relative" style={{ height: `${(totalDisplayMin / 60) * 60}px` }}>
                            {/* One hour = 60px height approx */}
                            {Array.from({ length: (displayMax - displayMin) / 60 + 1 }).map((_, i) => {
                                const time = displayMin + i * 60;
                                const h = Math.floor(time / 60);
                                const label = `${h.toString().padStart(2, '0')}:00`;
                                if (i === (displayMax - displayMin) / 60) return null; // Skip last label if needed

                                return (
                                    <div key={i} className="absolute w-full text-center text-xs text-neutral-400 font-mono -translate-y-2" style={{ top: `${i * 60}px` }}> {/* 60px per hour */}
                                        {label}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Days Columns */}
                    <div className="flex-1 flex overflow-x-auto">
                        {days.map((day) => {
                            const dayRows = rows.filter(r => r.day === day);

                            return (
                                <div key={day} className="flex-1 min-w-[120px] border-r border-neutral-100 dark:border-neutral-800/50 last:border-r-0 relative">
                                    {/* Day Header */}
                                    <div className="h-10 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 sticky top-0 z-10">
                                        <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{day}</span>
                                    </div>

                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 top-10 pointer-events-none">
                                        {Array.from({ length: (displayMax - displayMin) / 60 }).map((_, i) => (
                                            <div key={i} className="h-[60px] border-b border-neutral-100 dark:border-neutral-800/30 w-full"></div>
                                        ))}
                                    </div>

                                    {/* Blocks */}
                                    <div className="relative" style={{ height: `${(totalDisplayMin / 60) * 60}px` }}>
                                        {dayRows.map((row, idx) => {
                                            const startMin = timeToMin(row.startTime);
                                            const endMin = timeToMin(row.endTime);

                                            const top = ((startMin - displayMin) / 60) * 60; // 60px per hour
                                            const height = ((endMin - startMin) / 60) * 60;

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`absolute inset-x-1 rounded-md border p-1 sm:p-2 text-xs overflow-hidden flex flex-col transition-all hover:z-20 hover:shadow-md
                                                ${TYPE_COLORS[row.type]}
                                            `}
                                                    style={{
                                                        top: `${top}px`,
                                                        height: `${height}px`
                                                    }}
                                                    title={`${row.startTime} - ${row.endTime} | ${row.subject || 'Free'}`}
                                                >
                                                    <div className="font-semibold truncate">
                                                        {row.subject || 'Free Block'}
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
            </div>
        </div>
    );
}
