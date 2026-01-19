'use client';

import React, { useMemo } from 'react';
import { ClassInstance } from '@prisma/client';
import { SubjectMeta, markAttendance } from '@/app/actions/attendanceActions';
import { cn } from '@/lib/utils';
import { Check, X, AlertTriangle, ArrowRight, MoreHorizontal, Clock } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ClassCardProps {
    instance: ClassInstance & { subject: { name: string } };
    meta?: SubjectMeta;
    now: Date;
}

export default function ClassCard({ instance, meta, now }: ClassCardProps) {
    const startTime = new Date(instance.date); // Base date
    // We need to parse startTime/endTime correctly if they are fully qualified Date objects from DB.
    // Prisma Dates are JS Date objects.

    // Actually, in the DB schema, startTime and endTime are DateTime.
    // Assuming they are correct full datetimes.
    const start = new Date(instance.startTime);
    const end = new Date(instance.endTime);

    // Time Awareness State
    const state = useMemo(() => {
        if (now > end) return 'COMPLETED';
        if (now >= start && now <= end) return 'ACTIVE';
        return 'UPCOMING';
    }, [now, start, end]);

    const startsInMinutes = useMemo(() => {
        if (state !== 'UPCOMING') return 0;
        const diff = start.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60));
    }, [state, start, now]);

    // Handler
    async function handleToggleAttendance() {
        // 1. Guard: Future
        if (state === 'UPCOMING' && now < start) {
            toast.error("Class hasn't started yet");
            return;
        }

        // 2. Optimistic Toggle (Visual handled by parent re-render or local usage if complex? 
        // Ideally we rely on Server Action revalidation, but for "Friction" feel we might want instant feedback.
        // For now, simple async call. Component will re-render when 'revalidatePath' hits.)

        // Logic: Toggle PRESENT <-> ABSENT. 
        // If currently EXCUSED, go to PRESENT?
        const newStatus = instance.status === 'ABSENT' ? 'PRESENT' : 'ABSENT';

        const res = await markAttendance(instance.id, newStatus);
        if (!res.success) {
            toast.error(res.error || "Failed to update");
        } else {
            // Success
            toast.success(newStatus === 'PRESENT' ? "Marked Present" : "Marked Absent");
        }
    }

    async function handleMarkExcused() {
        const res = await markAttendance(instance.id, 'EXCUSED');
        if (res.success) toast.success("Marked Excused");
    }

    // Styles
    const isPresent = instance.status === 'PRESENT';
    const isAbsent = instance.status === 'ABSENT';
    const isExcused = instance.status === 'EXCUSED';

    // Meta Info Priority
    // Warning if consecutiveAbsences >= 2 -> Show Warning
    // ELse Show Attendance %
    const showWarning = (meta?.consecutiveAbsences || 0) >= 2;

    return (
        <div
            className={cn(
                "relative rounded-xl border bg-card p-4 transition-all",
                // Active State
                state === 'ACTIVE' && "border-primary/50 ring-1 ring-primary/20 shadow-sm",
                // Completed State (Muted)
                state === 'COMPLETED' && "opacity-75 bg-muted/30 border-dashed",
                // Attendance State styling overrides
                state !== 'UPCOMING' && isAbsent && "border-destructive/30 bg-destructive/5",
                state !== 'UPCOMING' && isExcused && "border-yellow-500/30 bg-yellow-500/5",
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h3 className={cn("font-semibold text-lg leading-none", state === 'COMPLETED' && "text-muted-foreground")}>
                            {instance.subject.name}
                        </h3>
                        {/* Status Badge (if not PRESENT) */}
                        {isAbsent && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-destructive/15 text-destructive rounded">ABSENT</span>}
                        {isExcused && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-500/15 text-yellow-600 rounded">EXCUSED</span>}
                    </div>

                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {state === 'ACTIVE' && (
                            <span className="ml-2 text-primary font-medium text-xs animate-pulse">● Live Now</span>
                        )}
                        {state === 'UPCOMING' && startsInMinutes < 60 && startsInMinutes > 0 && (
                            <span className="ml-2 text-blue-500 font-medium text-xs">Starts in {startsInMinutes}m</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {/* If Upcoming, show Lock or nothing? User said "Block it". We can show a disabled button or nothing. */}
                    {state === 'UPCOMING' ? (
                        <div className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded">
                            Upcoming
                        </div>
                    ) : (
                        <button
                            onClick={handleToggleAttendance}
                            className={cn(
                                "h-10 w-10 flex items-center justify-center rounded-full transition-colors border",
                                isPresent
                                    ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                                    : isAbsent
                                        ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" // Excused
                            )}
                        >
                            {isPresent && <Check className="w-5 h-5" />}
                            {isAbsent && <X className="w-5 h-5" />}
                            {isExcused && <div className="text-xs font-bold">EX</div>}
                        </button>
                    )}

                    {/* Menu for Excused */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleMarkExcused}>
                                Mark as Excused
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => markAttendance(instance.id, 'PRESENT')}>
                                Reset to Present
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Meta Bar */}
            {(meta || showWarning) && (
                <div className={cn(
                    "mt-3 pt-2 border-t flex items-center justify-between text-xs font-medium",
                    showWarning ? "text-destructive" : "text-muted-foreground"
                )}>
                    {/* Left Side: Attendance % or Critical Warning */}
                    {showWarning ? (
                        <span className="flex items-center">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                            Warning: Missed last {meta?.consecutiveAbsences} classes
                        </span>
                    ) : (
                        <span>Attendance so far: {meta?.attendancePercentage}%</span>
                    )}

                    {/* Right Side: Risk/Safe Skips -- The REAL Intelligence */}
                    {meta && (
                        <span className={cn(
                            meta.isCritical ? "text-destructive font-bold" :
                                meta.safeSkips <= 2 ? "text-orange-600 dark:text-orange-400 font-semibold" :
                                    "text-muted-foreground"
                        )}>
                            {meta.isCritical ? "No skips allowed" :
                                meta.safeSkips <= 2 ? `Max safe absences: ${meta.safeSkips}` :
                                    `Safe skips left: ${meta.safeSkips}`}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
