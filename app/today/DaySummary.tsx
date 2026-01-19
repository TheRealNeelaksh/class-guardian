'use client';

import React from 'react';
import { TodaySummary } from '@/app/actions/attendanceActions';
import { CheckCircle2, CircleDashed, Clock } from 'lucide-react';

interface DaySummaryProps {
    summary: TodaySummary;
    date: Date;
}

export default function DaySummary({ summary, date }: DaySummaryProps) {
    // Format date: "Monday · Jan 19"
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    }).replace(',', ' ·');

    return (
        <div className="w-full bg-background/95 backdrop-blur z-10 border-b p-4 pb-2">
            <div className="flex flex-col gap-2">
                {/* Top Row: Date & Main Stats */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">{dateStr}</h2>
                        <div className="text-sm text-muted-foreground flex gap-2">
                            <span>{summary.total} classes</span>
                            <span>·</span>
                            <span className="text-foreground font-medium">{summary.completed} done</span>
                            <span>·</span>
                            <span>{summary.remaining} left</span>
                        </div>
                    </div>

                    {/* Attendance Pill */}
                    <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance</span>
                        <span className="text-sm font-bold text-primary">
                            {summary.attended} <span className="text-muted-foreground font-normal">/ {summary.total}</span>
                        </span>
                    </div>
                </div>

                {/* Risk Summary Line */}
                {summary.riskMessage && (
                    <div className={`text-xs px-2 py-1 rounded w-fit font-medium ${summary.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                            summary.riskLevel === 'WARNING' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                        }`}>
                        {summary.riskMessage}
                    </div>
                )}
            </div>
        </div>
    );
}
