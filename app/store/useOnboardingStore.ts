import { create } from 'zustand';

// Raw CSV Row Type
export interface CSVRow {
    day: string;
    type: 'THEORY' | 'LAB' | 'FREE';
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    subject: string | null;
}

// Derived Atomic Slot
export interface AtomicSlot {
    start: string; // HH:mm
    end: string;   // HH:mm
    label: string; // HH:mm-HH:mm
}

interface ParsedTimetable {
    rows: CSVRow[];
    atomicSlots: AtomicSlot[];
    days: string[];
    originalSubjects: string[];
}

interface OnboardingState {
    parsedTimetable: ParsedTimetable | null;
    setParsedTimetable: (data: ParsedTimetable) => void;

    // Manual Entry Actions
    addRow: (row: CSVRow) => void;
    removeRow: (day: string, startTime: string, endTime: string) => void;
    checkOverlap: (day: string, start: string, end: string) => boolean;

    // Subject Memory
    knownSubjects: string[];
    loadSubjects: (subjects: string[]) => void;
    addKnownSubject: (subject: string) => void;

    // For step 3: renaming
    mappedSubjects: Record<string, string>;
    setMappedSubject: (raw: string, newName: string) => void;

    reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
    parsedTimetable: {
        rows: [],
        atomicSlots: [],
        days: [],
        originalSubjects: []
    },
    setParsedTimetable: (data) => set({ parsedTimetable: data }),

    addRow: (newRow) => set((state) => {
        const current = state.parsedTimetable || { rows: [], atomicSlots: [], days: [], originalSubjects: [] };
        const updatedRows = [...current.rows, newRow];

        // Re-derive atomic slots
        const boundaries = new Set<string>();
        updatedRows.forEach(r => {
            boundaries.add(r.startTime);
            boundaries.add(r.endTime);
        });
        const sortedBoundaries = Array.from(boundaries).sort();
        const atomicSlots: AtomicSlot[] = [];
        for (let i = 0; i < sortedBoundaries.length - 1; i++) {
            atomicSlots.push({ start: sortedBoundaries[i], end: sortedBoundaries[i + 1], label: `${sortedBoundaries[i]}-${sortedBoundaries[i + 1]}` });
        }

        const days = Array.from(new Set(updatedRows.map(r => r.day)));
        const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        days.sort((a, b) => validDays.indexOf(a) - validDays.indexOf(b));

        const subjects = Array.from(new Set(updatedRows.filter(r => r.subject).map(r => r.subject!)));

        return {
            parsedTimetable: {
                rows: updatedRows,
                atomicSlots,
                days,
                originalSubjects: subjects
            }
        };
    }),

    removeRow: (day, startTime, endTime) => set((state) => {
        const current = state.parsedTimetable;
        if (!current) return {};

        const updatedRows = current.rows.filter(r => !(r.day === day && r.startTime === startTime && r.endTime === endTime));

        const boundaries = new Set<string>();
        updatedRows.forEach(r => {
            boundaries.add(r.startTime);
            boundaries.add(r.endTime);
        });
        const sortedBoundaries = Array.from(boundaries).sort();
        const atomicSlots: AtomicSlot[] = [];
        for (let i = 0; i < sortedBoundaries.length - 1; i++) {
            atomicSlots.push({ start: sortedBoundaries[i], end: sortedBoundaries[i + 1], label: `${sortedBoundaries[i]}-${sortedBoundaries[i + 1]}` });
        }
        const days = Array.from(new Set(updatedRows.map(r => r.day)));
        const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        days.sort((a, b) => validDays.indexOf(a) - validDays.indexOf(b));
        const subjects = Array.from(new Set(updatedRows.filter(r => r.subject).map(r => r.subject!)));

        return {
            parsedTimetable: {
                rows: updatedRows,
                atomicSlots,
                days,
                originalSubjects: subjects
            }
        };
    }),

    checkOverlap: (day, start, end) => {
        const rows = get().parsedTimetable?.rows || [];
        return rows.some(r => {
            if (r.day !== day) return false;
            return r.startTime < end && start < r.endTime;
        });
    },

    // Subject Memory (updated in addRow)
    knownSubjects: [],
    loadSubjects: (subjects) => set({ knownSubjects: subjects }),
    addKnownSubject: (subject) => set(state => {
        if (!state.knownSubjects.includes(subject)) {
            return { knownSubjects: [...state.knownSubjects, subject] };
        }
        return {};
    }),

    mappedSubjects: {},
    setMappedSubject: (raw, newName) =>
        set((state) => ({
            mappedSubjects: { ...state.mappedSubjects, [raw]: newName }
        })),

    reset: () => set({ parsedTimetable: { rows: [], atomicSlots: [], days: [], originalSubjects: [] }, mappedSubjects: {}, knownSubjects: [] }),
}));
