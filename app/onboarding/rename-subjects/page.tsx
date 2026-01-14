'use client';

import { useOnboardingStore } from '@/app/store/useOnboardingStore';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { saveTimetable } from '@/app/actions/saveTimetable';
import { ArrowRight, Loader2, BookOpen } from 'lucide-react';

export default function RenameSubjectsPage() {
    const router = useRouter();
    const { parsedTimetable, setMappedSubject, mappedSubjects } = useOnboardingStore();
    const { user } = useAuthStore();

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize mapping on mount
    useEffect(() => {
        if (!parsedTimetable) {
            router.replace('/onboarding/upload-timetable');
            return;
        }

        parsedTimetable.originalSubjects.forEach(sub => {
            if (!mappedSubjects[sub]) {
                setMappedSubject(sub, sub);
            }
        });
    }, [parsedTimetable, router, mappedSubjects, setMappedSubject]);

    if (!parsedTimetable || !user) return null;

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        // Transform rows to the expected input for saveTimetable
        // The store `rows` matches the `ValidRow` structure expected by the action
        // except for potential extra fields or types? 
        // Action expects: day, type, startTime, endTime, subject
        // Store rows: day, type, startTime, endTime, subject
        // So we can pass it directly.

        try {
            const result = await saveTimetable({
                userId: user.id,
                rows: parsedTimetable.rows, // Pass raw logical rows
                subjectMapping: mappedSubjects
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
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center p-6 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
            <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Clean Up Subjects</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                        We found these subjects in your timetable. Give them nice names.
                    </p>
                </div>

                <div className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {parsedTimetable.originalSubjects.map((raw) => (
                            <div key={raw} className="p-4 flex items-center gap-4 group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-5 h-5 text-neutral-500" />
                                </div>

                                <div className="flex-1">
                                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1 block">
                                        Import Name: {raw}
                                    </label>
                                    <input
                                        type="text"
                                        value={mappedSubjects[raw] || ''}
                                        onChange={(e) => setMappedSubject(raw, e.target.value)}
                                        className="w-full bg-transparent border-none p-0 text-lg font-medium placeholder-neutral-300 focus:ring-0 text-neutral-900 dark:text-white"
                                        placeholder="Enter subject name..."
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-neutral-50 dark:bg-neutral-900/30 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-4">
                        {error && (
                            <p className="text-sm text-red-500 text-center">{error}</p>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    Save & Continue
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
