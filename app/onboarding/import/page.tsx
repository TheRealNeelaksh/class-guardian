'use client';

// Reusing and updating upload logic for Strict Round-Trip Import
import { useState } from 'react';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import { useOnboardingStore, CSVRow, AtomicSlot } from '@/app/store/useOnboardingStore';
import { Upload, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ImportTimetablePage() {
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
                    setError("The CSV file is empty.");
                    return;
                }

                // 1. Strict Validation
                const requiredHeaders = ['day', 'type', 'start_time', 'end_time', 'subject'];
                const firstRow = rows[0];
                const missingHeaders = requiredHeaders.filter(h => !(h in firstRow));

                if (missingHeaders.length > 0) {
                    setError(`Invalid CSV format. Missing headers: ${missingHeaders.join(', ')}.`);
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
                    const rowNum = i + 2; // +1 for header, +1 for 0-index

                    if (!validDays.includes(day)) {
                        setError(`Row ${rowNum}: Invalid day '${day}'. Must be MON-SUN.`);
                        return;
                    }
                    if (!validTypes.includes(type)) {
                        setError(`Row ${rowNum}: Invalid type '${type}'. Must be THEORY, LAB, or FREE.`);
                        return;
                    }
                    if (start_time >= end_time) {
                        setError(`Row ${rowNum}: Start time must be strictly before end time.`);
                        return;
                    }
                    if (type === 'FREE' && subject) {
                        setError(`Row ${rowNum}: FREE blocks must not have a subject.`);
                        return;
                    }
                    if ((type === 'THEORY' || type === 'LAB') && !subject) {
                        setError(`Row ${rowNum}: ${type} blocks must have a subject.`);
                        return;
                    }

                    // Check Overlap with previously parsed rows
                    const overlap = parsedRows.find(r =>
                        r.day === day &&
                        r.startTime < end_time &&
                        start_time < r.endTime
                    );
                    if (overlap) {
                        setError(`Row ${rowNum}: Overlaps with an existing block on ${day} (${overlap.startTime}-${overlap.endTime}).`);
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
                    timeBoundaries.add(start_time);
                    timeBoundaries.add(end_time);
                }

                // 2. Timeline Derivation (For atomic slots matching store structure)
                const sortedBoundaries = Array.from(timeBoundaries).sort();
                const atomicSlots: AtomicSlot[] = [];
                for (let i = 0; i < sortedBoundaries.length - 1; i++) {
                    atomicSlots.push({
                        start: sortedBoundaries[i],
                        end: sortedBoundaries[i + 1],
                        label: `${sortedBoundaries[i]}-${sortedBoundaries[i + 1]}`
                    });
                }

                const sortedDays = Array.from(daysSet).sort((a, b) => validDays.indexOf(a) - validDays.indexOf(b));

                // Store
                setParsedTimetable({
                    rows: parsedRows,
                    atomicSlots,
                    days: sortedDays,
                    originalSubjects: Array.from(subjectsSet)
                });

                // Navigate to Preview
                router.push('/onboarding/preview');
            },
            error: (err: any) => {
                setError(`Failed to parse CSV: ${err.message}`);
            }
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
            <div className="max-w-xl w-full">
                <Link href="/onboarding" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Link>

                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Import Timetable</h1>
                    <p className="text-neutral-500 dark:text-neutral-400">
                        Upload a CSV previously exported from ClassGuard.
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
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 font-mono text-xs bg-neutral-100 dark:bg-neutral-800 p-2 rounded">day,type,start_time,end_time,subject</p>

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
                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-3 animate-in slide-in-from-bottom-2">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
