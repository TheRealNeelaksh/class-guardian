'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react'; // Check icon used in fallback UI
import { TodayData } from '@/app/actions/attendanceActions';
import DaySummary from './DaySummary';
import ClassCard from './ClassCard';

interface TodayClientProps {
    data: TodayData;
}

export default function TodayClient({ data }: TodayClientProps) {
    // Current Time Tracker
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        // Update every 30 seconds to keep UI responsive to time changes
        const interval = setInterval(() => {
            setNow(new Date());
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Empty State Handling
    if (data.instances.length === 0) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {/* Still show DaySummary even if empty? 
                    Maybe just the date header part? 
                    DaySummary expects Stats. 
                    Let's show a customized header or just render DaySummary with 0 stats.
                */}
                <DaySummary summary={data.summary} date={now} />

                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 p-8 opacity-80 pb-32">
                    {data.emptyReason === 'HOLIDAY' ? (
                        <>
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-4xl animate-bounce">
                                🎉
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">{data.emptyReasonName || 'Holiday!'}</h3>
                                <p className="text-muted-foreground">{data.emptyReasonName ? 'Enjoy your day off.' : 'No classes scheduled.'}</p>
                            </div>
                        </>
                    ) : data.emptyReason === 'EXAM' ? (
                        <>
                            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-4xl">
                                📝
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">{data.emptyReasonName || 'Exam Period'}</h3>
                                <p className="text-muted-foreground">Focus on your studies. Good luck!</p>
                            </div>
                        </>
                    ) : data.emptyReason === 'WEEKEND' ? (
                        <>
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-4xl">
                                🏖️
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">Weekend Vibes</h3>
                                <p className="text-muted-foreground">No classes today. Recharge.</p>
                            </div>
                        </>
                    ) : (
                        // NO_CLASSES (Standard empty weekday, or setup issue)
                        <>
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                <Check className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">No classes found</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    If you think this is a mistake, check your semester dates or timetable setup.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <DaySummary summary={data.summary} date={now} />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 space-y-4">
                {data.instances.map((instance) => (
                    <ClassCard
                        key={instance.id}
                        instance={instance}
                        meta={data.meta[instance.subjectId]}
                        now={now}
                    />
                ))}
            </div>
        </div>
    );
}
