import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_STORAGE_KEYS = {
  URL: 'gifs_supabase_url',
  ANON_KEY: 'gifs_supabase_anon_key',
  LAST_SYNC: 'gifs_supabase_last_sync',
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

let cachedClient: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = 'https://fwisdniutpztukavhsfn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Coc_i3rzMnSEtshxEsRfzw_SowWC0JM';

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(SUPABASE_STORAGE_KEYS.URL) || '';
  const storedKey = localStorage.getItem(SUPABASE_STORAGE_KEYS.ANON_KEY) || '';

  const url = (storedUrl || envUrl || DEFAULT_SUPABASE_URL).trim();
  const anonKey = (storedKey || envKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  return {
    url,
    anonKey,
    isConnected: Boolean(url && anonKey),
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    cachedClient = null;
    return null;
  }

  if (cachedClient) return cachedClient;

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  localStorage.setItem(SUPABASE_STORAGE_KEYS.URL, cleanUrl);
  localStorage.setItem(SUPABASE_STORAGE_KEYS.ANON_KEY, cleanKey);
  cachedClient = null;
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_STORAGE_KEYS.URL);
  localStorage.removeItem(SUPABASE_STORAGE_KEYS.ANON_KEY);
  localStorage.removeItem(SUPABASE_STORAGE_KEYS.LAST_SYNC);
  cachedClient = null;
}

export async function testSupabaseConnection(url?: string, key?: string): Promise<{ success: boolean; message: string }> {
  try {
    const testUrl = (url || getSupabaseConfig().url).trim();
    const testKey = (key || getSupabaseConfig().anonKey).trim();

    if (!testUrl || !testKey) {
      return { success: false, message: 'Please provide both Supabase Project URL and Public Anon Key.' };
    }

    if (!testUrl.startsWith('https://')) {
      return { success: false, message: 'Invalid URL format. Supabase URL must start with https://' };
    }

    const client = createClient(testUrl, testKey);
    // Simple ping check
    const { error } = await client.from('profiles').select('id', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, but connection was made to Postgres
      if (error.message.includes('relation "public.profiles" does not exist') || error.code === '42P01') {
        return {
          success: true,
          message: 'Connection successful! Next step: Run the SQL Schema in Supabase SQL Editor to create tables.',
        };
      }
      return { success: false, message: 'Supabase Error: ' + error.message };
    }

    return { success: true, message: 'Connection verified! Your Green Island database is live and reachable.' };
  } catch (err: any) {
    return { success: false, message: 'Network or validation error: ' + (err?.message || 'Could not connect to Supabase') };
  }
}

function toUuid(id?: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (id && uuidRegex.test(id)) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function syncProfileToSupabase(user: any): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const isTargetAdmin = user.email?.toLowerCase().trim() === 'zohaib.aim@gmail.com';
    const pwd = user.password || (isTargetAdmin || user.role === 'admin' ? 'Malik@456' : 'teacher123');
    await client.from('profiles').upsert(
      {
        id: toUuid(user.id),
        name: user.name,
        email: user.email.toLowerCase().trim(),
        role: user.role,
        password: pwd,
        designation: user.designation || 'Staff Member',
        phone: user.phone || null,
        is_approved: user.isApproved !== false,
        is_active: user.isActive !== false,
        assigned_classes: user.assignedClasses || [],
        assigned_subjects: user.assignedSubjects || [],
        selected_subject_names: user.selectedSubjectNames || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );
  } catch (e) {
    console.warn('Failed syncing profile to Supabase:', e);
  }
}

export async function deleteProfileFromSupabase(emailOrId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const clean = emailOrId.trim().toLowerCase();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (clean.includes('@')) {
      await client.from('profiles').delete().ilike('email', clean);
    } else if (uuidRegex.test(clean)) {
      await client.from('profiles').delete().eq('id', clean);
    } else {
      await client.from('profiles').delete().ilike('email', clean);
    }
  } catch (e) {
    console.warn('Failed deleting profile from Supabase:', e);
  }
}

export async function fetchAllProfilesFromSupabase(): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('profiles').select('*');
    if (error || !data) return [];
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      password: p.password,
      designation: p.designation || 'Staff',
      phone: p.phone,
      isApproved: p.is_approved !== false,
      isActive: p.is_active !== false,
      assignedClasses: p.assigned_classes || [],
      assignedSubjects: p.assigned_subjects || [],
      selectedSubjectNames: p.selected_subject_names || [],
      registrationDate: p.created_at,
    }));
  } catch (e) {
    console.warn('Error fetching profiles from Supabase:', e);
    return [];
  }
}

export async function syncAttendanceToSupabase(records: any[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !records || records.length === 0) return;
  try {
    const rows = records.map((r) => ({
      id: r.id || `att-${r.studentId}-${r.date}`,
      student_id: r.studentId,
      student_name: r.studentName,
      roll_no: String(r.rollNo),
      class_id: r.classId,
      section_id: r.sectionId,
      date: r.date,
      status: r.status,
      arrival_time: r.arrivalTime || null,
      late_duration_minutes: r.lateDurationMinutes || 0,
      reason: r.reason || null,
      remarks: r.remarks || null,
      is_verified: r.isVerified === true,
      verified_by: r.verifiedBy || null,
      recorded_by: r.recordedBy || 'Staff',
      updated_at: new Date().toISOString(),
    }));
    await client.from('attendance').upsert(rows, { onConflict: 'student_id,date' });
  } catch (e) {
    console.warn('Failed syncing attendance to Supabase:', e);
  }
}

export async function syncMarksToSupabase(marks: any[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !marks || marks.length === 0) return;
  try {
    const rows = marks.map((m) => ({
      id: m.id || `mrk-${m.examinationId}-${m.studentId}-${m.subjectName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
      examination_id: m.examinationId,
      student_id: m.studentId,
      student_name: m.studentName,
      roll_no: String(m.rollNo),
      class_id: m.classId,
      section_id: m.sectionId,
      subject_name: m.subjectName,
      total_marks: m.totalMarks,
      obtained_marks: m.obtainedMarks !== null ? m.obtainedMarks : null,
      percentage: m.percentage !== null ? m.percentage : null,
      grade: m.grade || 'N/A',
      remarks: m.remarks || null,
      teacher_id: m.teacherId || null,
      teacher_name: m.teacherName || null,
      date: m.date || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }));
    await client.from('student_marks').upsert(rows, { onConflict: 'id' });
  } catch (e) {
    console.warn('Failed syncing marks to Supabase:', e);
  }
}

export async function syncDailyMonitoringToSupabase(records: any[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !records || records.length === 0) return;
  try {
    const rows = records.map((r) => ({
      id: r.id || `mon-${r.studentId}-${r.date}-${r.subjectName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
      date: r.date,
      student_id: r.studentId,
      student_name: r.studentName,
      roll_no: String(r.rollNo),
      class_id: r.classId,
      section_id: r.sectionId,
      subject_name: r.subjectName,
      teacher_id: r.teacherId || 'staff',
      teacher_name: r.teacherName || 'Staff',
      textbook_brought: r.textbookBrought || 'Yes',
      notebook_brought: r.notebookBrought || 'Yes',
      homework_completed: r.homeworkCompleted || 'Yes',
      classwork_completed: r.classworkCompleted || 'Yes',
      remarks: r.remarks || null,
      created_at: new Date().toISOString(),
    }));
    await client.from('daily_monitoring').upsert(rows, { onConflict: 'id' });
  } catch (e) {
    console.warn('Failed syncing daily monitoring to Supabase:', e);
  }
}
