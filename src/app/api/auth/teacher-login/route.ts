import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { encrypt } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email / Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // 1. Buscar primero en la tabla teachers
    let teacherId = '';
    let teacherNombre = '';
    let teacherEmail = email;

    const teachers = await sql`
      SELECT id, nombre, email, password_hash 
      FROM teachers 
      WHERE LOWER(email) = ${email} 
      LIMIT 1
    `;

    let passwordMatch = false;

    if (teachers.length > 0) {
      const teacher = teachers[0];
      if (teacher.password_hash) {
        passwordMatch = await bcrypt.compare(password, teacher.password_hash);
      }
      if (passwordMatch) {
        // Verificar si la cuenta está inactiva en admin_users
        const adm = await sql`SELECT activo FROM admin_users WHERE id = ${teacher.id}::uuid LIMIT 1`;
        if (adm.length > 0 && adm[0].activo === false) {
          return NextResponse.json(
            { error: 'Su usuario se encuentra inactivo. Contacte a la administración.' },
            { status: 403 }
          );
        }

        teacherId = teacher.id;
        teacherNombre = teacher.nombre || email;
        teacherEmail = teacher.email || email;
      }
    }

    // 2. Si no coincide en teachers, buscar en admin_users (rol docente, profesor o admin)
    if (!passwordMatch) {
      const adminUsers = await sql`
        SELECT id, nombre, email, password_hash, role, activo 
        FROM admin_users 
        WHERE LOWER(email) = ${email} 
        LIMIT 1
      `;

      if (adminUsers.length > 0) {
        const adminUser = adminUsers[0];
        if (adminUser.activo === false) {
          return NextResponse.json(
            { error: 'Su usuario se encuentra inactivo. Contacte a la administración.' },
            { status: 403 }
          );
        }

        if (adminUser.password_hash) {
          passwordMatch = await bcrypt.compare(password, adminUser.password_hash);
        }

        if (passwordMatch) {
          teacherId = adminUser.id;
          teacherNombre = adminUser.nombre || email;
          teacherEmail = adminUser.email || email;
        }
      }
    }

    if (!passwordMatch || !teacherId) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifique su usuario y contraseña.' },
        { status: 401 }
      );
    }

    // 3. Obtener o crear lector móvil para este profesor en la tabla readers
    const newReaderId = `movil-${teacherId.slice(0, 8)}`;
    await sql`
      INSERT INTO readers (id, ubicacion, tipo, teacher_id, sede)
      VALUES (${newReaderId}, ${`Lector Móvil - ${teacherNombre}`}, 'mobile_nfc', ${teacherId}::uuid, 'Sede 1')
      ON CONFLICT (id) DO UPDATE SET teacher_id = ${teacherId}::uuid
    `;

    // 4. Generar token JWT con vigencia de 30 días para uso en la app móvil
    const tokenPayload = {
      teacherId,
      email: teacherEmail,
      nombre: teacherNombre,
      role: 'teacher'
    };
    const sessionToken = await encrypt(tokenPayload);

    return NextResponse.json({
      success: true,
      token: sessionToken,
      teacher: {
        id: teacherId,
        nombre: teacherNombre,
        email: teacherEmail,
        readerId: newReaderId
      }
    });

  } catch (error: any) {
    console.error('Error en /api/auth/teacher-login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar inicio de sesión', details: error?.message },
      { status: 500 }
    );
  }
}
