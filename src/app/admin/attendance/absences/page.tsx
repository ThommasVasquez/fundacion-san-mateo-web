import React from 'react';
import { getAbsentStudentsReport } from '@/app/actions';
import AbsenceFollowupClient from './AbsenceFollowupClient';

export const dynamic = 'force-dynamic';

interface AbsencesPageProps {
  searchParams: Promise<{
    date?: string;
    shift?: string;
  }>;
}

export default async function AbsencesPage({ searchParams }: AbsencesPageProps) {
  const params = await searchParams;
  const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Bogota' });
  const date = params.date || todayStr;
  const shift = params.shift || 'AUTO';

  const res = await getAbsentStudentsReport(date, shift);

  const absentStudents = res.success && res.absentStudents ? res.absentStudents : [];

  return (
    <AbsenceFollowupClient
      initialDate={date}
      initialShift={shift}
      totalScansOnDate={res.totalScansOnDate || 0}
      isFutureOrZeroScan={!!res.isFutureOrZeroScan}
      dayOfWeek={res.dayOfWeek ?? 1}
      isWeekday={!!res.isWeekday}
      isSaturday={!!res.isSaturday}
      isSunday={!!res.isSunday}
      activeCoursesScanned={res.activeCoursesScanned || []}
      absentStudents={absentStudents}
    />
  );
}
