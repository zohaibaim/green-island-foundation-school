import {
  Student,
  ClassGrade,
  Subject,
  User,
  AttendanceRecord,
  DailySubjectMonitoring,
  StudentComplaint,
  Examination,
  StudentMarkRecord,
  HealthAndHygieneRecord,
  UniformRecord,
  TeacherObservation,
  DailyActivity,
  ParentMeeting,
  UploadedDoc,
  SystemSettings,
  StudentAlert,
  AlertSeverity,
} from '../types';

import {
  INITIAL_SETTINGS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_USERS,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_MONITORING,
  INITIAL_COMPLAINTS,
  INITIAL_EXAMINATIONS,
  INITIAL_MARKS,
  INITIAL_HEALTH,
  INITIAL_UNIFORM,
  INITIAL_OBSERVATIONS,
  INITIAL_ACTIVITIES,
  INITIAL_PARENT_MEETINGS,
  INITIAL_DOCS,
  DEMO_USERS,
  DEMO_STUDENTS,
  DEMO_ATTENDANCE,
  DEMO_MONITORING,
  DEMO_COMPLAINTS,
  DEMO_EXAMINATIONS,
  DEMO_MARKS,
  DEMO_HEALTH,
  DEMO_UNIFORM,
  DEMO_OBSERVATIONS,
  DEMO_ACTIVITIES,
  DEMO_PARENT_MEETINGS,
  DEMO_DOCS,
} from './initialData';

const STORAGE_KEYS = {
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
  ACTIVITIES: 'gifs_activities_v2',
  PARENT_MEETINGS: 'gifs_parent_meetings_v2',
  DOCS: 'gifs_docs_v2',
};

function loadItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading storage key:', key, e);
    return defaultValue;
  }
}

function saveItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Failed saving storage key:', key, e);
  }
}

export class StorageService {
  // Settings
  static getSettings(): SystemSettings {
    return loadItem<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  static saveSettings(settings: SystemSettings): void {
    saveItem(STORAGE_KEYS.SETTINGS, settings);
  }

  // Classes
  static getClasses(): ClassGrade[] {
    return loadItem<ClassGrade[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  }

  static saveClasses(classes: ClassGrade[]): void {
    saveItem(STORAGE_KEYS.CLASSES, classes);
  }

  static addClass(cls: Omit<ClassGrade, 'id'>): ClassGrade {
    const classes = this.getClasses();
    const newClass: ClassGrade = {
      ...cls,
      id: 'cls-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    classes.push(newClass);
    this.saveClasses(classes);
    return newClass;
  }

  static updateClass(id: string, updates: Partial<ClassGrade>): ClassGrade | null {
    const classes = this.getClasses();
    const idx = classes.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    classes[idx] = { ...classes[idx], ...updates };
    this.saveClasses(classes);
    return classes[idx];
  }

  static deleteClass(id: string): boolean {
    const classes = this.getClasses();
    const filtered = classes.filter((c) => c.id !== id);
    if (filtered.length !== classes.length) {
      this.saveClasses(filtered);
      return true;
    }
    return false;
  }

  static addSectionToClass(classId: string, sectionName: string): boolean {
    const classes = this.getClasses();
    const target = classes.find((c) => c.id === classId);
    if (!target) return false;
    const cleanSection = sectionName.trim().toUpperCase().replace(/^SECTION\s+/i, '');
    if (!cleanSection || target.sections.includes(cleanSection)) return false;
    target.sections.push(cleanSection);
    target.sections.sort();
    this.saveClasses(classes);
    return true;
  }

  static removeSectionFromClass(classId: string, sectionName: string): boolean {
    const classes = this.getClasses();
    const target = classes.find((c) => c.id === classId);
    if (!target) return false;
    const cleanSection = sectionName.trim().toUpperCase().replace(/^SECTION\s+/i, '');
    target.sections = target.sections.filter((s) => s !== cleanSection);
    this.saveClasses(classes);
    return true;
  }

  // Subjects
  static getSubjects(): Subject[] {
    return loadItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
  }

  static saveSubjects(subjects: Subject[]): void {
    saveItem(STORAGE_KEYS.SUBJECTS, subjects);
  }

  static addSubject(subj: Omit<Subject, 'id'>): Subject {
    const subjects = this.getSubjects();
    const newSubj: Subject = {
      ...subj,
      id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    subjects.push(newSubj);
    this.saveSubjects(subjects);
    return newSubj;
  }

  static updateSubject(id: string, updates: Partial<Subject>): Subject | null {
    const subjects = this.getSubjects();
    const idx = subjects.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    subjects[idx] = { ...subjects[idx], ...updates };
    this.saveSubjects(subjects);
    return subjects[idx];
  }

  static deleteSubject(id: string): boolean {
    const subjects = this.getSubjects();
    const filtered = subjects.filter((s) => s.id !== id);
    if (filtered.length !== subjects.length) {
      this.saveSubjects(filtered);
      return true;
    }
    return false;
  }

  // Users
  static getUsers(): User[] {
    const users = loadItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    let changed = false;
    const mapped = users.map((u) => {
      let pwd = u.password;
      if (u.email && u.email.trim().toLowerCase() === 'zohaib.aim@gmail.com') {
        if (!pwd || pwd === 'admin123') {
          pwd = 'Malik@456';
          changed = true;
        }
      } else if (!pwd) {
        pwd = u.role === 'admin' ? 'Malik@456' : u.role === 'principal' ? 'principal123' : 'teacher123';
        changed = true;
      }
      return {
        ...u,
        password: pwd,
        isActive: u.isActive !== false,
      };
    });
    if (changed) {
      saveItem(STORAGE_KEYS.USERS, mapped);
    }
    return mapped;
  }

  static saveUsers(users: User[]): void {
    saveItem(STORAGE_KEYS.USERS, users);
  }

  static addUser(user: Omit<User, 'id'>): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: 'u-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      password: user.password || (user.role === 'admin' ? 'Malik@456' : 'teacher123'),
      isActive: user.isActive !== false,
      isApproved: true, // Created directly by Admin
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  static registerPendingUser(userData: Omit<User, 'id'>): { success: boolean; error?: string; user?: User } {
    const users = this.getUsers();
    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
    if (existing) {
      if (existing.isApproved === false) {
        return {
          success: false,
          error: 'Is email se pehle hi registration request submit ho chuki hay jo Admin approval ke lye pending hay.',
        };
      }
      return { success: false, error: 'Yeh email address pehle se registered hay. Please login karein.' };
    }

    const newUser: User = {
      ...userData,
      id: 'u-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      isActive: true,
      isApproved: false, // Must be verified and approved by School Admin
      registrationDate: new Date().toISOString(),
    };
    users.push(newUser);
    this.saveUsers(users);
    return { success: true, user: newUser };
  }

  static getPendingUsers(): User[] {
    const users = this.getUsers();
    return users.filter((u) => u.isApproved === false);
  }

  static approveUser(id: string, overrides?: Partial<User>): boolean {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    users[idx] = {
      ...users[idx],
      ...overrides,
      isApproved: true,
      isActive: true,
    };
    this.saveUsers(users);
    return true;
  }

  static rejectUser(id: string): boolean {
    return this.deleteUser(id);
  }

  static updateUser(id: string, updates: Partial<User>): User | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    this.saveUsers(users);
    return users[idx];
  }

  static updateUserPassword(id: string, newPassword: string): boolean {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    users[idx].password = newPassword;
    this.saveUsers(users);
    return true;
  }

  static deleteUser(id: string): boolean {
    const users = this.getUsers();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length !== users.length) {
      this.saveUsers(filtered);
      return true;
    }
    return false;
  }

  static authenticateUser(email: string, password: string): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'No user account found with this email address.' };
    }

    if (user.isApproved === false) {
      return {
        success: false,
        error: 'Aap ki registration request Administrator ke paas review ke lye pending hay. Jab School Administrator verify aur approve karega tab aap login kar sakenge.',
      };
    }

    if (user.isActive === false) {
      return { success: false, error: 'This account has been deactivated by the Administrator. Please contact admin.' };
    }

    const isTargetAdmin = user.email.trim().toLowerCase() === 'zohaib.aim@gmail.com';
    const expectedPassword =
      user.password ||
      (isTargetAdmin || user.role === 'admin' ? 'Malik@456' : user.role === 'principal' ? 'principal123' : 'teacher123');
    if (expectedPassword !== password) {
      return { success: false, error: 'Incorrect password. Please verify your credentials.' };
    }

    return { success: true, user };
  }

  // Students
  static getStudents(): Student[] {
    return loadItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  }

  static saveStudents(students: Student[]): void {
    saveItem(STORAGE_KEYS.STUDENTS, students);
  }

  static addStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Student {
    const students = this.getStudents();
    const newStudent: Student = {
      ...student,
      id: 'std-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    students.push(newStudent);
    this.saveStudents(students);
    return newStudent;
  }

  static updateStudent(id: string, updates: Partial<Student>): Student | null {
    const students = this.getStudents();
    const idx = students.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    students[idx] = {
      ...students[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveStudents(students);
    return students[idx];
  }

  static deleteStudent(id: string): boolean {
    const students = this.getStudents();
    const filtered = students.filter((s) => s.id !== id);
    if (filtered.length !== students.length) {
      this.saveStudents(filtered);
      return true;
    }
    return false;
  }

  // Attendance
  static getAttendance(): AttendanceRecord[] {
    return loadItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  }

  static saveAttendance(records: AttendanceRecord[]): void {
    saveItem(STORAGE_KEYS.ATTENDANCE, records);
  }

  static markAttendance(
    records: Omit<AttendanceRecord, 'id' | 'updatedAt'>[]
  ): AttendanceRecord[] {
    const current = this.getAttendance();
    const updated = [...current];

    records.forEach((rec) => {
      // Find existing record for same student and date
      const existingIdx = updated.findIndex(
        (r) => r.studentId === rec.studentId && r.date === rec.date
      );
      const recordToSave: AttendanceRecord = {
        ...rec,
        id: existingIdx !== -1 ? updated[existingIdx].id : 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        updatedAt: new Date().toISOString(),
      };
      if (existingIdx !== -1) {
        updated[existingIdx] = recordToSave;
      } else {
        updated.push(recordToSave);
      }
    });

    this.saveAttendance(updated);
    return updated;
  }

  // Daily Subject Monitoring
  static getMonitoring(): DailySubjectMonitoring[] {
    return loadItem<DailySubjectMonitoring[]>(STORAGE_KEYS.MONITORING, INITIAL_MONITORING);
  }

  static saveMonitoring(records: DailySubjectMonitoring[]): void {
    saveItem(STORAGE_KEYS.MONITORING, records);
  }

  static addMonitoring(record: Omit<DailySubjectMonitoring, 'id' | 'createdAt'>): DailySubjectMonitoring {
    const current = this.getMonitoring();
    const newRec: DailySubjectMonitoring = {
      ...record,
      id: 'mon-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
    };
    current.push(newRec);
    this.saveMonitoring(current);
    return newRec;
  }

  // Complaints
  static getComplaints(): StudentComplaint[] {
    return loadItem<StudentComplaint[]>(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
  }

  static saveComplaints(complaints: StudentComplaint[]): void {
    saveItem(STORAGE_KEYS.COMPLAINTS, complaints);
  }

  static addComplaint(complaint: Omit<StudentComplaint, 'id' | 'createdAt' | 'updatedAt'>): StudentComplaint {
    const current = this.getComplaints();
    const newComplaint: StudentComplaint = {
      ...complaint,
      id: 'cmp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    current.push(newComplaint);
    this.saveComplaints(current);
    return newComplaint;
  }

  static updateComplaint(id: string, updates: Partial<StudentComplaint>): StudentComplaint | null {
    const current = this.getComplaints();
    const idx = current.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    current[idx] = {
      ...current[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveComplaints(current);
    return current[idx];
  }

  // Examinations & Marks
  static getExaminations(): Examination[] {
    return loadItem<Examination[]>(STORAGE_KEYS.EXAMINATIONS, INITIAL_EXAMINATIONS);
  }

  static saveExaminations(exams: Examination[]): void {
    saveItem(STORAGE_KEYS.EXAMINATIONS, exams);
  }

  static addExamination(exam: Omit<Examination, 'id' | 'createdAt'>): Examination {
    const exams = this.getExaminations();
    const newExam: Examination = {
      ...exam,
      id: 'exam-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
    };
    exams.push(newExam);
    this.saveExaminations(exams);
    return newExam;
  }

  static getMarks(): StudentMarkRecord[] {
    return loadItem<StudentMarkRecord[]>(STORAGE_KEYS.MARKS, INITIAL_MARKS);
  }

  static saveMarks(marks: StudentMarkRecord[]): void {
    saveItem(STORAGE_KEYS.MARKS, marks);
  }

  static saveBulkMarks(marksRecords: Omit<StudentMarkRecord, 'id'>[]): void {
    const current = this.getMarks();
    const updated = [...current];

    marksRecords.forEach((item) => {
      const idx = updated.findIndex(
        (m) =>
          m.examinationId === item.examinationId &&
          m.studentId === item.studentId &&
          m.subjectName === item.subjectName
      );
      if (idx !== -1) {
        // Track edit history
        const prev = updated[idx];
        const editHistory = prev.editHistory || [];
        if (prev.obtainedMarks !== item.obtainedMarks) {
          editHistory.push({
            editedBy: item.teacherName,
            editedAt: new Date().toISOString(),
            previousMarks: prev.obtainedMarks,
            newMarks: item.obtainedMarks,
          });
        }
        updated[idx] = {
          ...item,
          id: prev.id,
          editHistory,
        };
      } else {
        updated.push({
          ...item,
          id: 'mrk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        });
      }
    });

    this.saveMarks(updated);
  }

  // Health and Hygiene
  static getHealthRecords(): HealthAndHygieneRecord[] {
    return loadItem<HealthAndHygieneRecord[]>(STORAGE_KEYS.HEALTH, INITIAL_HEALTH);
  }

  static saveHealthRecord(record: Omit<HealthAndHygieneRecord, 'id'>): HealthAndHygieneRecord {
    const current = this.getHealthRecords();
    const newRec: HealthAndHygieneRecord = {
      ...record,
      id: 'hlth-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    current.push(newRec);
    saveItem(STORAGE_KEYS.HEALTH, current);
    return newRec;
  }

  // Uniform
  static getUniformRecords(): UniformRecord[] {
    return loadItem<UniformRecord[]>(STORAGE_KEYS.UNIFORM, INITIAL_UNIFORM);
  }

  static saveUniformRecord(record: Omit<UniformRecord, 'id'>): UniformRecord {
    const current = this.getUniformRecords();
    const newRec: UniformRecord = {
      ...record,
      id: 'uni-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    current.push(newRec);
    saveItem(STORAGE_KEYS.UNIFORM, current);
    return newRec;
  }

  // Teacher Observations
  static getObservations(): TeacherObservation[] {
    return loadItem<TeacherObservation[]>(STORAGE_KEYS.OBSERVATIONS, INITIAL_OBSERVATIONS);
  }

  static addObservation(record: Omit<TeacherObservation, 'id'>): TeacherObservation {
    const current = this.getObservations();
    const newRec: TeacherObservation = {
      ...record,
      id: 'obs-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    current.push(newRec);
    saveItem(STORAGE_KEYS.OBSERVATIONS, current);
    return newRec;
  }

  // Activities
  static getActivities(): DailyActivity[] {
    return loadItem<DailyActivity[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
  }

  static addActivity(record: Omit<DailyActivity, 'id'>): DailyActivity {
    const current = this.getActivities();
    const newRec: DailyActivity = {
      ...record,
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    current.push(newRec);
    saveItem(STORAGE_KEYS.ACTIVITIES, current);
    return newRec;
  }

  // Parent Meetings
  static getParentMeetings(): ParentMeeting[] {
    return loadItem<ParentMeeting[]>(STORAGE_KEYS.PARENT_MEETINGS, INITIAL_PARENT_MEETINGS);
  }

  static saveParentMeetings(meetings: ParentMeeting[]): void {
    saveItem(STORAGE_KEYS.PARENT_MEETINGS, meetings);
  }

  static addParentMeeting(record: Omit<ParentMeeting, 'id' | 'createdAt'>): ParentMeeting {
    const current = this.getParentMeetings();
    const newRec: ParentMeeting = {
      ...record,
      id: 'pm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
    };
    current.push(newRec);
    this.saveParentMeetings(current);
    return newRec;
  }

  static updateParentMeeting(id: string, updates: Partial<ParentMeeting>): ParentMeeting | null {
    const current = this.getParentMeetings();
    const idx = current.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    current[idx] = { ...current[idx], ...updates };
    this.saveParentMeetings(current);
    return current[idx];
  }

  // Documents
  static getDocs(): UploadedDoc[] {
    return loadItem<UploadedDoc[]>(STORAGE_KEYS.DOCS, INITIAL_DOCS);
  }

  static addDoc(record: Omit<UploadedDoc, 'id'>): UploadedDoc {
    const current = this.getDocs();
    const newDoc: UploadedDoc = {
      ...record,
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    current.push(newDoc);
    saveItem(STORAGE_KEYS.DOCS, current);
    return newDoc;
  }

  // ==========================================
  // CENTRALIZED AUTOMATIC ALERT ENGINE
  // (Sections 9.1, 10.2, 11.1, 12.1, 13, 26)
  // ==========================================
  static computeAllStudentAlerts(): Map<string, StudentAlert[]> {
    const settings = this.getSettings();
    const students = this.getStudents();
    const marks = this.getMarks();
    const attendance = this.getAttendance();
    const monitoring = this.getMonitoring();
    const complaints = this.getComplaints();
    const parentMeetings = this.getParentMeetings();

    const lowMarksThresh = settings.lowMarksThreshold || 60;
    const missingNotebookThresh = settings.repeatedMissingNotebookThreshold || 3;
    const consecutiveAbsenceThresh = settings.consecutiveAbsenceThreshold || 2;
    const complaintThresh = settings.repeatedComplaintThreshold || 3;

    const alertsMap = new Map<string, StudentAlert[]>();

    students.forEach((student) => {
      const studentAlerts: StudentAlert[] = [];

      // 1. ACADEMIC LOW MARKS (<60%) ALERT (RED ALERT)
      const studentMarks = marks.filter((m) => m.studentId === student.id);
      studentMarks.forEach((m) => {
        if (m.obtainedMarks !== null && m.percentage !== null && m.percentage < lowMarksThresh) {
          const relatedMeeting = parentMeetings.find((pm) => pm.studentId === student.id);
          studentAlerts.push({
            id: `alert-marks-${m.id}`,
            studentId: student.id,
            studentName: student.name,
            rollNo: student.rollNo,
            className: student.className,
            sectionName: student.sectionName,
            parentContact: student.parentContact,
            severity: 'RED',
            category: 'Low Marks (<60%)',
            title: `Low Marks in ${m.subjectName} (${m.percentage}%)`,
            description: `Obtained ${m.obtainedMarks}/${m.totalMarks} (${m.percentage}%) in ${m.subjectName}. Below school threshold of ${lowMarksThresh}%. Immediate academic support recommended.`,
            triggerDate: m.date,
            relatedSubject: m.subjectName,
            status: relatedMeeting ? 'Meeting Scheduled' : 'Active',
            parentContacted: Boolean(relatedMeeting),
            parentMeetingDate: relatedMeeting?.meetingDate,
            responsibleTeacher: m.teacherName || 'Subject Teacher',
          });
        }
      });

      // 2. CONSECUTIVE ABSENCE ALERT (ORANGE ALERT)
      // Filter student attendance, sort descending by date
      const studentAtt = attendance
        .filter((a) => a.studentId === student.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let consecutiveUnexplainedAbsences = 0;
      let firstAbsendDate = '';
      for (const rec of studentAtt) {
        if (rec.status === 'Absent') {
          consecutiveUnexplainedAbsences++;
          firstAbsendDate = rec.date;
        } else if (rec.status === 'Present' || rec.status === 'Late' || rec.status === 'Half Day') {
          // Break on attended days
          break;
        }
        // If leave, don't count as unexplained, but don't penalize as consecutive unexcused
      }

      if (consecutiveUnexplainedAbsences >= consecutiveAbsenceThresh) {
        studentAlerts.push({
          id: `alert-att-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          rollNo: student.rollNo,
          className: student.className,
          sectionName: student.sectionName,
          parentContact: student.parentContact,
          severity: 'ORANGE',
          category: 'Consecutive Absence',
          title: `Consecutive Absence (${consecutiveUnexplainedAbsences} Days)`,
          description: `Absent for ${consecutiveUnexplainedAbsences} consecutive working days starting from ${firstAbsendDate}. Urgent parent contact required.`,
          triggerDate: firstAbsendDate || new Date().toISOString().split('T')[0],
          relatedCount: consecutiveUnexplainedAbsences,
          status: 'Active',
          parentContacted: false,
          responsibleTeacher: 'Class Teacher',
        });
      }

      // 3. REPEATED MISSING NOTEBOOK OR BOOK ALERT (ORANGE ALERT)
      // Group by subject and check weekly count of missing notebook/book
      const studentMon = monitoring.filter((m) => m.studentId === student.id);
      const subjectNotebookCounts: Record<string, { count: number; dates: string[]; teacher: string }> = {};
      const subjectBookCounts: Record<string, { count: number; dates: string[]; teacher: string }> = {};

      studentMon.forEach((item) => {
        // Missing notebook
        if (item.notebookBrought === 'No') {
          if (!subjectNotebookCounts[item.subjectName]) {
            subjectNotebookCounts[item.subjectName] = { count: 0, dates: [], teacher: item.teacherName };
          }
          subjectNotebookCounts[item.subjectName].count++;
          subjectNotebookCounts[item.subjectName].dates.push(item.date);
        }
        // Missing textbook
        if (item.textbookBrought === 'No') {
          if (!subjectBookCounts[item.subjectName]) {
            subjectBookCounts[item.subjectName] = { count: 0, dates: [], teacher: item.teacherName };
          }
          subjectBookCounts[item.subjectName].count++;
          subjectBookCounts[item.subjectName].dates.push(item.date);
        }
      });

      // Notebook check
      Object.entries(subjectNotebookCounts).forEach(([subj, data]) => {
        if (data.count >= missingNotebookThresh) {
          studentAlerts.push({
            id: `alert-nb-${student.id}-${subj}`,
            studentId: student.id,
            studentName: student.name,
            rollNo: student.rollNo,
            className: student.className,
            sectionName: student.sectionName,
            parentContact: student.parentContact,
            severity: 'ORANGE',
            category: 'Repeated Missing Notebook',
            title: `Repeated Missing Notebook: ${subj} (${data.count}x)`,
            description: `Failed to bring required ${subj} notebook ${data.count} times this school period (Dates: ${data.dates.join(', ')}). Parent attention required.`,
            triggerDate: data.dates[data.dates.length - 1],
            relatedSubject: subj,
            relatedCount: data.count,
            status: 'Active',
            parentContacted: false,
            responsibleTeacher: data.teacher,
          });
        }
      });

      // Textbook check
      Object.entries(subjectBookCounts).forEach(([subj, data]) => {
        if (data.count >= missingNotebookThresh) {
          studentAlerts.push({
            id: `alert-bk-${student.id}-${subj}`,
            studentId: student.id,
            studentName: student.name,
            rollNo: student.rollNo,
            className: student.className,
            sectionName: student.sectionName,
            parentContact: student.parentContact,
            severity: 'ORANGE',
            category: 'Repeated Missing Textbook',
            title: `Repeated Missing Textbook: ${subj} (${data.count}x)`,
            description: `Failed to bring compulsory ${subj} textbook ${data.count} times. Parent follow-up advised.`,
            triggerDate: data.dates[data.dates.length - 1],
            relatedSubject: subj,
            relatedCount: data.count,
            status: 'Active',
            parentContacted: false,
            responsibleTeacher: data.teacher,
          });
        }
      });

      // 4. REPEATED COMPLAINTS IN SAME CATEGORY (RED ALERT)
      const studentComps = complaints.filter((c) => c.studentId === student.id);
      const categoryCounts: Record<string, { count: number; complaints: StudentComplaint[] }> = {};

      studentComps.forEach((c) => {
        if (!categoryCounts[c.category]) {
          categoryCounts[c.category] = { count: 0, complaints: [] };
        }
        categoryCounts[c.category].count++;
        categoryCounts[c.category].complaints.push(c);
      });

      Object.entries(categoryCounts).forEach(([category, data]) => {
        if (data.count >= complaintThresh) {
          const dates = data.complaints.map((c) => c.date).join(', ');
          studentAlerts.push({
            id: `alert-cmp-${student.id}-${category}`,
            studentId: student.id,
            studentName: student.name,
            rollNo: student.rollNo,
            className: student.className,
            sectionName: student.sectionName,
            parentContact: student.parentContact,
            severity: 'RED',
            category: 'Repeated Complaints',
            title: `3 Repeated Complaints: ${category}`,
            description: `Accumulated ${data.count} disciplinary complaints in "${category}" (Logged dates: ${dates}). Formal parent meeting recommended.`,
            triggerDate: data.complaints[data.complaints.length - 1].date,
            relatedCount: data.count,
            status: 'Active',
            parentContacted: data.complaints.some((c) => c.parentContacted),
            responsibleTeacher: data.complaints[data.complaints.length - 1].reportingTeacherName,
          });
        }
      });

      alertsMap.set(student.id, studentAlerts);
    });

    return alertsMap;
  }

  // Get active alerts for specific student
  static getStudentAlerts(studentId: string): StudentAlert[] {
    const alertsMap = this.computeAllStudentAlerts();
    return alertsMap.get(studentId) || [];
  }

  // Get student overall severity
  static getStudentStatus(studentId: string): { status: AlertSeverity; activeAlerts: StudentAlert[] } {
    const alerts = this.getStudentAlerts(studentId);
    if (alerts.some((a) => a.severity === 'RED')) {
      return { status: 'RED', activeAlerts: alerts };
    }
    if (alerts.some((a) => a.severity === 'ORANGE')) {
      return { status: 'ORANGE', activeAlerts: alerts };
    }
    return { status: 'GREEN', activeAlerts: alerts };
  }

  // Get all students requiring parent contact across the school
  static getStudentsRequiringParentContact(): {
    student: Student;
    alerts: StudentAlert[];
    highestSeverity: AlertSeverity;
    parentMeeting?: ParentMeeting;
  }[] {
    const students = this.getStudents();
    const alertsMap = this.computeAllStudentAlerts();
    const meetings = this.getParentMeetings();

    const list: {
      student: Student;
      alerts: StudentAlert[];
      highestSeverity: AlertSeverity;
      parentMeeting?: ParentMeeting;
    }[] = [];

    students.forEach((s) => {
      const studentAlerts = alertsMap.get(s.id) || [];
      if (studentAlerts.length > 0) {
        const hasRed = studentAlerts.some((a) => a.severity === 'RED');
        const hasOrange = studentAlerts.some((a) => a.severity === 'ORANGE');
        const highestSeverity: AlertSeverity = hasRed ? 'RED' : hasOrange ? 'ORANGE' : 'GREEN';
        const meeting = meetings.find((m) => m.studentId === s.id);

        list.push({
          student: s,
          alerts: studentAlerts,
          highestSeverity,
          parentMeeting: meeting,
        });
      }
    });

    // Sort Red first, then Orange
    return list.sort((a, b) => {
      if (a.highestSeverity === 'RED' && b.highestSeverity !== 'RED') return -1;
      if (b.highestSeverity === 'RED' && a.highestSeverity !== 'RED') return 1;
      return a.student.name.localeCompare(b.student.name);
    });
  }

  // Reset database to initial blank dataset
  static resetToDefault(): void {
    saveItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    saveItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    saveItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    saveItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    saveItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    saveItem(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    saveItem(STORAGE_KEYS.MONITORING, INITIAL_MONITORING);
    saveItem(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
    saveItem(STORAGE_KEYS.EXAMINATIONS, INITIAL_EXAMINATIONS);
    saveItem(STORAGE_KEYS.MARKS, INITIAL_MARKS);
    saveItem(STORAGE_KEYS.HEALTH, INITIAL_HEALTH);
    saveItem(STORAGE_KEYS.UNIFORM, INITIAL_UNIFORM);
    saveItem(STORAGE_KEYS.OBSERVATIONS, INITIAL_OBSERVATIONS);
    saveItem(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    saveItem(STORAGE_KEYS.PARENT_MEETINGS, INITIAL_PARENT_MEETINGS);
    saveItem(STORAGE_KEYS.DOCS, INITIAL_DOCS);
    localStorage.setItem('gifs_active_user_id', INITIAL_USERS[0].id);
  }

  // Completely wipe to blank database with custom admin email/name
  static wipeDatabaseToCleanState(adminName?: string, adminEmail?: string, adminPassword?: string): void {
    const cleanAdmin: User = {
      id: 'u-admin',
      name: adminName || 'Zohaib (Administrator)',
      email: (adminEmail || 'zohaib.aim@gmail.com').toLowerCase(),
      role: 'admin',
      phone: '',
      designation: 'Super Administrator & School Head',
      password: adminPassword || 'Malik@456',
      isActive: true,
      isApproved: true,
    };

    saveItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    saveItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    saveItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    saveItem(STORAGE_KEYS.USERS, [cleanAdmin]);
    saveItem(STORAGE_KEYS.STUDENTS, []);
    saveItem(STORAGE_KEYS.ATTENDANCE, []);
    saveItem(STORAGE_KEYS.MONITORING, []);
    saveItem(STORAGE_KEYS.COMPLAINTS, []);
    saveItem(STORAGE_KEYS.EXAMINATIONS, []);
    saveItem(STORAGE_KEYS.MARKS, []);
    saveItem(STORAGE_KEYS.HEALTH, []);
    saveItem(STORAGE_KEYS.UNIFORM, []);
    saveItem(STORAGE_KEYS.OBSERVATIONS, []);
    saveItem(STORAGE_KEYS.ACTIVITIES, []);
    saveItem(STORAGE_KEYS.PARENT_MEETINGS, []);
    saveItem(STORAGE_KEYS.DOCS, []);
    localStorage.setItem('gifs_active_user_id', cleanAdmin.id);
  }

  // Load complete pre-configured demonstration dataset
  static loadSampleDemoData(): void {
    saveItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    saveItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    saveItem(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    saveItem(STORAGE_KEYS.USERS, DEMO_USERS);
    saveItem(STORAGE_KEYS.STUDENTS, DEMO_STUDENTS);
    saveItem(STORAGE_KEYS.ATTENDANCE, DEMO_ATTENDANCE);
    saveItem(STORAGE_KEYS.MONITORING, DEMO_MONITORING);
    saveItem(STORAGE_KEYS.COMPLAINTS, DEMO_COMPLAINTS);
    saveItem(STORAGE_KEYS.EXAMINATIONS, DEMO_EXAMINATIONS);
    saveItem(STORAGE_KEYS.MARKS, DEMO_MARKS);
    saveItem(STORAGE_KEYS.HEALTH, DEMO_HEALTH);
    saveItem(STORAGE_KEYS.UNIFORM, DEMO_UNIFORM);
    saveItem(STORAGE_KEYS.OBSERVATIONS, DEMO_OBSERVATIONS);
    saveItem(STORAGE_KEYS.ACTIVITIES, DEMO_ACTIVITIES);
    saveItem(STORAGE_KEYS.PARENT_MEETINGS, DEMO_PARENT_MEETINGS);
    saveItem(STORAGE_KEYS.DOCS, DEMO_DOCS);
    localStorage.setItem('gifs_active_user_id', DEMO_USERS[0].id);
  }

  // Master Database Backup (JSON Export)
  static exportDatabaseJSON(): string {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      school: this.getSettings().schoolName,
      data: {
        settings: this.getSettings(),
        classes: this.getClasses(),
        subjects: this.getSubjects(),
        users: this.getUsers(),
        students: this.getStudents(),
        attendance: this.getAttendance(),
        monitoring: this.getMonitoring(),
        complaints: this.getComplaints(),
        examinations: this.getExaminations(),
        marks: this.getMarks(),
        health: this.getHealthRecords(),
        uniform: this.getUniformRecords(),
        observations: this.getObservations(),
        activities: this.getActivities(),
        parentMeetings: this.getParentMeetings(),
        docs: this.getDocs(),
      },
    };
    return JSON.stringify(backupData, null, 2);
  }

  // Master Database Restore (JSON Import)
  static importDatabaseJSON(jsonStr: string): { success: boolean; message: string; counts?: Record<string, number> } {
    try {
      const parsed = JSON.parse(jsonStr);
      const data = parsed.data || parsed;
      if (!data.classes || !data.students) {
        return { success: false, message: 'Invalid backup file format: Missing core classes or students tables.' };
      }

      if (data.settings) saveItem(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.classes) saveItem(STORAGE_KEYS.CLASSES, data.classes);
      if (data.subjects) saveItem(STORAGE_KEYS.SUBJECTS, data.subjects);
      if (data.users) saveItem(STORAGE_KEYS.USERS, data.users);
      if (data.students) saveItem(STORAGE_KEYS.STUDENTS, data.students);
      if (data.attendance) saveItem(STORAGE_KEYS.ATTENDANCE, data.attendance);
      if (data.monitoring) saveItem(STORAGE_KEYS.MONITORING, data.monitoring);
      if (data.complaints) saveItem(STORAGE_KEYS.COMPLAINTS, data.complaints);
      if (data.examinations) saveItem(STORAGE_KEYS.EXAMINATIONS, data.examinations);
      if (data.marks) saveItem(STORAGE_KEYS.MARKS, data.marks);
      if (data.health) saveItem(STORAGE_KEYS.HEALTH, data.health);
      if (data.uniform) saveItem(STORAGE_KEYS.UNIFORM, data.uniform);
      if (data.observations) saveItem(STORAGE_KEYS.OBSERVATIONS, data.observations);
      if (data.activities) saveItem(STORAGE_KEYS.ACTIVITIES, data.activities);
      if (data.parentMeetings) saveItem(STORAGE_KEYS.PARENT_MEETINGS, data.parentMeetings);
      if (data.docs) saveItem(STORAGE_KEYS.DOCS, data.docs);

      return {
        success: true,
        message: 'Master database successfully restored!',
        counts: {
          students: data.students?.length || 0,
          classes: data.classes?.length || 0,
          subjects: data.subjects?.length || 0,
          teachers: data.users?.length || 0,
          attendance: data.attendance?.length || 0,
          marks: data.marks?.length || 0,
          complaints: data.complaints?.length || 0,
        },
      };
    } catch (e: any) {
      return { success: false, message: 'JSON Parse Error: ' + (e?.message || 'Invalid file format') };
    }
  }

  // Trigger JSON file download
  static downloadDatabaseBackupFile(): void {
    const jsonStr = this.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GIFS_Master_Database_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Generate full Supabase / PostgreSQL schema script (Section 25 & 29)
  static generateSupabaseSchemaSQL(): string {
    return `-- ==============================================================================
-- GREEN ISLAND FOUNDATION SCHOOL
-- Student Portfolio, Academic Records & Daily Monitoring Management System
-- Production PostgreSQL Database Schema & Supabase Setup Script
-- Generated for Green Island Foundation School
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SYSTEM ROLES ENUM
CREATE TYPE app_role AS ENUM ('admin', 'principal', 'class_teacher', 'subject_teacher', 'general_user');
CREATE TYPE student_status_enum AS ENUM ('Active', 'Inactive', 'Transferred', 'Graduated');
CREATE TYPE attendance_status_enum AS ENUM ('Present', 'Absent', 'Late', 'Leave', 'Half Day');
CREATE TYPE tristate_enum AS ENUM ('Yes', 'No', 'Not Applicable');
CREATE TYPE hygiene_status_enum AS ENUM ('Satisfactory', 'Needs Improvement', 'Not Applicable');

-- 3. PROFILES / USERS TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role app_role NOT NULL DEFAULT 'general_user',
  phone TEXT,
  designation TEXT NOT NULL,
  assigned_classes JSONB DEFAULT '[]'::jsonb,
  assigned_subjects JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLASSES & SECTIONS
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Regular', 'O Level')),
  sections JSONB NOT NULL DEFAULT '["A", "B", "C", "D"]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 1
);

-- 5. SUBJECTS
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  class_ids JSONB DEFAULT '[]'::jsonb
);

-- 6. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  admission_no TEXT NOT NULL UNIQUE,
  roll_no TEXT NOT NULL,
  name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  mother_name TEXT,
  guardian_name TEXT,
  dob DATE NOT NULL,
  gender TEXT NOT NULL,
  admission_date DATE NOT NULL,
  academic_year TEXT NOT NULL,
  class_id TEXT REFERENCES public.classes(id),
  section_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  section_name TEXT NOT NULL,
  previous_school TEXT,
  parent_contact TEXT NOT NULL,
  alternative_contact TEXT,
  emergency_contact TEXT,
  address TEXT NOT NULL,
  medical_info TEXT,
  special_educational_needs TEXT,
  remarks TEXT,
  status student_status_enum DEFAULT 'Active',
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  class_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  date DATE NOT NULL,
  status attendance_status_enum NOT NULL DEFAULT 'Present',
  arrival_time TEXT,
  late_duration_minutes INT,
  reason TEXT,
  remarks TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  recorded_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, date)
);

-- 8. DAILY SUBJECT MONITORING (BOOKS, NOTEBOOKS, WORK)
CREATE TABLE IF NOT EXISTS public.daily_monitoring (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  class_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  textbook_brought tristate_enum DEFAULT 'Yes',
  notebook_brought tristate_enum DEFAULT 'Yes',
  homework_completed tristate_enum DEFAULT 'Yes',
  classwork_completed tristate_enum DEFAULT 'Yes',
  assignment_completed tristate_enum DEFAULT 'Not Applicable',
  required_material_brought tristate_enum DEFAULT 'Yes',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. STUDENT COMPLAINTS & DISCIPLINE
CREATE TABLE IF NOT EXISTS public.complaints (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  class_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  date DATE NOT NULL,
  reporting_teacher_id TEXT NOT NULL,
  reporting_teacher_name TEXT NOT NULL,
  subject TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  supporting_doc_url TEXT,
  action_taken TEXT,
  follow_up_remarks TEXT,
  principal_remarks TEXT,
  follow_up_date DATE,
  status TEXT DEFAULT 'Pending',
  parent_contacted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. EXAMINATIONS
CREATE TABLE IF NOT EXISTS public.examinations (
  id TEXT PRIMARY KEY,
  academic_year TEXT NOT NULL,
  class_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. STUDENT MARKS
CREATE TABLE IF NOT EXISTS public.student_marks (
  id TEXT PRIMARY KEY,
  examination_id TEXT REFERENCES public.examinations(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  class_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  total_marks NUMERIC NOT NULL,
  obtained_marks NUMERIC,
  percentage NUMERIC,
  grade TEXT,
  remarks TEXT,
  teacher_id TEXT,
  teacher_name TEXT,
  date DATE NOT NULL,
  edit_history JSONB DEFAULT '[]'::jsonb,
  UNIQUE (examination_id, student_id, subject_name)
);

-- 12. PARENT MEETINGS & COMMUNICATION
CREATE TABLE IF NOT EXISTS public.parent_meetings (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  class_name TEXT NOT NULL,
  section_name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_reason TEXT NOT NULL,
  related_alert_id TEXT,
  teacher_attending TEXT NOT NULL,
  principal_remarks TEXT,
  parent_feedback TEXT,
  agreed_action_plan TEXT,
  follow_up_date DATE,
  meeting_status TEXT DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_meetings ENABLE ROW LEVEL SECURITY;

-- Admins and Principals have unrestricted read/write access:
CREATE POLICY "Admin full access" ON public.students
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'principal'))
  );

-- Teachers can view students in assigned classes:
CREATE POLICY "Teacher access students" ON public.students
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('class_teacher', 'subject_teacher', 'general_user'))
  );

-- 14. AUTOMATIC LOW MARKS & CONSECUTIVE ABSENCE ALERT VIEWS
CREATE OR REPLACE VIEW public.students_requiring_attention AS
SELECT
  s.id AS student_id,
  s.name,
  s.roll_no,
  s.class_name,
  s.section_name,
  s.parent_contact,
  sm.subject_name,
  sm.percentage,
  'RED' AS severity,
  'Low Marks (<60%)' AS alert_category
FROM public.student_marks sm
JOIN public.students s ON s.id = sm.student_id
WHERE sm.percentage < 60;
`;
  }
}
