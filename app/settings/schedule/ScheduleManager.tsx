'use client';

import React, { useState } from 'react';
import { Holiday, ExamBlock } from '@prisma/client';
import { addHoliday, deleteHoliday, addExamBlock, deleteExamBlock } from '@/app/actions/scheduleActions';
import { toast } from 'sonner';
import { CalendarIcon, Trash2, Plus } from 'lucide-react';

interface ScheduleManagerProps {
    semesterId: string;
    initialHolidays: Holiday[];
    initialExams: ExamBlock[];
}

export default function ScheduleManager({ semesterId, initialHolidays, initialExams }: ScheduleManagerProps) {
    // We can use optimistic UI or just revalidation. 
    // Given actions revalidate, we can just respect props updates (if parent was client passing props) 
    // BUT this is a client component inside a server page. 
    // Revalidation refreshes the server usage, so props update on router refresh.
    // We'll rely on router.refresh() logic implicit in action or revalidating path.
    // Actually, Server Actions `revalidatePath` works. But to see updates efficiently we might need local state.
    // Let's use local state initialized from props for immediate feedback + optimistic.

    const [holidays, setHolidays] = useState(initialHolidays);
    const [exams, setExams] = useState(initialExams);

    // Forms
    const [activeTab, setActiveTab] = useState<'holidays' | 'exams'>('holidays');

    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [newName, setNewName] = useState('');

    async function handleAdd() {
        if (!newStartDate || !newEndDate) {
            toast.error("Please select both dates");
            return;
        }

        const start = new Date(newStartDate);
        const end = new Date(newEndDate);

        if (start > end) {
            toast.error("Start date must be before end date");
            return;
        }

        const toastId = toast.loading("Adding...");

        if (activeTab === 'holidays') {
            const res = await addHoliday(semesterId, start, end, newName);
            if (res.success) {
                toast.success("Holiday added", { id: toastId });
                setNewStartDate('');
                setNewEndDate('');
                setNewName('');
                // Manually add to list for instant feedback (though ID missing)
                // Or wait for refresh. Usually router.refresh() is needed if we rely on props.
                // Let's reload page data via router.
                window.location.reload(); // Simple but effective for now. Or use router.refresh().
            } else {
                toast.error("Failed to add holiday", { id: toastId });
            }
        } else {
            const res = await addExamBlock(semesterId, start, end, newName);
            if (res.success) {
                toast.success("Exam block added", { id: toastId });
                setNewStartDate('');
                setNewEndDate('');
                setNewName('');
                window.location.reload();
            } else {
                toast.error("Failed to add exam block", { id: toastId });
            }
        }
    }

    async function handleDelete(id: string, type: 'holiday' | 'exam') {
        const toastId = toast.loading("Deleting...");
        if (type === 'holiday') {
            const res = await deleteHoliday(id);
            if (res.success) {
                toast.success("Deleted", { id: toastId });
                setHolidays(prev => prev.filter(h => h.id !== id));
            } else {
                toast.error("Failed", { id: toastId });
            }
        } else {
            const res = await deleteExamBlock(id);
            if (res.success) {
                toast.success("Deleted", { id: toastId });
                setExams(prev => prev.filter(e => e.id !== id));
            } else {
                toast.error("Failed", { id: toastId });
            }
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Tabs */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('holidays')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'holidays' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Holidays
                </button>
                <button
                    onClick={() => setActiveTab('exams')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'exams' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Exam Blocks
                </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{activeTab === 'holidays' ? 'Scheduled Holidays' : 'Exam Periods'}</h2>
                </div>

                <div className="grid gap-3">
                    {(activeTab === 'holidays' ? holidays : exams).length === 0 && (
                        <div className="p-8 text-center border rounded-xl border-dashed text-muted-foreground bg-muted/20">
                            No {activeTab} added yet.
                        </div>
                    )}
                    {(activeTab === 'holidays' ? holidays : exams).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'holidays' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                    <CalendarIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium">
                                        {item.name ? item.name : `${new Date(item.startDate).toLocaleDateString()} — ${new Date(item.endDate).toLocaleDateString()}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                        {activeTab === 'holidays' ? 'Holiday' : 'Exam Block'}
                                        {item.name && <span className="font-normal normal-case ml-1 text-muted-foreground/70">· {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</span>}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(item.id, activeTab === 'holidays' ? 'holiday' : 'exam')}
                                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Form */}
            <div className="pt-6 border-t">
                <h3 className="font-medium mb-4">Add new {activeTab === 'holidays' ? 'Holiday' : 'Exam Block'}</h3>
                <div className="flex flex-col gap-4">
                    {/* Name Input */}
                    <div className="space-y-1.5">
                        <label className="text-sm text-muted-foreground">Name (Optional)</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder={activeTab === 'holidays' ? "e.g. Diwali Break" : "e.g. Mid-Sem Exams"}
                            className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="space-y-1.5 flex-1 w-full">
                            <label className="text-sm text-muted-foreground">Start Date</label>
                            <input
                                type="date"
                                value={newStartDate}
                                onChange={e => setNewStartDate(e.target.value)}
                                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="space-y-1.5 flex-1 w-full">
                            <label className="text-sm text-muted-foreground">End Date</label>
                            <input
                                type="date"
                                value={newEndDate}
                                onChange={e => setNewEndDate(e.target.value)}
                                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            className="h-10 px-6 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 flex items-center justify-center w-full sm:w-auto"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                        </button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Note: Changes here will affect the "Today" view availability logic. Generated class instances are not modified.
                </p>
            </div>
        </div>
    );
}
