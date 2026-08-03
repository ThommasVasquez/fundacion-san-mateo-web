import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/auth';
import { sql } from '@/lib/db';
import TeacherAttendanceClient from './TeacherAttendanceClient';

export const dynamic = 'force-dynamic';

export default async function TeacherAttendancePage() {
  const session = (await cookies()).get('session')?.value;

  if (!session) {
    redirect('/auth/teacher-login');
  }

  let teacherId = '';
  let teacherName = '';

  try {
    const parsed = await decrypt(session);
    if (!parsed || !parsed.teacherId) {
      redirect('/auth/teacher-login');
    }
    teacherId = parsed.teacherId;

    // Fetch teacher details
    const teachers = await sql`
      SELECT nombre 
      FROM teachers 
      WHERE id = ${teacherId}::uuid 
      LIMIT 1
    `;
    if (teachers.length === 0) {
      redirect('/auth/teacher-login');
    }
    teacherName = teachers[0].nombre;

  } catch (error) {
    console.error('Teacher auth error:', error);
    redirect('/auth/teacher-login');
  }

  // Fetch teacher's assigned mobile reader
  const mobileReaders = await sql`
    SELECT id 
    FROM readers 
    WHERE tipo = 'mobile_nfc' AND teacher_id = ${teacherId}::uuid 
    LIMIT 1
  `;
  const readerId = mobileReaders.length > 0 ? mobileReaders[0].id : 'movil-001';

  // Fetch all active students
  const students = await sql`
    SELECT id, nombre, grado, rfid_tag_uid 
    FROM students 
    WHERE activo = TRUE 
    ORDER BY grado, nombre
  `;

  return (
    <TeacherAttendanceClient 
      teacherName={teacherName}
      teacherId={teacherId}
      readerId={readerId}
      students={students.map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        grado: s.grado,
        rfid_tag_uid: s.rfid_tag_uid
      }))}
    />
  );
}
