'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import { useOnboardingStore, CSVRow, AtomicSlot } from '@/app/store/useOnboardingStore';
import { Upload, AlertCircle } from 'lucide-react';

export default function UploadTimetablePage() {
    const router = useRouter();
    const setParsedTimetable = useOnboardingStore((state) => state.setParsedTimetable);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileUpload = (file: File) => {
        setError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as any[];

                if (!rows || rows.length === 0) {
                    setError("The CSV file seems empty.");
                    return;
                }

                // 1. Validation
                const requiredHeaders = ['day', 'type', 'start_time', 'end_time', 'subject'];
                const firstRow = rows[0];
                const missingHeaders = requiredHeaders.filter(h => !(h in firstRow));

                if (missingHeaders.length > 0) {
                    setError(`Missing required headers: ${missingHeaders.join(', ')}`);
                    return;
                }

                const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
                const validTypes = ['THEORY', 'LAB', 'FREE'];

                const parsedRows: CSVRow[] = [];
                const subjectsSet = new Set<string>();
                const daysSet = new Set<string>();
                const timeBoundaries = new Set<string>();

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const { day, type, start_time, end_time, subject } = row;

                    // Row validation
                    if (!validDays.includes(day)) {
                        setError(`Row ${i + 2}: Invalid day '${day}'. Must be one of ${validDays.join(', ')}.`);
                        return;
                    }
                    if (!validTypes.includes(type)) {
                        setError(`Row ${i + 2}: Invalid type '${type}'. Must be one of ${validTypes.join(', ')}.`);
                        return;
                    }
                    if (start_time >= end_time) {
                        setError(`Row ${i + 2}: Start time must be before end time.`);
                        return;
                    }
                    if (type === 'FREE' && subject) {
                        setError(`Row ${i + 2}: FREE rows must not have a subject.`);
                        return;
                    }
                    if ((type === 'THEORY' || type === 'LAB') && !subject) {
                        setError(`Row ${i + 2}: Theory/Lab rows must have a subject.`);
                        return;
                    }

                    // Collect Data
                    parsedRows.push({
                        day,
                        type: type as 'THEORY' | 'LAB' | 'FREE',
                        startTime: start_time,
                        endTime: end_time,
                        subject: subject || null
                    });

                    daysSet.add(day);
                    if (type !== 'FREE' && subject) {
                        subjectsSet.add(subject);
                    }

                    // Collect boundaries Globally
                    timeBoundaries.add(start_time);
                    timeBoundaries.add(end_time);
                }

                // 2. Timeline Derivation Algorithm
                // Sort and dedupe boundaries
                const sortedBoundaries = Array.from(timeBoundaries).sort();

                const atomicSlots: AtomicSlot[] = [];

                for (let i = 0; i < sortedBoundaries.length - 1; i++) {
                    const start = sortedBoundaries[i];
                    const end = sortedBoundaries[i + 1];
                    atomicSlots.push({
                        start,
                        end,
                        label: `${start}-${end}`
                    });
                }

                // Sort days
                const sortedDays = Array.from(daysSet).sort((a, b) => {
                    return validDays.indexOf(a) - validDays.indexOf(b);
                });

                // Store
                setParsedTimetable({
                    rows: parsedRows,
                    atomicSlots,
                    days: sortedDays,
                    originalSubjects: Array.from(subjectsSet)
                });

                router.push('/onboarding/preview');
            },
            error: (err: any) => {
                setError(`Failed to parse CSV: ${err.message}`);
            }
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
            <div className="max-w-xl w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Upload Your Timetable</h1>
                    <p className="text-neutral-500 dark:text-neutral-400">
                        Upload your class schedule CSV to get started.
                    </p>
                </div>

                <div
                    className={`
                border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors
                ${isDragging
                            ? 'border-neutral-900 bg-neutral-100 dark:border-neutral-100 dark:bg-neutral-800'
                            : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'}
            `}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files[0];
                        if (file && file.type === 'text/csv') {
                            handleFileUpload(file);
                        } else {
                            setError("Please upload a CSV file.");
                        }
                    }}
                >
                    <div className="bg-neutral-200 dark:bg-neutral-800 p-4 rounded-full mb-4">
                        <Upload className="w-8 h-8 text-neutral-600 dark:text-neutral-300" />
                    </div>
                    <p className="text-lg font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">CSV files only. <br />Format: day,type,start_time,end_time,subject</p>

                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                        }}
                    />
                    <label
                        htmlFor="file-upload"
                        className="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        Select File
                    </label>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-mono whitespace-pre-wrap text-left">{error}</p>
                    </div>
                )}

            </div>
        </div>
    );
}
