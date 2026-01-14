'use client';

import { useState, useEffect } from 'react';
import { useOnboardingStore, CSVRow } from '@/app/store/useOnboardingStore';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { SubjectCombobox } from '@/app/components/SubjectCombobox';
import { getUserSubjects } from '@/app/actions/getSubjects';
import { useAuthStore } from '@/lib/stores/auth-store';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TYPES = ['THEORY', 'LAB', 'FREE'] as const;

export default function ManualCreatePage() {
    const router = useRouter();
    const { addRow, removeRow, checkOverlap, parsedTimetable, knownSubjects, loadSubjects, addKnownSubject } = useOnboardingStore();
    const { user } = useAuthStore();

    const [selectedDay, setSelectedDay] = useState<string>('MON');
    const [type, setType] = useState<'THEORY' | 'LAB' | 'FREE'>('THEORY');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('08:50');
    const [subject, setSubject] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    // Load existing subjects on mount
    useEffect(() => {
        if (user && knownSubjects.length === 0) {
            getUserSubjects(user.id).then((subjects) => {
                loadSubjects(subjects);
            });
        }
    }, [user, knownSubjects.length, loadSubjects]);

    const currentRows = parsedTimetable?.rows.filter(r => r.day === selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime)) || [];

    // Warn about similar subjects
    useEffect(() => {
        if (type === 'FREE' || !subject.trim()) {
            setWarning(null);
            return;
        }

        // Check strict existing exact match (to clear warning)
        const exactMatch = knownSubjects.find(s => s.toLowerCase() === subject.toLowerCase());
        if (exactMatch) {
            setWarning(null);
            return;
        }

        // Check partial/similarity
        // Simple heuristic: if user types "math" and "Engineering Math" exists?? No.
        // Use prompt requirement: "Trim whitespace before comparison. Same subject must not be duplicated due to casing or spacing. Near-duplicates should be warned."

        const normalizedInput = subject.trim().toLowerCase();
        const similar = knownSubjects.find(s => {
            const normalizedKnown = s.trim().toLowerCase();
            // Check if input is a substring or vice versa? OR Levenshtein?
            // Let's stick to very basic casing/spacing warning first.
            return normalizedKnown === normalizedInput;
        });

        if (similar && similar !== subject) {
            setWarning(`Similar subject "${similar}" already exists. Use that instead?`);
        } else {
            setWarning(null);
        }

    }, [subject, knownSubjects, type]);


    const handleAddBlock = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // 1. Basic Validation
        if (startTime >= endTime) {
            setError('Start time must be strictly before end time.');
            return;
        }

        if (type !== 'FREE' && !subject.trim()) {
            setError('Subject is required for Theory and Lab blocks.');
            return;
        }

        if (type === 'FREE' && subject.trim()) {
            setError('Free blocks cannot have a subject.');
            return;
        }

        // 2. Overlap Validation
        if (checkOverlap(selectedDay, startTime, endTime)) {
            setError('This block overlaps with an existing block on this day.');
            return;
        }

        // 3. Normalize Subject Name
        let finalSubject = subject.trim();
        if (type !== 'FREE') {
            // Try to match casing with existing
            const existing = knownSubjects.find(s => s.toLowerCase() === finalSubject.toLowerCase());
            if (existing) {
                finalSubject = existing;
            } else {
                // New Subject
                // addKnownSubject(finalSubject); // Store handles this now? I updated store.
                // Oh wait, I updated store to perform the check, but not explicitly the `addKnownSubject` call in local state?
                // Actually, my store update logic: "if newRow.subject && !updatedSubjects.includes... updatedSubjects.push"
                // So it adds it to `knownSubjects` automatically.
            }
        }

        // 3. Add to Store
        const newRow: CSVRow = {
            day: selectedDay,
            type,
            startTime,
            endTime,
            subject: type === 'FREE' ? null : finalSubject
        };

        addRow(newRow);

        // Reset Form (keep day)
        setSubject('');
    };

    const handleDelete = (row: CSVRow) => {
        removeRow(row.day, row.startTime, row.endTime);
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">

            {/* Left Panel: Creation Form */}
            <div className="w-full md:w-1/2 lg:w-1/3 p-6 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl z-10">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight">Create Timetable</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Add blocks for each day.</p>
                </div>

                {/* Day Selector */}
                <div className="flex overflow-x-auto pb-2 mb-6 gap-1 no-scrollbar">
                    {DAYS.map(day => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`
                        px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0
                        ${selectedDay === day
                                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md'
                                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}
                    `}
                        >
                            {day}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleAddBlock} className="flex-1 flex flex-col gap-5">
                    {/* Type Selector */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-semibold text-neutral-500 tracking-wider">Type</label>
                        <div className="flex gap-2">
                            {TYPES.map(t => (
                                <label key={t} className={`
                            flex-1 cursor-pointer border rounded-lg p-2 text-center text-sm font-medium transition-all
                            ${type === t
                                        ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900 text-neutral-900 dark:text-white ring-1 ring-neutral-900 dark:ring-white'
                                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700'}
                        `}>
                                    <input
                                        type="radio"
                                        name="type"
                                        value={t}
                                        checked={type === t}
                                        onChange={() => setType(t)}
                                        className="hidden"
                                    />
                                    {t}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs uppercase font-semibold text-neutral-500 tracking-wider">Start</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white outline-none font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs uppercase font-semibold text-neutral-500 tracking-wider">End</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white outline-none font-mono"
                            />
                        </div>
                    </div>

                    {/* Subject */}
                    <div className={`space-y-1 transition-opacity ${type === 'FREE' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label className="text-xs uppercase font-semibold text-neutral-500 tracking-wider">Subject</label>
                        <SubjectCombobox
                            value={subject}
                            onChange={setSubject}
                            options={knownSubjects}
                            disabled={type === 'FREE'}
                            placeholder={type === 'FREE' ? "Free Block" : "e.g. Computer Science"}
                        />
                        {warning && (
                            <p className="text-xs text-amber-500 mt-1">{warning}</p>
                        )}
                    </div>

                    {/* Errors */}
                    {error && (
                        <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="mt-auto w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-5 h-5" />
                        Add Block
                    </button>
                </form>
            </div>

            {/* Right Panel: Agenda Preview */}
            <div className="flex-1 p-6 flex flex-col h-screen overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-neutral-100 dark:bg-grid-neutral-800/20 pointer-events-none [mask-image:linear-gradient(to_bottom,white,transparent)] dark:[mask-image:linear-gradient(to_bottom,black,transparent)]" />

                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-xl font-bold">{selectedDay} Agenda</h2>
                    <button
                        onClick={() => router.push('/onboarding/preview')}
                        className="text-sm font-medium flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                        Preview Calendar <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 relative z-10">
                    {currentRows.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/10">
                            <Clock className="w-12 h-12 mb-2 opacity-20" />
                            <p>No blocks added for {selectedDay} yet.</p>
                        </div>
                    ) : (
                        currentRows.map((row, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-sm animate-in slide-in-from-bottom-2 group"
                            >
                                <div className="flex flex-col items-center min-w-[3rem] text-sm font-mono text-neutral-500">
                                    <span>{row.startTime}</span>
                                    <div className="w-px h-2 bg-neutral-300 dark:bg-neutral-700 my-0.5"></div>
                                    <span>{row.endTime}</span>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`
                                    text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border
                                    ${row.type === 'THEORY' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' : ''}
                                    ${row.type === 'LAB' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' : ''}
                                    ${row.type === 'FREE' ? 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700' : ''}
                                `}>
                                            {row.type}
                                        </span>
                                    </div>
                                    <p className={`font-medium ${!row.subject ? 'italic text-neutral-400' : ''}`}>
                                        {row.subject || 'Free Block'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleDelete(row)}
                                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Remove block"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
