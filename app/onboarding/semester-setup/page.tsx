'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Calendar, Loader2, Plus, Trash2, ShieldCheck, Coffee } from 'lucide-react';
import { createSemester } from '@/app/actions/generateSemester';

export default function SemesterSetupPage() {
    const { user } = useAuthStore();
    const router = useRouter();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Exam Blocks: { id, start, end }
    const [exams, setExams] = useState<{ id: number; start: string; end: string }[]>([]);
    // Holidays: { id, start, end } (Single day holiday -> start=end)
    const [holidays, setHolidays] = useState<{ id: number; start: string; end: string }[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addExam = () => {
        setExams([...exams, { id: Date.now(), start: '', end: '' }]);
    };
    const removeExam = (id: number) => {
        setExams(exams.filter(e => e.id !== id));
    };

    const addHoliday = () => {
        setHolidays([...holidays, { id: Date.now(), start: '', end: '' }]);
    };
    const removeHoliday = (id: number) => {
        setHolidays(holidays.filter(h => h.id !== id));
    };

    const handleSubmit = async () => {
        if (!user) return;
        setError(null);

        if (!startDate || !endDate) {
            setError("Please set start and end dates.");
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            setError("Start date must be before end date.");
            return;
        }

        setIsSubmitting(true);

        const result = await createSemester({
            userId: user.id,
            startDate,
            endDate,
            exams,
            holidays
        });

        if (result.success) {
            router.push('/today');
        } else {
            setError(result.error || "Failed to create semester.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 p-6 flex flex-col items-center">
            <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Setup Semester</h1>
                    <p className="text-neutral-500 dark:text-neutral-400">
                        Define your academic calendar so we can generate your daily schedule.
                    </p>
                </div>

                {/* Main Dates */}
                <div className="bg-white dark:bg-neutral-950 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-sm">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Semester Duration
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-neutral-500">Starts</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-neutral-500">Ends</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Exam Blocks */}
                <div className="bg-white dark:bg-neutral-950 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-purple-500" />
                            Exam Weeks (No Classes)
                        </h2>
                        <button onClick={addExam} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {exams.length === 0 && <p className="text-sm text-neutral-400 italic">No exams added.</p>}

                    <div className="space-y-3">
                        {exams.map((exam) => (
                            <div key={exam.id} className="flex gap-3 items-end">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] uppercase text-neutral-400">Start</label>
                                    <input
                                        type="date"
                                        value={exam.start}
                                        onChange={(e) => setExams(exams.map(x => x.id === exam.id ? { ...x, start: e.target.value } : x))}
                                        className="w-full p-2 text-sm rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] uppercase text-neutral-400">End</label>
                                    <input
                                        type="date"
                                        value={exam.end}
                                        onChange={(e) => setExams(exams.map(x => x.id === exam.id ? { ...x, end: e.target.value } : x))}
                                        className="w-full p-2 text-sm rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                                    />
                                </div>
                                <button onClick={() => removeExam(exam.id)} className="p-2 mb-[2px] text-red-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Holidays */}
                <div className="bg-white dark:bg-neutral-950 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Coffee className="w-5 h-5 text-orange-500" />
                            Holidays
                        </h2>
                        <button onClick={addHoliday} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {holidays.length === 0 && <p className="text-sm text-neutral-400 italic">No holidays added.</p>}

                    <div className="space-y-3">
                        {holidays.map((h) => (
                            <div key={h.id} className="flex gap-3 items-end">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] uppercase text-neutral-400">Start</label>
                                    <input
                                        type="date"
                                        value={h.start}
                                        onChange={(e) => setHolidays(holidays.map(x => x.id === h.id ? { ...x, start: e.target.value } : x))}
                                        className="w-full p-2 text-sm rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] uppercase text-neutral-400">End</label>
                                    <input
                                        type="date"
                                        value={h.end}
                                        onChange={(e) => setHolidays(holidays.map(x => x.id === h.id ? { ...x, end: e.target.value } : x))}
                                        className="w-full p-2 text-sm rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                                    />
                                </div>
                                <button onClick={() => removeHoliday(h.id)} className="p-2 mb-[2px] text-red-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
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
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Generate Schedule <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
