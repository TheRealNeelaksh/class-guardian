export interface AttendanceStats {
    totalHeld: number;
    attended: number;
    percentage: number;
}

export interface ClassInstanceData {
    id: string;
    subjectId: string;
    status: string; // 'PRESENT' | 'ABSENT' | 'EXCUSED'
    date?: Date | string; // Optional if filtering needed
}

export function calculateSubjectStats(instances: ClassInstanceData[], subjectId: string): AttendanceStats {
    const subjectInstances = instances.filter(i => i.subjectId === subjectId);
    const totalHeld = subjectInstances.length;
    const attended = subjectInstances.filter(i => i.status === 'PRESENT' || i.status === 'EXCUSED').length;

    return {
        totalHeld,
        attended,
        percentage: totalHeld > 0 ? (attended / totalHeld) * 100 : 0
    };
}

export function calculateCumulativeStats(instances: ClassInstanceData[]): AttendanceStats {
    const totalHeld = instances.length;
    const attended = instances.filter(i => i.status === 'PRESENT' || i.status === 'EXCUSED').length;

    return {
        totalHeld,
        attended,
        percentage: totalHeld > 0 ? (attended / totalHeld) * 100 : 0
    };
}
