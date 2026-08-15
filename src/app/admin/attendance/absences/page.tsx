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
  const todayStr = new Date().toISOString().split('T')[0];
  const date = params.date || todayStr;
  const shift = params.shift || 'ALL';

  const res = await getAbsentStudentsReport(date, shift);

  const absentStudents = res.success && res.absentStudents ? res.absentStudents : [];

  return (
    <AbsenceFollowupClient
      initialDate={date}
      initialShift={shift}
      absentStudents={absentStudents}
    />
  );
}
