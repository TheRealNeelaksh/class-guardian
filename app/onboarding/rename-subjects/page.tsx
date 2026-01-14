'use client';

import { useOnboardingStore } from '@/app/store/useOnboardingStore';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Type } from 'lucide-react';
import { saveTimetable } from '@/app/actions/saveTimetable';
import { hasTimetable } from '@/app/actions/checkTimetable';

export default function RenameSubjectsPage() {
    const router = useRouter();
    const { parsedTimetable, setMappedSubject, mappedSubjects } = useOnboardingStore();
    const { user } = useAuthStore();

    // Local state for the form inputs before committing to store/submission
    // Key: Raw Subject, Value: Edited Name
    const [localMapping, setLocalMapping] = useState<Record<string, string>>({});
    const [uniqueRawSubjects, setUniqueRawSubjects] = useState<string[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Title Case Helper
    const toTitleCase = (str: string) => {
        return str.replace(
            /\w\S*/g,
            text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
        );
    };

    useEffect(() => {
        if (!parsedTimetable || !parsedTimetable.rows || parsedTimetable.rows.length === 0) {
            router.replace('/onboarding/create');
            return;
        }

        // Extract unique raw subjects
        const rawSet = new Set<string>();
        parsedTimetable.rows.forEach(r => {
            if (r.subject) rawSet.add(r.subject);
        });
        const distinct = Array.from(rawSet).sort();
        setUniqueRawSubjects(distinct);

        // Initialize mapping with Title Case defaults
        const initialMap: Record<string, string> = {};
        distinct.forEach(raw => {
            initialMap[raw] = toTitleCase(raw);
        });
        setLocalMapping(initialMap);

    }, [parsedTimetable, router]);

    const handleNameChange = (raw: string, newName: string) => {
        setLocalMapping(prev => ({ ...prev, [raw]: newName }));
        setError(null);
    };

    const handleSave = async () => {
        if (!user) return;

        // Validation
        const emptySubjects = Object.values(localMapping).some(val => !val.trim());
        if (emptySubjects) {
            setError("All keys must have a name.");
            return;
        }

        setIsSaving(true);
        setError(null);

        // Check overwrite need (should have been handled in Preview, but logic flow dictates we are here implying "Save" action)
        // If user already has a timetable, we need to know if we are replacing.
        // However, this page is usually reached "before" saving. 
        // Logic: Preview -> Rename -> Save.
        // So we need to pass the `replace` flag essentially, or re-verify.
        // The safest approach: Assume if we are here, the user INTENDED to save.
        // But we still need to know if we should `replace`.
        // We can check `hasTimetable` again.

        const exists = await hasTimetable(user.id);
        // If exists, we MUST replace, because we are in the "New/Import" flow which is total replacement.
        // The user confirmed this in Preview before being redirected here?
        // Wait, if we redirect from Preview, we interrupted the "Replace" confirmation?
        // OR we redirect AS SOON AS they land on Preview?
        // Better UX: Preview -> Click "Save" -> Detect Unknowns -> Redirect Here -> Click "Finish" -> Save (with Replace implied).
        // So `replace` should be true if `exists` is true.

        try {
            const result = await saveTimetable({
                userId: user.id,
                rows: parsedTimetable!.rows,
                subjectMapping: localMapping,
                replace: exists // Auto-replace if they got this far
            });

            if (result.success) {
                router.push('/onboarding/semester-setup');
            } else {
                setError(result.error || "Failed to save.");
                setIsSaving(false);
            }
        } catch (e) {
            setError("An unexpected error occurred.");
            setIsSaving(false);
        }
    };

    if (!parsedTimetable) return null;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
            <div className="max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                        <Type className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Clean Up Subject Names</h1>
                    <p className="text-neutral-500 dark:text-neutral-400">
                        We found some new subjects. Rename them to keep your timetable clean.
                    </p>
                </div>

                <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="max-h-[50vh] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                        {uniqueRawSubjects.map(raw => (
                            <div key={raw} className="p-4 flex items-center gap-4 group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <div className="w-1/3 text-sm text-neutral-500 dark:text-neutral-400 font-mono truncate" title={raw}>
                                    {raw}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={localMapping[raw] || ''}
                                        onChange={(e) => handleNameChange(raw, e.target.value)}
                                        className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 p-0 text-sm font-semibold transition-colors placeholder:text-neutral-300"
                                        placeholder="Subject Name"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="text-sm text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Save Timetable <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>

            </div>
        </div>
    );
}
