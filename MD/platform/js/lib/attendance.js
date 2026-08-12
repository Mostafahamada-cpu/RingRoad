// Attendance data access — thin wrapper over the shared Supabase `db` helper.
// One row per user per day in public.attendance (see platform-attendance.sql).
// RLS scopes reads/writes by role, so these calls stay simple.
import { db, userId } from './supabase.js';
import { todayKey } from './utils.js';

// Whole minutes worked between clock-in and clock-out (or "now" if still open).
export function workedMinutes(clockIn, clockOut) {
  if (!clockIn) return 0;
  const end = clockOut ? new Date(clockOut) : new Date();
  return Math.max(0, Math.round((end - new Date(clockIn)) / 60000));
}

// minutes → "HH:MM"
export function fmtHM(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Derived state of a record: 'none' | 'working' | 'completed'.
export function stateOf(rec) {
  if (!rec || !rec.clock_in) return 'none';
  return rec.clock_out ? 'completed' : 'working';
}

// My attendance record for today (or null).
export async function myTodayRecord() {
  const rows = await db.list('attendance',
    `user_id=eq.${userId()}&work_date=eq.${todayKey()}&select=*&limit=1`);
  return rows?.[0] || null;
}

// Clock in now. The (user_id, work_date) unique index also blocks duplicates DB-side.
export async function clockIn() {
  return db.create('attendance', {
    user_id: userId(),
    work_date: todayKey(),
    clock_in: new Date().toISOString(),
    status: 'working',
  });
}

// Clock out an open record; stamps the time + total minutes.
export async function clockOut(rec) {
  const now = new Date().toISOString();
  return db.update('attendance', rec.id, {
    clock_out: now,
    working_minutes: workedMinutes(rec.clock_in, now),
    status: 'completed',
  });
}

// Everyone's records for today (RLS narrows to self / team / all by role).
export function loadTodayScoped() {
  return db.list('attendance', `work_date=eq.${todayKey()}&select=*`);
}
