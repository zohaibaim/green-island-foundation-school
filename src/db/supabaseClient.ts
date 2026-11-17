import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  AttendanceRecord,
  ClassGrade,
  DailySubjectMonitoring,
  Examination,
  HealthAndHygieneRecord,
  ParentMeeting,
  Student,
  StudentComplaint,
  StudentMarkRecord,
  Subject,
  SystemSettings,
  TeacherObservation,
  UniformRecord,
  User,
} from '../types';

const SUPABASE_STORAGE_KEYS = {
  URL: 'gifs_supabase_url',
  ANON_KEY: 'gifs_supabase_anon_key',
  LAST_SYNC: 'gifs_supabase_last_sync',
  PULLED_ONCE: 'gifs_cloud_pulled_v2',
};

export const CLOUD_SYNC_EVENT = 'gifs-cloud-sync';

export const PORTAL_STORAGE_KEYS = {
  SETTINGS: 'gifs_settings_v2',
  CLASSES: 'gifs_classes_v2',
  SUBJECTS: 'gifs_subjects_v2',
  USERS: 'gifs_users_v2',
  STUDENTS: 'gifs_students_v2',
  ATTENDANCE: 'gifs_attendance_v2',
  MONITORING: 'gifs_monitoring_v2',
  COMPLAINTS: 'gifs_complaints_v2',
  EXAMINATIONS: 'gifs_examinations_v2',
  MARKS: 'gifs_marks_v2',
  HEALTH: 'gifs_health_v2',
  UNIFORM: 'gifs_uniform_v2',
  OBSERVATIONS: 'gifs_observations_v2',
  PARENT_MEETINGS: 'gifs_parent_meetings_v2',
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

let cachedClient: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let isPulling = false;
let pullPendingAgain = false;

// Track keys that just had local writes in-flight so concurrent pulls don't race stale reads
const activePushCounts: Record<string, number> = {};
const recentLocalWriteTs: Record<string, number> = {};
const missingOptionalTables = new Set<string>();

const DEFAULT_SUPABASE_URL = 'https://fwisdniutpztukavhsfn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Coc_i3rzMnSEtshxEsRfzw_SowWC0JM';

function markPushStart(key: string) {
  activePushCounts[key] = (activePushCounts[key] || 0) + 1;
  recentLocalWriteTs[key] = Date.now();
}

function markPushEnd(key: string) {
  activePushCounts[key] = Math.max(0, (activePushCounts[key] || 1) - 1);
  recentLocalWriteTs[key] = Date.now();
}

function isKeyLockedForPull(key: string): boolean {
  if ((activePushCounts[key] || 0) > 0) return true;
  const lastWrite = recentLocalWriteTs[key] || 0;
  return Date.now() - lastWrite < 1500;
}

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return error.code === 'PGRST205' || error.code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache');
}

function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return error.code === '42703' || error.code === 'PGRST204' || msg.includes('column') && msg.includes('does not exist');
}

function isForeignKeyError(error: any): boolean {
  if (!error) return false;
  return error.code === '23503' || String(error.message || '').toLowerCase().includes('foreign key');
}

function normalizeDate(val?: string, fallback?: string): string {
  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
  if (val && !isNaN(Date.parse(val))) {
    return new Date(val).toISOString().split('T')[0];
  }
  return fallback || new Date().toISOString().split('T')[0];
}

export function emitCloudSyncEvent(changedKeys: string[]): void {
  if (typeof window === 'undefined' || changedKeys.length === 0) return;
  window.dispatchEvent(new CustomEvent(CLOUD_SYNC_EVENT, { detail: { changedKeys } }));
}

export function clearMissingOptionalTableCache(): void {
  missingOptionalTables.clear();
}

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
  missingOptionalTables.clear();
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_STORAGE_KEYS.URL);
  localStorage.removeItem(SUPABASE_STORAGE_KEYS.ANON_KEY);
  localStorage.removeItem(SUPABASE_STORAGE_KEYS.LAST_SYNC);
  localStorage.removeItem(SUPABASE_STORAGE_KEYS.PULLED_ONCE);
  cachedClient = null;
  missingOptionalTables.clear();
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
    const { error } = await client.from('profiles').select('id', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST116') {
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

function readLocalArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ==========================================
// 1. PROFILES / USERS SYNC
// ==========================================
export async function syncProfileToSupabase(user: User): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  markPushStart(PORTAL_STORAGE_KEYS.USERS);
  try {
    const isTargetAdmin = user.email?.toLowerCase().trim() === 'zohaib.aim@gmail.com';
    const pwd = user.password || (isTargetAdmin || user.role === 'admin' ? 'Malik@456' : 'teacher123');
    const { error } = await client.from('profiles').upsert(
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
    if (error) console.warn('Supabase profile upsert error:', error.message);
  } catch (e) {
    console.warn('Failed syncing profile to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.USERS);
  }
}

export async function deleteProfileFromSupabase(emailOrId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  markPushStart(PORTAL_STORAGE_KEYS.USERS);
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
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.USERS);
  }
}

export async function fetchAllProfilesFromSupabase(): Promise<User[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('profiles').select('*');
    if (error || !data) return [];
    return data.map((p: any) => {
      const assignedClasses: string[] = p.assigned_classes || [];
      const assignedSubjects = p.assigned_subjects || [];
      const selectedSubjectNames: string[] = p.selected_subject_names || [];
      const hasSubjects = selectedSubjectNames.length > 0 || assignedSubjects.length > 0;
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        password: p.password,
        designation: p.designation || 'Staff',
        phone: p.phone,
        isApproved: p.is_approved !== false,
        isActive: p.is_active !== false,
        assignedClasses,
        inChargeClass: p.role === 'class_teacher' ? assignedClasses[0] : undefined,
        isDualTeacher: p.role === 'class_teacher' && hasSubjects,
        assignedSubjects,
        selectedSubjectNames,
        registrationDate: p.created_at,
      };
    });
  } catch (e) {
    console.warn('Error fetching profiles from Supabase:', e);
    return [];
  }
}

// ==========================================
// 2. CLASSES & SUBJECTS SYNC
// ==========================================
export async function syncClassesToSupabase(classes: ClassGrade[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !classes || classes.length === 0) return;
  markPushStart(PORTAL_STORAGE_KEYS.CLASSES);
  try {
    const rows = classes.map((c, idx) => ({
      id: c.id,
      name: c.name,
      category: c.category === 'O Level' ? 'O Level' : 'Regular',
      sections: c.sections || ['A', 'B', 'C', 'D'],
      is_active: c.isActive !== false,
      display_order: c.order ?? idx + 1,
    }));
    const { error } = await client.from('classes').upsert(rows, { onConflict: 'id' });
    if (error) console.warn('Supabase classes upsert error:', error.message);
  } catch (e) {
    console.warn('Failed syncing classes to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.CLASSES);
  }
}

export async function deleteClassFromSupabase(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  markPushStart(PORTAL_STORAGE_KEYS.CLASSES);
  try {
    await client.from('classes').delete().eq('id', id);
  } catch (e) {
    console.warn('Failed deleting class from Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.CLASSES);
  }
}

export async function syncSubjectsToSupabase(subjects: Subject[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !subjects || subjects.length === 0) return;
  markPushStart(PORTAL_STORAGE_KEYS.SUBJECTS);
  try {
    const rows = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      class_ids: s.classIds || [],
    }));
    const { error } = await client.from('subjects').upsert(rows, { onConflict: 'id' });
    if (error) {
      // Fallback row-by-row on unique code conflict
      for (const row of rows) {
        await client.from('subjects').upsert(row, { onConflict: 'code' });
      }
    }
  } catch (e) {
    console.warn('Failed syncing subjects to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.SUBJECTS);
  }
}

export async function deleteSubjectFromSupabase(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  markPushStart(PORTAL_STORAGE_KEYS.SUBJECTS);
  try {
    await client.from('subjects').delete().eq('id', id);
  } catch (e) {
    console.warn('Failed deleting subject from Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.SUBJECTS);
  }
}

// ==========================================
// 3. STUDENTS SYNC
// ==========================================
async function ensureClassesPrerequisite(students: Student[]): Promise<void> {
  const localClasses = readLocalArray<ClassGrade>(PORTAL_STORAGE_KEYS.CLASSES);
  const missingIds = new Set<string>();
  students.forEach((s) => {
    if (s.classId && !localClasses.some((c) => c.id === s.classId)) {
      missingIds.add(s.classId);
    }
  });
  const classesToEnsure: ClassGrade[] = [...localClasses];
  missingIds.forEach((cid) => {
    const sample = students.find((s) => s.classId === cid);
    classesToEnsure.push({
      id: cid,
      name: sample?.className || cid,
      category: 'Regular',
      sections: ['A', 'B', 'C', 'D'],
      isActive: true,
      order: 99,
    });
  });
  if (classesToEnsure.length > 0) {
    await syncClassesToSupabase(classesToEnsure);
  }
}

function mapStudentToRow(s: Student) {
  return {
    id: s.id,
    admission_no: String(s.admissionNo || s.id),
    roll_no: String(s.rollNo || '01'),
    name: s.name || 'Student',
    father_name: s.fatherName || '-',
    mother_name: s.motherName || null,
    guardian_name: s.guardianName || null,
    dob: normalizeDate(s.dob, '2012-01-01'),
    gender: s.gender || 'Male',
    admission_date: normalizeDate(s.admissionDate),
    academic_year: s.academicYear || '2026-2027',
    class_id: s.classId || 'c9',
    section_id: s.sectionId || 'A',
    class_name: s.className || 'Class IX',
    section_name: s.sectionName || `Section ${s.sectionId || 'A'}`,
    previous_school: s.previousSchool || null,
    parent_contact: s.parentContact || '-',
    alternative_contact: s.alternativeContact || null,
    emergency_contact: s.emergencyContact || null,
    address: s.address || 'Karachi',
    medical_info: s.medicalInfo || null,
    special_educational_needs: s.specialEducationalNeeds || null,
    remarks: s.remarks || null,
    status: s.status || 'Active',
    photo_url: s.photoUrl || null,
    created_at: s.createdAt || new Date().toISOString(),
    updated_at: s.updatedAt || new Date().toISOString(),
  };
}

function mapRowToStudent(r: any): Student {
  return {
    id: r.id,
    admissionNo: r.admission_no,
    rollNo: r.roll_no,
    name: r.name,
    fatherName: r.father_name,
    motherName: r.mother_name || undefined,
    guardianName: r.guardian_name || undefined,
    dob: r.dob,
    gender: (r.gender as Student['gender']) || 'Male',
    admissionDate: r.admission_date,
    academicYear: r.academic_year || '2026-2027',
    classId: r.class_id,
    sectionId: r.section_id,
    className: r.class_name,
    sectionName: r.section_name,
    previousSchool: r.previous_school || undefined,
    parentContact: r.parent_contact,
    alternativeContact: r.alternative_contact || undefined,
    emergencyContact: r.emergency_contact || undefined,
    address: r.address,
    medicalInfo: r.medical_info || undefined,
    specialEducationalNeeds: r.special_educational_needs || undefined,
    remarks: r.remarks || undefined,
    status: r.status || 'Active',
    photoUrl: r.photo_url || undefined,
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  };
}

export async function syncStudentsToSupabase(students: Student[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !students || students.length === 0) return;
  markPushStart(PORTAL_STORAGE_KEYS.STUDENTS);
  try {
    const rows = students.map(mapStudentToRow);
    let { error } = await client.from('students').upsert(rows, { onConflict: 'id' });

    if (isForeignKeyError(error)) {
      await ensureClassesPrerequisite(students);
      const retry = await client.from('students').upsert(rows, { onConflict: 'id' });
      error = retry.error;
    }

    if (error) {
      // Fallback row-by-row if e.g. admission_no unique constraint hits across devices
      for (const row of rows) {
        const res = await client.from('students').upsert(row, { onConflict: 'id' });
        if (res.error && res.error.code === '23505') {
          await client.from('students').upsert(row, { onConflict: 'admission_no' });
        }
      }
    }
  } catch (e) {
    console.warn('Failed syncing students to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.STUDENTS);
  }
}

export async function deleteStudentFromSupabase(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  markPushStart(PORTAL_STORAGE_KEYS.STUDENTS);
  try {
    const { error } = await client.from('students').delete().eq('id', id);
    if (error) console.warn('Failed deleting student from Supabase:', error.message);
  } catch (e) {
    console.warn('Failed deleting student from Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.STUDENTS);
  }
}

// ==========================================
// 4. ATTENDANCE SYNC
// ==========================================
export async function syncAttendanceToSupabase(records: AttendanceRecord[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !records || records.length === 0) return;
  markPushStart(PORTAL_STORAGE_KEYS.ATTENDANCE);
  try {
    const rows = records.map((r) => ({
      id: r.id || `att-${r.studentId}-${r.date}`,
      student_id: r.studentId,
      student_name: r.studentName,
      roll_no: String(r.rollNo),
      class_id: r.classId,
      section_id: r.sectionId,
      date: normalizeDate(r.date),
      status: r.status,
      arrival_time: r.arrivalTime || null,
      late_duration_minutes: r.lateDurationMinutes || 0,
      reason: r.reason || null,
      remarks: r.remarks || null,
      is_verified: r.isVerified === true,
      verified_by: r.verifiedBy || null,
      recorded_by: r.recordedBy || 'Staff',
      updated_at: r.updatedAt || new Date().toISOString(),
    }));
    let { error } = await client.from('attendance').upsert(rows, { onConflict: 'student_id,date' });
    if (isForeignKeyError(error)) {
      const localStudents = readLocalArray<Student>(PORTAL_STORAGE_KEYS.STUDENTS);
      if (localStudents.length > 0) {
        await syncStudentsToSupabase(localStudents);
        const retry = await client.from('attendance').upsert(rows, { onConflict: 'student_id,date' });
        error = retry.error;
      }
    }
    if (error) console.warn('Supabase attendance upsert error:', error.message);
  } catch (e) {
    console.warn('Failed syncing attendance to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.ATTENDANCE);
  }
}

// ==========================================
// 5. DAILY MONITORING SYNC
// ==========================================
export async function syncDailyMonitoringToSupabase(records: DailySubjectMonitoring[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !records || records.length === 0) return;
  markPushStart(PORTAL_STORAGE_KEYS.MONITORING);
  try {
    const rows = records.map((r) => ({
      id: r.id || `mon-${r.studentId}-${r.date}-${r.subjectName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
      date: normalizeDate(r.date),
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
      assignment_completed: r.assignmentCompleted || 'Not Applicable',
      required_material_brought: r.requiredMaterialBrought || 'Yes',
      remarks: r.remarks || null,
      created_at: r.createdAt || new Date().toISOString(),
    }));
    let { error } = await client.from('daily_monitoring').upsert(rows, { onConflict: 'id' });
    if (isForeignKeyError(error)) {
      const localStudents = readLocalArray<Student>(PORTAL_STORAGE_KEYS.STUDENTS);
      if (localStudents.length > 0) {
        await syncStudentsToSupabase(localStudents);
        const retry = await client.from('daily_monitoring').upsert(rows, { onConflict: 'id' });
        error = retry.error;
      }
    }
    if (error) console.warn('Supabase daily monitoring upsert error:', error.message);
  } catch (e) {
    console.warn('Failed syncing daily monitoring to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.MONITORING);
  }
}

// ==========================================
// 6. COMPLAINTS SYNC
// ==========================================
export async function syncComplaintsToSupabase(complaints: StudentComplaint[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !complaints || complaints.length === 0) return;
  markPushStart(PORTAL_STORAGE_KEYS.COMPLAINTS);
  try {
    const rows = complaints.map((c) => ({
      id: c.id,
      student_id: c.studentId,
      student_name: c.studentName,
      roll_no: String(c.rollNo),
      class_id: c.classId,
      section_id: c.sectionId,
      date: normalizeDate(c.date),
      reporting_teacher_id: c.reportingTeacherId || 'staff',
      reporting_teacher_name: c.reportingTeacherName || 'Staff',
      subject: c.subject || null,
      category: c.category,
      description: c.description,
      supporting_doc_url: c.supportingDocumentUrl || null,
      action_taken: c.actionTaken || null,
      follow_up_remarks: c.followUpRemarks || null,
      principal_remarks: c.principalRemarks || null,
      follow_up_date: c.followUpDate ? normalizeDate(c.followUpDate) : null,
      status: c.status || 'Pending',
      parent_contacted: Boolean(c.parentContacted),
      created_at: c.createdAt || new Date().toISOString(),
      updated_at: c.updatedAt || new Date().toISOString(),
    }));
    let { error } = await client.from('complaints').upsert(rows, { onConflict: 'id' });
    if (isForeignKeyError(error)) {
      const localStudents = readLocalArray<Student>(PORTAL_STORAGE_KEYS.STUDENTS);
      if (localStudents.length > 0) {
        await syncStudentsToSupabase(localStudents);
        const retry = await client.from('complaints').upsert(rows, { onConflict: 'id' });
        error = retry.error;
      }
    }
    if (error) console.warn('Supabase complaints upsert error:', error.message);
  } catch (e) {
    console.warn('Failed syncing complaints to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.COMPLAINTS);
  }
}

// ==========================================
// 7. EXAMINATIONS SYNC
// ==========================================
export async function syncExaminationsToSupabase(exams: Examination[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !exams || exams.length === 0) return;
  markPushStart(PORTAL_STORAGE_KEYS.EXAMINATIONS);
  try {
    const fullRows = exams.map((ex) => ({
      id: ex.id,
      academic_year: ex.academicYear || '2026-2027',
      class_id: ex.classId,
      section_id: ex.sectionId || 'ALL',
      name: ex.name,
      category: ex.category,
      date: normalizeDate(ex.date),
      passing_percentage: ex.passingPercentage ?? 60,
      total_exam_marks: ex.totalExamMarks ?? (ex.subjects || []).reduce((s, p) => s + (Number(p.totalMarks) || 0), 0),
      created_by: ex.createdBy || null,
      subjects: ex.subjects || [],
      created_at: ex.createdAt || new Date().toISOString(),
    }));

    let { error } = await client.from('examinations').upsert(fullRows, { onConflict: 'id' });
    if (isMissingColumnError(error)) {
      const baseRows = exams.map((ex) => ({
        id: ex.id,
        academic_year: ex.academicYear || '2026-2027',
        class_id: ex.classId,
        section_id: ex.sectionId || 'ALL',
        name: ex.name,
        category: ex.category,
        date: normalizeDate(ex.date),
        subjects: ex.subjects || [],
        created_at: ex.createdAt || new Date().toISOString(),
      }));
      const retry = await client.from('examinations').upsert(baseRows, { onConflict: 'id' });
      error = retry.error;
    }
    if (error) console.warn('Supabase examinations upsert error:', error.message);
  } catch (e) {
    console.warn('Failed syncing examinations to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.EXAMINATIONS);
  }
}

export async function deleteExaminationFromSupabase(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  markPushStart(PORTAL_STORAGE_KEYS.EXAMINATIONS);
  try {
    await client.from('examinations').delete().eq('id', id);
  } catch (e) {
    console.warn('Failed deleting examination from Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.EXAMINATIONS);
  }
}

// ==========================================
// 8. STUDENT MARKS SYNC
// ==========================================
export async function syncMarksToSupabase(marks: StudentMarkRecord[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !marks || marks.length === 0) return;
  markPushStart(PORTAL_STORAGE_KEYS.MARKS);
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
      obtained_marks: m.obtainedMarks !== null && m.obtainedMarks !== undefined ? m.obtainedMarks : null,
      percentage: m.percentage !== null && m.percentage !== undefined ? m.percentage : null,
      grade: m.grade || 'N/A',
      remarks: m.remarks || null,
      teacher_id: m.teacherId || null,
      teacher_name: m.teacherName || null,
      date: normalizeDate(m.date),
      edit_history: m.editHistory || [],
    }));

    let { error } = await client
      .from('student_marks')
      .upsert(rows, { onConflict: 'examination_id,student_id,subject_name' });

    if (isForeignKeyError(error)) {
      const localExams = readLocalArray<Examination>(PORTAL_STORAGE_KEYS.EXAMINATIONS);
      const localStudents = readLocalArray<Student>(PORTAL_STORAGE_KEYS.STUDENTS);
      if (localExams.length > 0) await syncExaminationsToSupabase(localExams);
      if (localStudents.length > 0) await syncStudentsToSupabase(localStudents);
      const retry = await client
        .from('student_marks')
        .upsert(rows, { onConflict: 'examination_id,student_id,subject_name' });
      error = retry.error;
    }

    if (error) console.warn('Supabase marks upsert error:', error.message);
  } catch (e) {
    console.warn('Failed syncing marks to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.MARKS);
  }
}

// ==========================================
// 9. PARENT MEETINGS SYNC
// ==========================================
export async function syncParentMeetingsToSupabase(meetings: ParentMeeting[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !meetings || meetings.length === 0) return;
  markPushStart(PORTAL_STORAGE_KEYS.PARENT_MEETINGS);
  try {
    const rows = meetings.map((m) => ({
      id: m.id,
      student_id: m.studentId,
      student_name: m.studentName,
      roll_no: String(m.rollNo),
      class_name: m.className,
      section_name: m.sectionName,
      parent_name: m.parentName,
      contact_number: m.contactNumber,
      meeting_date: normalizeDate(m.meetingDate),
      meeting_reason: m.meetingReason,
      related_alert_id: m.relatedAlertId || null,
      teacher_attending: m.teacherAttending,
      principal_remarks: m.principalRemarks || null,
      parent_feedback: m.parentFeedback || '',
      agreed_action_plan: m.agreedActionPlan || '',
      follow_up_date: m.followUpDate ? normalizeDate(m.followUpDate) : null,
      meeting_status: m.meetingStatus || 'Scheduled',
      created_at: m.createdAt || new Date().toISOString(),
    }));

    let { error } = await client.from('parent_meetings').upsert(rows, { onConflict: 'id' });
    if (isForeignKeyError(error)) {
      const localStudents = readLocalArray<Student>(PORTAL_STORAGE_KEYS.STUDENTS);
      if (localStudents.length > 0) {
        await syncStudentsToSupabase(localStudents);
        const retry = await client.from('parent_meetings').upsert(rows, { onConflict: 'id' });
        error = retry.error;
      }
    }
    if (error) console.warn('Supabase parent meetings upsert error:', error.message);
  } catch (e) {
    console.warn('Failed syncing parent meetings to Supabase:', e);
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.PARENT_MEETINGS);
  }
}

// ==========================================
// 10. OPTIONAL EXTENDED TABLES (HYGIENE, UNIFORM, OBSERVATIONS, SETTINGS)
// ==========================================
export async function syncHealthRecordsToSupabase(records: HealthAndHygieneRecord[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !records || records.length === 0 || missingOptionalTables.has('health_records')) return;
  markPushStart(PORTAL_STORAGE_KEYS.HEALTH);
  try {
    const rows = records.map((h) => ({
      id: h.id,
      student_id: h.studentId,
      date: normalizeDate(h.date),
      nails_trimmed: h.nailsTrimmed,
      hair_maintained: h.hairMaintained,
      haircut_standard: h.haircutStandard,
      personal_cleanliness: h.personalCleanliness,
      general_hygiene: h.generalHygiene,
      remarks: h.remarks || null,
      teacher_name: h.teacherName,
    }));
    const { error } = await client.from('health_records').upsert(rows, { onConflict: 'id' });
    if (isMissingTableError(error)) missingOptionalTables.add('health_records');
  } catch {
    // Optional table may not exist yet
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.HEALTH);
  }
}

export async function syncUniformRecordsToSupabase(records: UniformRecord[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !records || records.length === 0 || missingOptionalTables.has('uniform_records')) return;
  markPushStart(PORTAL_STORAGE_KEYS.UNIFORM);
  try {
    const rows = records.map((u) => ({
      id: u.id,
      student_id: u.studentId,
      date: normalizeDate(u.date),
      proper_uniform: u.properUniform,
      clean_uniform: u.cleanUniform,
      proper_shoes: u.properShoes,
      proper_socks: u.properSocks,
      school_belt: u.schoolBelt,
      school_tie: u.schoolTie,
      school_badge: u.schoolBadge,
      overall_appearance: u.overallAppearance,
      remarks: u.remarks || null,
      teacher_name: u.teacherName,
    }));
    const { error } = await client.from('uniform_records').upsert(rows, { onConflict: 'id' });
    if (isMissingTableError(error)) missingOptionalTables.add('uniform_records');
  } catch {
    // Optional table may not exist yet
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.UNIFORM);
  }
}

export async function syncObservationsToSupabase(records: TeacherObservation[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !records || records.length === 0 || missingOptionalTables.has('teacher_observations')) return;
  markPushStart(PORTAL_STORAGE_KEYS.OBSERVATIONS);
  try {
    const rows = records.map((o) => ({
      id: o.id,
      student_id: o.studentId,
      student_name: o.studentName,
      date: normalizeDate(o.date),
      teacher_name: o.teacherName,
      positive_remarks: o.positiveRemarks || '',
      improvement_suggestions: o.improvementSuggestions || '',
      teacher_observations: o.teacherObservations || '',
      recommended_action: o.recommendedAction || '',
      category: o.category || 'General',
    }));
    const { error } = await client.from('teacher_observations').upsert(rows, { onConflict: 'id' });
    if (isMissingTableError(error)) missingOptionalTables.add('teacher_observations');
  } catch {
    // Optional table may not exist yet
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.OBSERVATIONS);
  }
}

export async function syncSettingsToSupabase(settings: SystemSettings): Promise<void> {
  const client = getSupabaseClient();
  if (!client || missingOptionalTables.has('system_settings')) return;
  markPushStart(PORTAL_STORAGE_KEYS.SETTINGS);
  try {
    const { error } = await client.from('system_settings').upsert(
      {
        id: 'default',
        data: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (isMissingTableError(error)) missingOptionalTables.add('system_settings');
  } catch {
    // Optional table may not exist yet
  } finally {
    markPushEnd(PORTAL_STORAGE_KEYS.SETTINGS);
  }
}

// ==========================================
// 11. FULL PUSH (LOCAL -> SUPABASE)
// ==========================================
export async function pushAllLocalToSupabase(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase client is not configured.' };
  try {
    const classes = readLocalArray<ClassGrade>(PORTAL_STORAGE_KEYS.CLASSES);
    const subjects = readLocalArray<Subject>(PORTAL_STORAGE_KEYS.SUBJECTS);
    const users = readLocalArray<User>(PORTAL_STORAGE_KEYS.USERS);
    const students = readLocalArray<Student>(PORTAL_STORAGE_KEYS.STUDENTS);
    const attendance = readLocalArray<AttendanceRecord>(PORTAL_STORAGE_KEYS.ATTENDANCE);
    const monitoring = readLocalArray<DailySubjectMonitoring>(PORTAL_STORAGE_KEYS.MONITORING);
    const complaints = readLocalArray<StudentComplaint>(PORTAL_STORAGE_KEYS.COMPLAINTS);
    const exams = readLocalArray<Examination>(PORTAL_STORAGE_KEYS.EXAMINATIONS);
    const marks = readLocalArray<StudentMarkRecord>(PORTAL_STORAGE_KEYS.MARKS);
    const meetings = readLocalArray<ParentMeeting>(PORTAL_STORAGE_KEYS.PARENT_MEETINGS);
    const health = readLocalArray<HealthAndHygieneRecord>(PORTAL_STORAGE_KEYS.HEALTH);
    const uniform = readLocalArray<UniformRecord>(PORTAL_STORAGE_KEYS.UNIFORM);
    const observations = readLocalArray<TeacherObservation>(PORTAL_STORAGE_KEYS.OBSERVATIONS);

    if (classes.length > 0) await syncClassesToSupabase(classes);
    if (subjects.length > 0) await syncSubjectsToSupabase(subjects);
    for (const u of users) {
      await syncProfileToSupabase(u);
    }
    if (students.length > 0) await syncStudentsToSupabase(students);
    if (exams.length > 0) await syncExaminationsToSupabase(exams);
    if (attendance.length > 0) await syncAttendanceToSupabase(attendance);
    if (monitoring.length > 0) await syncDailyMonitoringToSupabase(monitoring);
    if (complaints.length > 0) await syncComplaintsToSupabase(complaints);
    if (marks.length > 0) await syncMarksToSupabase(marks);
    if (meetings.length > 0) await syncParentMeetingsToSupabase(meetings);
    if (health.length > 0) await syncHealthRecordsToSupabase(health);
    if (uniform.length > 0) await syncUniformRecordsToSupabase(uniform);
    if (observations.length > 0) await syncObservationsToSupabase(observations);

    try {
      const rawSettings = localStorage.getItem(PORTAL_STORAGE_KEYS.SETTINGS);
      if (rawSettings) await syncSettingsToSupabase(JSON.parse(rawSettings));
    } catch {}

    localStorage.setItem(SUPABASE_STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    return {
      success: true,
      message: `Synced ${students.length} students, ${attendance.length} attendance records, ${marks.length} marks, and ${exams.length} examinations to Supabase Cloud.`,
    };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed pushing local data to cloud.' };
  }
}

// ==========================================
// 12. FULL PULL (SUPABASE -> LOCAL STORAGE + LIVE UI REFRESH)
// ==========================================
function writeIfChanged(storageKey: string, nextValue: any, changedKeys: string[]): void {
  if (isKeyLockedForPull(storageKey)) return;
  const serialized = JSON.stringify(nextValue);
  const existing = localStorage.getItem(storageKey);
  if (existing !== serialized) {
    localStorage.setItem(storageKey, serialized);
    changedKeys.push(storageKey);
  }
}

export async function pullAllFromSupabaseAndSyncUI(): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  if (isPulling) {
    pullPendingAgain = true;
    return [];
  }

  isPulling = true;
  const changedKeys: string[] = [];

  try {
    // Pull core tables in parallel
    const [
      profilesRes,
      classesRes,
      subjectsRes,
      studentsRes,
      attendanceRes,
      monitoringRes,
      complaintsRes,
      examsRes,
      marksRes,
      meetingsRes,
    ] = await Promise.all([
      client.from('profiles').select('*'),
      client.from('classes').select('*').order('display_order', { ascending: true }),
      client.from('subjects').select('*'),
      client.from('students').select('*').order('created_at', { ascending: true }),
      client.from('attendance').select('*'),
      client.from('daily_monitoring').select('*'),
      client.from('complaints').select('*').order('created_at', { ascending: false }),
      client.from('examinations').select('*').order('created_at', { ascending: true }),
      client.from('student_marks').select('*'),
      client.from('parent_meetings').select('*').order('created_at', { ascending: false }),
    ]);

    // 1. Profiles
    if (!profilesRes.error && profilesRes.data && profilesRes.data.length > 0) {
      const cloudProfiles: User[] = profilesRes.data.map((p: any) => {
        const assignedClasses: string[] = p.assigned_classes || [];
        const assignedSubjects = p.assigned_subjects || [];
        const selectedSubjectNames: string[] = p.selected_subject_names || [];
        const hasSubjects = selectedSubjectNames.length > 0 || assignedSubjects.length > 0;
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          password: p.password,
          designation: p.designation || 'Staff',
          phone: p.phone,
          isApproved: p.is_approved !== false,
          isActive: p.is_active !== false,
          assignedClasses,
          inChargeClass: p.role === 'class_teacher' ? assignedClasses[0] : undefined,
          isDualTeacher: p.role === 'class_teacher' && hasSubjects,
          assignedSubjects,
          selectedSubjectNames,
          registrationDate: p.created_at,
        };
      });

      const cloudEmails = new Set(cloudProfiles.map((u) => u.email.toLowerCase().trim()));
      const localUsers = readLocalArray<User>(PORTAL_STORAGE_KEYS.USERS);
      const mergedUsers = [...cloudProfiles];
      localUsers.forEach((lu) => {
        const clean = lu.email?.toLowerCase().trim();
        if (clean === 'zohaib.aim@gmail.com' && !cloudEmails.has(clean)) {
          mergedUsers.push(lu);
        }
      });
      writeIfChanged(PORTAL_STORAGE_KEYS.USERS, mergedUsers, changedKeys);
    }

    // 2. Classes (seed cloud if empty)
    if (!classesRes.error && classesRes.data) {
      if (classesRes.data.length > 0) {
        const mappedClasses: ClassGrade[] = classesRes.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          category: c.category === 'O Level' ? 'O Level' : 'Regular',
          sections: Array.isArray(c.sections) ? c.sections : ['A', 'B', 'C', 'D'],
          isActive: c.is_active !== false,
          order: c.display_order ?? 1,
        }));
        writeIfChanged(PORTAL_STORAGE_KEYS.CLASSES, mappedClasses, changedKeys);
      } else {
        const localClasses = readLocalArray<ClassGrade>(PORTAL_STORAGE_KEYS.CLASSES);
        if (localClasses.length > 0) {
          syncClassesToSupabase(localClasses).catch(() => {});
        }
      }
    }

    // 3. Subjects (seed cloud if empty)
    if (!subjectsRes.error && subjectsRes.data) {
      if (subjectsRes.data.length > 0) {
        const mappedSubjects: Subject[] = subjectsRes.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          classIds: Array.isArray(s.class_ids) ? s.class_ids : [],
        }));
        writeIfChanged(PORTAL_STORAGE_KEYS.SUBJECTS, mappedSubjects, changedKeys);
      } else {
        const localSubjects = readLocalArray<Subject>(PORTAL_STORAGE_KEYS.SUBJECTS);
        if (localSubjects.length > 0) {
          syncSubjectsToSupabase(localSubjects).catch(() => {});
        }
      }
    }

    // 4. First-time cloud seed check: if cloud students is empty AND this device already had pre-sync local students
    const hasPulledBefore = localStorage.getItem(SUPABASE_STORAGE_KEYS.PULLED_ONCE) === 'true';
    const localStudents = readLocalArray<Student>(PORTAL_STORAGE_KEYS.STUDENTS);
    if (!studentsRes.error && studentsRes.data) {
      if (studentsRes.data.length === 0 && localStudents.length > 0 && !hasPulledBefore) {
        localStorage.setItem(SUPABASE_STORAGE_KEYS.PULLED_ONCE, 'true');
        await pushAllLocalToSupabase();
      } else {
        localStorage.setItem(SUPABASE_STORAGE_KEYS.PULLED_ONCE, 'true');
        const mappedStudents = studentsRes.data.map(mapRowToStudent);
        writeIfChanged(PORTAL_STORAGE_KEYS.STUDENTS, mappedStudents, changedKeys);
      }
    }

    // 5. Attendance
    if (!attendanceRes.error && attendanceRes.data) {
      const mappedAtt: AttendanceRecord[] = attendanceRes.data.map((a: any) => ({
        id: a.id,
        studentId: a.student_id,
        studentName: a.student_name,
        rollNo: a.roll_no,
        classId: a.class_id,
        sectionId: a.section_id,
        date: a.date,
        status: a.status,
        arrivalTime: a.arrival_time || undefined,
        lateDurationMinutes: a.late_duration_minutes || 0,
        reason: a.reason || undefined,
        remarks: a.remarks || undefined,
        isVerified: a.is_verified === true,
        verifiedBy: a.verified_by || undefined,
        recordedBy: a.recorded_by || 'Staff',
        updatedAt: a.updated_at || new Date().toISOString(),
      }));
      writeIfChanged(PORTAL_STORAGE_KEYS.ATTENDANCE, mappedAtt, changedKeys);
    }

    // 6. Daily Monitoring
    if (!monitoringRes.error && monitoringRes.data) {
      const mappedMon: DailySubjectMonitoring[] = monitoringRes.data.map((m: any) => ({
        id: m.id,
        date: m.date,
        studentId: m.student_id,
        studentName: m.student_name,
        rollNo: m.roll_no,
        classId: m.class_id,
        sectionId: m.section_id,
        subjectName: m.subject_name,
        teacherId: m.teacher_id || 'staff',
        teacherName: m.teacher_name || 'Staff',
        textbookBrought: m.textbook_brought || 'Yes',
        notebookBrought: m.notebook_brought || 'Yes',
        homeworkCompleted: m.homework_completed || 'Yes',
        classworkCompleted: m.classwork_completed || 'Yes',
        assignmentCompleted: m.assignment_completed || 'Not Applicable',
        requiredMaterialBrought: m.required_material_brought || 'Yes',
        remarks: m.remarks || undefined,
        createdAt: m.created_at || new Date().toISOString(),
      }));
      writeIfChanged(PORTAL_STORAGE_KEYS.MONITORING, mappedMon, changedKeys);
    }

    // 7. Complaints
    if (!complaintsRes.error && complaintsRes.data) {
      const mappedComplaints: StudentComplaint[] = complaintsRes.data.map((c: any) => ({
        id: c.id,
        studentId: c.student_id,
        studentName: c.student_name,
        rollNo: c.roll_no,
        classId: c.class_id,
        sectionId: c.section_id,
        date: c.date,
        reportingTeacherId: c.reporting_teacher_id || 'staff',
        reportingTeacherName: c.reporting_teacher_name || 'Staff',
        subject: c.subject || undefined,
        category: c.category,
        description: c.description,
        supportingDocumentUrl: c.supporting_doc_url || undefined,
        actionTaken: c.action_taken || undefined,
        followUpRemarks: c.follow_up_remarks || undefined,
        principalRemarks: c.principal_remarks || undefined,
        followUpDate: c.follow_up_date || undefined,
        status: c.status || 'Pending',
        parentContacted: Boolean(c.parent_contacted),
        createdAt: c.created_at || new Date().toISOString(),
        updatedAt: c.updated_at || new Date().toISOString(),
      }));
      writeIfChanged(PORTAL_STORAGE_KEYS.COMPLAINTS, mappedComplaints, changedKeys);
    }

    // 8. Examinations (seed cloud defaults if empty and local has exams)
    if (!examsRes.error && examsRes.data) {
      if (examsRes.data.length === 0) {
        const localExams = readLocalArray<Examination>(PORTAL_STORAGE_KEYS.EXAMINATIONS);
        if (localExams.length > 0 && !hasPulledBefore) {
          await syncExaminationsToSupabase(localExams);
        } else {
          writeIfChanged(PORTAL_STORAGE_KEYS.EXAMINATIONS, [], changedKeys);
        }
      } else {
        const mappedExams: Examination[] = examsRes.data.map((ex: any) => {
          const subjectsList = Array.isArray(ex.subjects) ? ex.subjects : [];
          return {
            id: ex.id,
            academicYear: ex.academic_year || '2026-2027',
            classId: ex.class_id,
            sectionId: ex.section_id || 'ALL',
            name: ex.name,
            category: ex.category,
            date: ex.date,
            passingPercentage: ex.passing_percentage ?? 60,
            totalExamMarks:
              ex.total_exam_marks ?? subjectsList.reduce((sum: number, s: any) => sum + (Number(s.totalMarks) || 0), 0),
            createdBy: ex.created_by || undefined,
            subjects: subjectsList,
            createdAt: ex.created_at || new Date().toISOString(),
          };
        });
        writeIfChanged(PORTAL_STORAGE_KEYS.EXAMINATIONS, mappedExams, changedKeys);
      }
    }

    // 9. Student Marks
    if (!marksRes.error && marksRes.data) {
      const mappedMarks: StudentMarkRecord[] = marksRes.data.map((m: any) => ({
        id: m.id,
        examinationId: m.examination_id,
        studentId: m.student_id,
        studentName: m.student_name,
        rollNo: m.roll_no,
        classId: m.class_id,
        sectionId: m.section_id,
        subjectName: m.subject_name,
        totalMarks: Number(m.total_marks) || 100,
        obtainedMarks: m.obtained_marks !== null && m.obtained_marks !== undefined ? Number(m.obtained_marks) : null,
        percentage: m.percentage !== null && m.percentage !== undefined ? Number(m.percentage) : null,
        grade: m.grade || 'N/A',
        remarks: m.remarks || undefined,
        teacherId: m.teacher_id || 'staff',
        teacherName: m.teacher_name || 'Teacher',
        date: m.date,
        editHistory: Array.isArray(m.edit_history) ? m.edit_history : [],
      }));
      writeIfChanged(PORTAL_STORAGE_KEYS.MARKS, mappedMarks, changedKeys);
    }

    // 10. Parent Meetings
    if (!meetingsRes.error && meetingsRes.data) {
      const mappedMeetings: ParentMeeting[] = meetingsRes.data.map((m: any) => ({
        id: m.id,
        studentId: m.student_id,
        studentName: m.student_name,
        rollNo: m.roll_no,
        className: m.class_name,
        sectionName: m.section_name,
        parentName: m.parent_name,
        contactNumber: m.contact_number,
        meetingDate: m.meeting_date,
        meetingReason: m.meeting_reason,
        relatedAlertId: m.related_alert_id || undefined,
        teacherAttending: m.teacher_attending,
        principalRemarks: m.principal_remarks || undefined,
        parentFeedback: m.parent_feedback || '',
        agreedActionPlan: m.agreed_action_plan || '',
        followUpDate: m.follow_up_date || undefined,
        meetingStatus: m.meeting_status || 'Scheduled',
        createdAt: m.created_at || new Date().toISOString(),
      }));
      writeIfChanged(PORTAL_STORAGE_KEYS.PARENT_MEETINGS, mappedMeetings, changedKeys);
    }

    // 11. Optional Extended Tables (skip quietly if not yet created in Supabase)
    if (!missingOptionalTables.has('health_records')) {
      const hRes = await client.from('health_records').select('*');
      if (isMissingTableError(hRes.error)) {
        missingOptionalTables.add('health_records');
      } else if (!hRes.error && hRes.data) {
        const mappedHealth: HealthAndHygieneRecord[] = hRes.data.map((h: any) => ({
          id: h.id,
          studentId: h.student_id,
          date: h.date,
          nailsTrimmed: h.nails_trimmed,
          hairMaintained: h.hair_maintained,
          haircutStandard: h.haircut_standard,
          personalCleanliness: h.personal_cleanliness,
          generalHygiene: h.general_hygiene,
          remarks: h.remarks || undefined,
          teacherName: h.teacher_name,
        }));
        writeIfChanged(PORTAL_STORAGE_KEYS.HEALTH, mappedHealth, changedKeys);
      }
    }

    if (!missingOptionalTables.has('uniform_records')) {
      const uRes = await client.from('uniform_records').select('*');
      if (isMissingTableError(uRes.error)) {
        missingOptionalTables.add('uniform_records');
      } else if (!uRes.error && uRes.data) {
        const mappedUniform: UniformRecord[] = uRes.data.map((u: any) => ({
          id: u.id,
          studentId: u.student_id,
          date: u.date,
          properUniform: u.proper_uniform,
          cleanUniform: u.clean_uniform,
          properShoes: u.proper_shoes,
          properSocks: u.proper_socks,
          schoolBelt: u.school_belt,
          schoolTie: u.school_tie,
          schoolBadge: u.school_badge,
          overallAppearance: u.overall_appearance,
          remarks: u.remarks || undefined,
          teacherName: u.teacher_name,
        }));
        writeIfChanged(PORTAL_STORAGE_KEYS.UNIFORM, mappedUniform, changedKeys);
      }
    }

    if (!missingOptionalTables.has('teacher_observations')) {
      const oRes = await client.from('teacher_observations').select('*');
      if (isMissingTableError(oRes.error)) {
        missingOptionalTables.add('teacher_observations');
      } else if (!oRes.error && oRes.data) {
        const mappedObs: TeacherObservation[] = oRes.data.map((o: any) => ({
          id: o.id,
          studentId: o.student_id,
          studentName: o.student_name,
          date: o.date,
          teacherName: o.teacher_name,
          positiveRemarks: o.positive_remarks || '',
          improvementSuggestions: o.improvement_suggestions || '',
          teacherObservations: o.teacher_observations || '',
          recommendedAction: o.recommended_action || '',
          category: o.category || 'General',
        }));
        writeIfChanged(PORTAL_STORAGE_KEYS.OBSERVATIONS, mappedObs, changedKeys);
      }
    }

    if (!missingOptionalTables.has('system_settings')) {
      const sRes = await client.from('system_settings').select('*').eq('id', 'default').maybeSingle();
      if (isMissingTableError(sRes.error)) {
        missingOptionalTables.add('system_settings');
      } else if (!sRes.error && sRes.data?.data) {
        writeIfChanged(PORTAL_STORAGE_KEYS.SETTINGS, sRes.data.data, changedKeys);
      }
    }

    localStorage.setItem(SUPABASE_STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    if (changedKeys.length > 0) {
      emitCloudSyncEvent(changedKeys);
    }

    return changedKeys;
  } catch (e) {
    console.warn('Cloud pull warning:', e);
    return [];
  } finally {
    isPulling = false;
    if (pullPendingAgain) {
      pullPendingAgain = false;
      setTimeout(() => {
        pullAllFromSupabaseAndSyncUI().catch(() => {});
      }, 250);
    }
  }
}

// ==========================================
// 13. LIVE REALTIME + BACKGROUND POLLING ENGINE
// ==========================================
export function startCloudRealtimeSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const triggerDebouncedPull = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      pullAllFromSupabaseAndSyncUI().catch(() => {});
    }, 300);
  };

  // Immediate startup pull
  pullAllFromSupabaseAndSyncUI().catch(() => {});

  // Subscribe to Supabase Realtime Postgres Changes
  const client = getSupabaseClient();
  if (client) {
    try {
      if (realtimeChannel) {
        client.removeChannel(realtimeChannel).catch(() => {});
        realtimeChannel = null;
      }
      realtimeChannel = client
        .channel('gifs-portal-live-sync')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          triggerDebouncedPull();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription warning:', e);
    }
  }

  // Fallback polling every 5s when tab is active (guarantees sync even without Realtime publication SQL)
  const pollInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      pullAllFromSupabaseAndSyncUI().catch(() => {});
    }
  }, 5000);

  // Sync immediately when switching back to tab/window
  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible') {
      pullAllFromSupabaseAndSyncUI().catch(() => {});
    }
  };
  window.addEventListener('focus', handleVisibilityOrFocus);
  document.addEventListener('visibilitychange', handleVisibilityOrFocus);

  // Also sync across multiple tabs in the same browser
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key && e.key.startsWith('gifs_')) {
      emitCloudSyncEvent([e.key]);
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    clearInterval(pollInterval);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('storage', handleStorageEvent);
    if (realtimeChannel && client) {
      client.removeChannel(realtimeChannel).catch(() => {});
      realtimeChannel = null;
    }
  };
}
