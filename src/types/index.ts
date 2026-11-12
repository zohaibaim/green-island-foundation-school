export type UserRole = 'admin' | 'principal' | 'class_teacher' | 'subject_teacher' | 'general_user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  designation: string;
  password?: string; // Set by user during signup or managed by Admin
  isActive?: boolean; // Set by Admin (default true)
  isApproved?: boolean; // true if approved by Admin, false if pending signup request
  registrationDate?: string;
  assignedClasses?: string[]; // e.g., ["Class IX-A", "Class X-B"]
  assignedSubjects?: { classId?: string; sectionId?: string; subjectName: string }[];
  selectedSubjectNames?: string[]; // Multiple subjects taught by subject teacher
  avatarUrl?: string;
}

export type StudentStatus = 'Active' | 'Inactive' | 'Transferred' | 'Graduated';

export interface Student {
  id: string;
  admissionNo: string;
  rollNo: string;
  name: string;
  fatherName: string;
  motherName?: string;
  guardianName?: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  admissionDate: string;
  academicYear: string;
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  previousSchool?: string;
  parentContact: string;
  alternativeContact?: string;
  emergencyContact?: string;
  address: string;
  medicalInfo?: string;
  specialEducationalNeeds?: string;
  remarks?: string;
  status: StudentStatus;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassGrade {
  id: string;
  name: string;
  category: 'Regular' | 'O Level';
  sections: string[]; // ['A', 'B', 'C', 'D']
  isActive: boolean;
  order: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  classIds: string[];
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave' | 'Half Day';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  sectionId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  arrivalTime?: string;
  lateDurationMinutes?: number;
  reason?: string;
  remarks?: string;
  isVerified: boolean;
  verifiedBy?: string;
  recordedBy: string;
  updatedAt: string;
}

export type TriState = 'Yes' | 'No' | 'Not Applicable';

export interface DailySubjectMonitoring {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  sectionId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  textbookBrought: TriState;
  notebookBrought: TriState;
  homeworkCompleted: TriState;
  classworkCompleted: TriState;
  assignmentCompleted: TriState;
  requiredMaterialBrought: TriState;
  remarks?: string;
  createdAt: string;
}

export type ComplaintCategory =
  | 'Misbehaviour'
  | 'Fighting'
  | 'Bullying'
  | 'Disrespectful behaviour'
  | 'Classroom disturbance'
  | 'Homework not completed'
  | 'Notebook not brought'
  | 'Textbook not brought'
  | 'Uniform violation'
  | 'Late coming'
  | 'Mobile phone misuse'
  | 'Inappropriate language'
  | 'Academic negligence'
  | 'Other complaints';

export type ComplaintStatus = 'Pending' | 'Under Review' | 'Resolved' | 'Parent Contacted';

export interface StudentComplaint {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  sectionId: string;
  date: string; // YYYY-MM-DD
  reportingTeacherId: string;
  reportingTeacherName: string;
  subject?: string;
  category: ComplaintCategory;
  description: string;
  supportingDocumentUrl?: string;
  actionTaken?: string;
  followUpRemarks?: string;
  principalRemarks?: string;
  followUpDate?: string;
  status: ComplaintStatus;
  parentContacted: boolean;
  parentMeetingScheduled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExaminationCategory =
  | '1st Monthly Test'
  | 'Mid-Term Examination'
  | '2nd Monthly Test'
  | 'Final Term Examination'
  | 'Monthly Tests'
  | 'Weekly Tests'
  | 'First Term Examination'
  | 'Second Term Examination'
  | 'Annual Examination'
  | 'Class Assessments'
  | 'Subject Assignments'
  | 'Custom Examinations';

export interface Examination {
  id: string;
  academicYear: string;
  classId: string;
  sectionId: string;
  name: string;
  category: ExaminationCategory;
  date: string;
  subjects: {
    subjectName: string;
    totalMarks: number;
    passMarks: number;
    teacherName: string;
  }[];
  createdAt: string;
}

export interface StudentMarkRecord {
  id: string;
  examinationId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  sectionId: string;
  subjectName: string;
  totalMarks: number;
  obtainedMarks: number | null; // null if unrecorded/exempt
  percentage: number | null;
  grade: string;
  remarks?: string;
  teacherId: string;
  teacherName: string;
  date: string;
  editHistory?: {
    editedBy: string;
    editedAt: string;
    previousMarks: number | null;
    newMarks: number | null;
  }[];
}

export type AlertSeverity = 'RED' | 'ORANGE' | 'GREEN';

export type AlertCategory =
  | 'Low Marks (<60%)'
  | 'Consecutive Absence'
  | 'Repeated Missing Notebook'
  | 'Repeated Missing Textbook'
  | 'Repeated Complaints'
  | 'Hygiene/Uniform Concern'
  | 'General Attention';

export interface StudentAlert {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  sectionName: string;
  parentContact: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  triggerDate: string;
  relatedSubject?: string;
  relatedCount?: number;
  status: 'Active' | 'Under Review' | 'Parent Contacted' | 'Meeting Scheduled' | 'Resolved';
  parentContacted: boolean;
  parentMeetingDate?: string;
  parentFeedback?: string;
  actionPlan?: string;
  followUpDate?: string;
  responsibleTeacher: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type HygieneStatus = 'Satisfactory' | 'Needs Improvement' | 'Not Applicable';

export interface HealthAndHygieneRecord {
  id: string;
  studentId: string;
  date: string;
  nailsTrimmed: HygieneStatus;
  hairMaintained: HygieneStatus;
  haircutStandard: HygieneStatus;
  personalCleanliness: HygieneStatus;
  generalHygiene: HygieneStatus;
  remarks?: string;
  teacherName: string;
}

export interface UniformRecord {
  id: string;
  studentId: string;
  date: string;
  properUniform: HygieneStatus;
  cleanUniform: HygieneStatus;
  properShoes: HygieneStatus;
  properSocks: HygieneStatus;
  schoolBelt: HygieneStatus;
  schoolTie: HygieneStatus;
  schoolBadge: HygieneStatus;
  overallAppearance: HygieneStatus;
  remarks?: string;
  teacherName: string;
}

export interface TeacherObservation {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  teacherName: string;
  positiveRemarks: string;
  improvementSuggestions: string;
  teacherObservations: string;
  recommendedAction: string;
  category?: 'Academic' | 'Behavioural' | 'Social' | 'Leadership' | 'General';
}

export interface DailyActivity {
  id: string;
  studentId: string;
  date: string;
  activityType:
    | 'Attendance'
    | 'Books & Copies'
    | 'Classwork'
    | 'Homework'
    | 'Tests & Quizzes'
    | 'Classroom Participation'
    | 'Discipline'
    | 'Health & Hygiene'
    | 'Uniform'
    | 'Sports'
    | 'Co-curricular'
    | 'Library'
    | 'Special Achievement'
    | 'Teacher Observation';
  title: string;
  description: string;
  recordedBy: string;
}

export interface ParentMeeting {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  sectionName: string;
  parentName: string;
  contactNumber: string;
  meetingDate: string;
  meetingReason: string;
  relatedAlertId?: string;
  teacherAttending: string;
  principalRemarks?: string;
  parentFeedback: string;
  agreedActionPlan: string;
  followUpDate?: string;
  meetingStatus: 'Scheduled' | 'Completed' | 'Follow-up Needed' | 'Cancelled';
  createdAt: string;
}

export interface UploadedDoc {
  id: string;
  studentId: string;
  title: string;
  category: 'PDF File' | 'Word Document' | 'Excel File' | 'Student Photo' | 'Certificate' | 'Assignment' | 'Examination Result' | 'Supporting Image';
  academicYear: string;
  className: string;
  sectionName: string;
  subjectName?: string;
  fileName: string;
  fileSize: string;
  fileData?: string; // base64 or placeholder
  uploadedBy: string;
  uploadDate: string;
}

export interface SystemSettings {
  schoolName: string;
  schoolSubtitle: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  academicYear: string;
  lowMarksThreshold: number; // default 60
  repeatedComplaintThreshold: number; // default 3
  repeatedMissingNotebookThreshold: number; // default 3
  consecutiveAbsenceThreshold: number; // default 2
  workingDays: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday')[];
  gradingScale: {
    grade: string;
    minPercentage: number;
    maxPercentage: number;
    label: string;
  }[];
}
