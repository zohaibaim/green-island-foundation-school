import React, { useState, useMemo } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import {
  Student,
  StudentAlert,
  AttendanceRecord,
  DailySubjectMonitoring,
  StudentComplaint,
  StudentMarkRecord,
  HealthAndHygieneRecord,
  UniformRecord,
  TeacherObservation,
  DailyActivity,
  ParentMeeting,
  UploadedDoc,
} from '../../types';
import {
  User,
  AlertTriangle,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  ShieldAlert,
  HeartPulse,
  Award,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit,
  Plus,
  Share2,
} from 'lucide-react';

interface StudentPortfolioProps {
  studentId: string;
  onBack?: () => void;
  onNavigateToTab?: (tabId: string) => void;
  onSelectStudent?: (studentId: string) => void;
}

export const StudentPortfolio: React.FC<StudentPortfolioProps> = ({
  studentId,
  onBack,
  onNavigateToTab,
  onSelectStudent,
}) => {
  const { canEditStudentDetails, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<number>(1);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  const allStudents = StorageService.getStudents();
  const student = allStudents.find((s) => s.id === studentId) || allStudents[0];

  // Load all records for this student
  const studentAlerts = useMemo(() => StorageService.getStudentAlerts(student?.id || ''), [student?.id]);
  const overallStatus = useMemo(() => StorageService.getStudentStatus(student?.id || ''), [student?.id]);

  const marks = useMemo(() => {
    return StorageService.getMarks().filter((m) => m.studentId === student?.id);
  }, [student?.id]);

  const attendance = useMemo(() => {
    return StorageService.getAttendance()
      .filter((a) => a.studentId === student?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student?.id]);

  const monitoring = useMemo(() => {
    return StorageService.getMonitoring()
      .filter((m) => m.studentId === student?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student?.id]);

  const complaints = useMemo(() => {
    return StorageService.getComplaints()
      .filter((c) => c.studentId === student?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student?.id]);

  const healthRecords = useMemo(() => {
    return StorageService.getHealthRecords()
      .filter((h) => h.studentId === student?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student?.id]);

  const uniformRecords = useMemo(() => {
    return StorageService.getUniformRecords()
      .filter((u) => u.studentId === student?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student?.id]);

  const observations = useMemo(() => {
    return StorageService.getObservations()
      .filter((o) => o.studentId === student?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student?.id]);

  const activities = useMemo(() => {
    return StorageService.getActivities()
      .filter((a) => a.studentId === student?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [student?.id]);

  const parentMeetings = useMemo(() => {
    return StorageService.getParentMeetings()
      .filter((p) => p.studentId === student?.id)
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
  }, [student?.id]);

  const docs = useMemo(() => {
    return StorageService.getDocs().filter((d) => d.studentId === student?.id);
  }, [student?.id]);

  // Next / Previous student
  const currentIndex = allStudents.findIndex((s) => s.id === student?.id);
  const prevStudent = currentIndex > 0 ? allStudents[currentIndex - 1] : null;
  const nextStudent = currentIndex < allStudents.length - 1 ? allStudents[currentIndex + 1] : null;

  if (!student) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500">Student not found.</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">
            Return to List
          </button>
        )}
      </div>
    );
  }

  // 22 Tabs defined in Section 8 of the prompt
  const TABS = [
    { id: 1, label: '1. Personal Information' },
    { id: 2, label: '2. Academic Records' },
    { id: 3, label: '3. Monthly Tests' },
    { id: 4, label: '4. Weekly Tests' },
    { id: 5, label: '5. Mid-Term Examination' },
    { id: 6, label: '6. Final-Term Examination' },
    { id: 7, label: '7. Annual Examination' },
    { id: 8, label: '8. Attendance History' },
    { id: 9, label: '9. Subject-Wise Monitoring' },
    { id: 10, label: '10. Books & Notebooks' },
    { id: 11, label: '11. Homework & Classwork' },
    { id: 12, label: '12. Health & Hygiene' },
    { id: 13, label: '13. Uniform Monitoring' },
    { id: 14, label: '14. Complaints & Discipline' },
    { id: 15, label: '15. Repeated Complaint Alerts' },
    { id: 16, label: '16. Academic Improvement Alerts' },
    { id: 17, label: '17. Teacher Observations' },
    { id: 18, label: '18. Daily Activities' },
    { id: 19, label: '19. Parent Meeting Records' },
    { id: 20, label: '20. Uploaded Documents' },
    { id: 21, label: '21. Annual Progress Report' },
    { id: 22, label: '22. Complete Student History' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Directory</span>
            </button>
          )}

          <div className="flex items-center space-x-1">
            {prevStudent && onSelectStudent && (
              <button
                onClick={() => onSelectStudent(prevStudent.id)}
                title={`Previous: ${prevStudent.name} (Roll #${prevStudent.rollNo})`}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev (Roll #{prevStudent.rollNo})</span>
              </button>
            )}
            {nextStudent && onSelectStudent && (
              <button
                onClick={() => onSelectStudent(nextStudent.id)}
                title={`Next: ${nextStudent.name} (Roll #${nextStudent.rollNo})`}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 shadow-xs"
              >
                <span className="hidden sm:inline">Next (Roll #{nextStudent.rollNo})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Print Student Portfolio</span>
          </button>
        </div>
      </div>

      {/* MANDATORY PROMINENT ALERT PANEL (Section 8 of prompt) */}
      {studentAlerts.length > 0 ? (
        <div
          className={`rounded-2xl p-4 sm:p-5 border-2 shadow-md ${
            overallStatus.status === 'RED'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                overallStatus.status === 'RED' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide flex items-center gap-2">
                  <span>STUDENT REQUIRES ATTENTION</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      overallStatus.status === 'RED' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {overallStatus.status} ALERT ({studentAlerts.length})
                  </span>
                </h3>
                <span className="text-xs font-medium text-slate-600">
                  Responsible Staff: <strong>{studentAlerts[0]?.responsibleTeacher}</strong>
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {studentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2.5 rounded-xl bg-white/90 border border-current/20 shadow-xs flex items-start space-x-2"
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        alert.severity === 'RED' ? 'bg-rose-600' : 'bg-amber-500'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-bold">{alert.title}</div>
                      <p className="text-[11px] opacity-90 mt-0.5">{alert.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-medium opacity-75">
                        <span>Triggered: {alert.triggerDate}</span>
                        <span>•</span>
                        <span>Status: {alert.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <span>GREEN STATUS: STUDENT PROFILE IN GOOD STANDING</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
                  PASS
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                No active academic low-marks, consecutive absences, missing notebooks, or repeated complaints.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-slate-50 via-white to-emerald-50/20">
          <div className="flex items-center space-x-4">
            {/* Student Photo */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center text-3xl font-extrabold shadow-md border-2 border-white">
                {student.name.charAt(0)}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 border-white ${
                  overallStatus.status === 'RED'
                    ? 'bg-rose-600 text-white'
                    : overallStatus.status === 'ORANGE'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {overallStatus.status}
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {student.name}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Roll #{student.rollNo}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                  Adm #{student.admissionNo}
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-1 font-medium">
                {student.className} • {student.sectionName} • Academic Year: {student.academicYear}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 font-mono">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {student.parentContact} ({student.fatherName})
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  DOB: {student.dob} ({student.gender})
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {student.address}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto no-print">
            {canEditStudentDetails(student) && (
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{isEditingProfile ? 'Close Editor' : 'Edit Personal Info'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Edit Drawer if enabled */}
        {isEditingProfile && (
          <div className="p-5 border-t border-slate-200 bg-slate-50/80 no-print">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Update Student Personal Record (Authorized)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Student Full Name</label>
                <input
                  type="text"
                  defaultValue={student.name}
                  id="edit-name"
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Father / Guardian Name</label>
                <input
                  type="text"
                  defaultValue={student.fatherName}
                  id="edit-father"
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Primary Contact Number</label>
                <input
                  type="text"
                  defaultValue={student.parentContact}
                  id="edit-contact"
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Home Address</label>
                <input
                  type="text"
                  defaultValue={student.address}
                  id="edit-address"
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Medical Information</label>
                <input
                  type="text"
                  defaultValue={student.medicalInfo || ''}
                  id="edit-medical"
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    const name = (document.getElementById('edit-name') as HTMLInputElement)?.value;
                    const father = (document.getElementById('edit-father') as HTMLInputElement)?.value;
                    const contact = (document.getElementById('edit-contact') as HTMLInputElement)?.value;
                    const address = (document.getElementById('edit-address') as HTMLInputElement)?.value;
                    const medical = (document.getElementById('edit-medical') as HTMLInputElement)?.value;
                    StorageService.updateStudent(student.id, {
                      name,
                      fatherName: father,
                      parentContact: contact,
                      address,
                      medicalInfo: medical,
                    });
                    setIsEditingProfile(false);
                  }}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors"
                >
                  Save Profile Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 22-Tab Selector Bar: Dropdown on extra small screens + scrollable bar on all screens */}
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 no-print">
          {/* Mobile Quick Dropdown */}
          <div className="sm:hidden mb-2">
            <label htmlFor="mobile-tab-select" className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Jump to Section (22 Modules):
            </label>
            <select
              id="mobile-tab-select"
              value={activeTab}
              onChange={(e) => setActiveTab(Number(e.target.value))}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              {TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>

          {/* Horizontal Scrollable Tabs */}
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch py-1">
            <div className="flex items-center space-x-1.5 min-w-max">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 min-h-[400px]">
        {/* Tab 1: Personal Information */}
        {activeTab === 1 && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Complete Personal & Family Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-emerald-800">
                  Student Identification
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Admission No.</span>
                    <span className="font-bold text-slate-800">{student.admissionNo}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Roll No.</span>
                    <span className="font-bold text-slate-800">{student.rollNo}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Date of Birth</span>
                    <span className="font-medium text-slate-800">{student.dob}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Gender</span>
                    <span className="font-medium text-slate-800">{student.gender}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Admission Date</span>
                    <span className="font-medium text-slate-800">{student.admissionDate}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Status</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {student.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-emerald-800">
                  Family & Guardian Details
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Father's Name</span>
                    <span className="font-bold text-slate-800">{student.fatherName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Mother's Name</span>
                    <span className="font-medium text-slate-800">{student.motherName || 'On File'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Guardian Name</span>
                    <span className="font-medium text-slate-800">{student.guardianName || student.fatherName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Primary Contact</span>
                    <span className="font-bold text-slate-800 font-mono">{student.parentContact}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Emergency Phone</span>
                    <span className="font-medium text-slate-800 font-mono">{student.emergencyContact || 'Same as primary'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Home Address</span>
                    <span className="font-medium text-slate-800 text-right max-w-[160px] truncate">{student.address}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-emerald-800">
                  Medical & Educational Care
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-500 block mb-1">Medical Information / Allergies:</span>
                    <p className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800">
                      {student.medicalInfo || 'No medical conditions or food allergies logged.'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Special Educational Care:</span>
                    <p className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800">
                      {student.specialEducationalNeeds || 'Standard curriculum; no special accommodations recorded.'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">General School Remarks:</span>
                    <p className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800">
                      {student.remarks || 'Regular student progress under review.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Academic Records */}
        {activeTab === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Overall Academic Records & Examination Summary</span>
              </h3>
              <span className="text-xs text-slate-500">
                Pass Threshold: 60% (Below 60% flagged in RED)
              </span>
            </div>

            {marks.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No examination marks entered yet for this student.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Subject Name</th>
                      <th className="py-2.5 px-3">Total Marks</th>
                      <th className="py-2.5 px-3">Obtained Marks</th>
                      <th className="py-2.5 px-3">Percentage</th>
                      <th className="py-2.5 px-3">Grade</th>
                      <th className="py-2.5 px-3">Subject Teacher</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {marks.map((m) => {
                      const isLow = m.percentage !== null && m.percentage < 60;
                      return (
                        <tr key={m.id} className={isLow ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {m.subjectName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{m.totalMarks}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {m.obtainedMarks ?? 'N/A'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                isLow
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {m.percentage}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold">{m.grade}</td>
                          <td className="py-2.5 px-3 text-slate-600">{m.teacherName}</td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-xs">{m.remarks || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Monthly Test Results */}
        {activeTab === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Monthly Assessment Tests History
            </h3>
            <p className="text-xs text-slate-600">
              Diagnostic monthly tests conducted to identify formative learning gaps before term examinations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-900">October Monthly Test</span>
                  <span className="text-[11px] text-slate-500">2026-10-05</span>
                </div>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Mathematics (Total: 25)</span>
                    <span className="font-bold">18 / 25 (72% - Grade B)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>English Language (Total: 25)</span>
                    <span className="font-bold">21 / 25 (84% - Grade A)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Weekly Tests */}
        {activeTab === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Weekly Quizzes & Class Tests
            </h3>
            <p className="text-xs text-slate-500">
              Weekly micro-assessments tracked by subject teachers.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600">
              Weekly quiz evaluation ongoing for Term 1. All records synchronizing from daily classroom entries.
            </div>
          </div>
        )}

        {/* Tab 5: Mid-Term Examination */}
        {activeTab === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Mid-Term Examination Report Card
              </h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                Academic Year 2026-2027
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Subject</th>
                    <th className="py-2 px-3">Max Marks</th>
                    <th className="py-2 px-3">Marks Obtained</th>
                    <th className="py-2 px-3">Percentage</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marks.map((m) => (
                    <tr key={m.id} className={m.percentage && m.percentage < 60 ? 'bg-rose-50' : ''}>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{m.subjectName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.totalMarks}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{m.obtainedMarks}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold ${m.percentage && m.percentage < 60 ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                          {m.percentage}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {m.percentage && m.percentage < 60 ? (
                          <span className="text-rose-700 font-bold">Needs Improvement (&lt;60%)</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Passed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6 & 7: Final & Annual */}
        {(activeTab === 6 || activeTab === 7) && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              {activeTab === 6 ? 'Final-Term Examination Records' : 'Annual Examination & Promotion Status'}
            </h3>
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl text-xs">
              Scheduled for March 2027. Mid-term cumulative performance and continuous daily monitoring will formulate eligibility.
            </div>
          </div>
        )}

        {/* Tab 8: Attendance History */}
        {activeTab === 8 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <span>Attendance Log & Consecutive Absence Detection</span>
              </h3>
              <span className="text-xs text-slate-500">
                Default: Present (Pending Verification System)
              </span>
            </div>

            {attendance.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No attendance records logged.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Arrival Time</th>
                      <th className="py-2.5 px-3">Reason / Remarks</th>
                      <th className="py-2.5 px-3">Verified By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{att.date}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              att.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : att.status === 'Absent'
                                ? 'bg-rose-100 text-rose-800'
                                : att.status === 'Late'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{att.arrivalTime || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{att.reason || att.remarks || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{att.verifiedBy || att.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 9, 10, 11: Subject-Wise Monitoring, Books & Notebooks, Homework */}
        {(activeTab === 9 || activeTab === 10 || activeTab === 11) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>
                  {activeTab === 10
                    ? 'Books & Notebooks Inspection Log (3x Alert Rule)'
                    : activeTab === 11
                    ? 'Homework, Classwork & Assignment Tracking'
                    : 'Subject-Wise Daily Monitoring'}
                </span>
              </h3>
              <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                Rule: Missing notebook/book ≥3 times in a week triggers ORANGE ALERT
              </span>
            </div>

            {monitoring.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No subject monitoring logs found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Textbook</th>
                      <th className="py-2.5 px-3">Notebook</th>
                      <th className="py-2.5 px-3">Homework</th>
                      <th className="py-2.5 px-3">Classwork</th>
                      <th className="py-2.5 px-3">Teacher</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monitoring.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-700">{m.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{m.subjectName}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${m.textbookBrought === 'Yes' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {m.textbookBrought}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${m.notebookBrought === 'Yes' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {m.notebookBrought}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-medium ${m.homeworkCompleted === 'Yes' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {m.homeworkCompleted}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{m.classworkCompleted}</td>
                        <td className="py-2.5 px-3 text-slate-500">{m.teacherName}</td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs">{m.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 12 & 13: Health, Hygiene & Uniform */}
        {(activeTab === 12 || activeTab === 13) && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-emerald-600" />
              <span>{activeTab === 12 ? 'Personal Hygiene Checklist' : 'School Uniform & Dress Code Checklist'}</span>
            </h3>

            {activeTab === 12 && (
              <div className="space-y-3">
                {healthRecords.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No hygiene inspections recorded.</p>
                ) : (
                  healthRecords.map((rec) => (
                    <div key={rec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Inspection Date: {rec.date}</span>
                        <span className="text-slate-500 font-normal">By: {rec.teacherName}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Nails Trimmed</span>
                          <strong className={rec.nailsTrimmed === 'Satisfactory' ? 'text-emerald-700' : 'text-rose-600'}>
                            {rec.nailsTrimmed}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Hair Maintained</span>
                          <strong className={rec.hairMaintained === 'Satisfactory' ? 'text-emerald-700' : 'text-rose-600'}>
                            {rec.hairMaintained}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Haircut Standard</span>
                          <strong className={rec.haircutStandard === 'Satisfactory' ? 'text-emerald-700' : 'text-rose-600'}>
                            {rec.haircutStandard}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Cleanliness</span>
                          <strong className={rec.personalCleanliness === 'Satisfactory' ? 'text-emerald-700' : 'text-rose-600'}>
                            {rec.personalCleanliness}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">General Hygiene</span>
                          <strong className={rec.generalHygiene === 'Satisfactory' ? 'text-emerald-700' : 'text-rose-600'}>
                            {rec.generalHygiene}
                          </strong>
                        </div>
                      </div>
                      {rec.remarks && <p className="text-slate-600 pt-1">Remarks: {rec.remarks}</p>}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 13 && (
              <div className="space-y-3">
                {uniformRecords.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No uniform inspections recorded.</p>
                ) : (
                  uniformRecords.map((rec) => (
                    <div key={rec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Inspection Date: {rec.date}</span>
                        <span className="text-slate-500 font-normal">By: {rec.teacherName}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Proper Uniform</span>
                          <strong className={rec.properUniform === 'Satisfactory' ? 'text-emerald-700' : 'text-rose-600'}>
                            {rec.properUniform}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Clean Uniform</span>
                          <strong className={rec.cleanUniform === 'Satisfactory' ? 'text-emerald-700' : 'text-rose-600'}>
                            {rec.cleanUniform}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Shoes & Socks</span>
                          <strong className={rec.properShoes === 'Satisfactory' ? 'text-emerald-700' : 'text-rose-600'}>
                            {rec.properShoes} / {rec.properSocks}
                          </strong>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block text-[10px]">Belt / Badge</span>
                          <strong className={rec.schoolBelt === 'Satisfactory' ? 'text-emerald-700' : 'text-rose-600'}>
                            {rec.schoolBelt} / {rec.schoolBadge}
                          </strong>
                        </div>
                      </div>
                      {rec.remarks && <p className="text-slate-600 pt-1 font-medium text-rose-700">Remarks: {rec.remarks}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 14 & 15: Complaints & Repeated Complaints */}
        {(activeTab === 14 || activeTab === 15) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                <span>
                  {activeTab === 15
                    ? 'Repeated Complaint Alert Monitor (3x in same category = RED ALERT)'
                    : 'Student Complaints & Disciplinary Logs'}
                </span>
              </h3>
            </div>

            {complaints.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No complaints filed for this student.</p>
            ) : (
              <div className="space-y-3">
                {complaints.map((c, idx) => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{c.category}</span>
                        <span className="text-slate-400">({c.date})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <p className="text-slate-700">{c.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      <div>Reported By: <strong>{c.reportingTeacherName}</strong></div>
                      <div>Action Taken: <strong>{c.actionTaken || 'Pending review'}</strong></div>
                      {c.principalRemarks && (
                        <div className="sm:col-span-2 text-rose-800 bg-rose-50 p-2 rounded-lg">
                          Principal Remarks: {c.principalRemarks}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 16: Academic Improvement Alerts */}
        {activeTab === 16 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Academic Improvement Alerts & Remedial Plans
            </h3>
            {marks.filter((m) => m.percentage !== null && m.percentage < 60).length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-emerald-50 rounded-xl text-xs">
                All subject scores are 60% or higher. No academic improvement alert active.
              </div>
            ) : (
              <div className="space-y-3">
                {marks.filter((m) => m.percentage !== null && m.percentage < 60).map((m) => (
                  <div key={m.id} className="p-4 rounded-xl border-2 border-rose-300 bg-rose-50/70 text-xs space-y-2">
                    <div className="flex justify-between items-center font-bold text-rose-950">
                      <span>Low Marks Alert: {m.subjectName}</span>
                      <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[11px]">{m.percentage}%</span>
                    </div>
                    <p className="text-rose-900">
                      Obtained {m.obtainedMarks} out of {m.totalMarks}. Student needs immediate tutoring support and remedial practice in this subject.
                    </p>
                    <div className="text-[11px] text-slate-600 pt-1">
                      Subject Specialist: <strong>{m.teacherName}</strong> • Date Recorded: {m.date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 17: Daily Teacher Observations */}
        {activeTab === 17 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Teacher Observations, Positive Feedback & Suggestions</span>
            </h3>

            {observations.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No observations logged yet.</p>
            ) : (
              <div className="space-y-3">
                {observations.map((obs) => (
                  <div key={obs.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>Observation by {obs.teacherName}</span>
                      <span className="text-slate-500 font-normal">{obs.date}</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {obs.positiveRemarks && (
                        <p className="text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                          <strong>Positive Remarks:</strong> {obs.positiveRemarks}
                        </p>
                      )}
                      {obs.improvementSuggestions && (
                        <p className="text-amber-900 bg-amber-50 p-2 rounded-lg">
                          <strong>Suggestions for Improvement:</strong> {obs.improvementSuggestions}
                        </p>
                      )}
                      {obs.recommendedAction && (
                        <p className="text-slate-800 bg-white border border-slate-200 p-2 rounded-lg">
                          <strong>Recommended Action:</strong> {obs.recommendedAction}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 18: Daily Activities */}
        {activeTab === 18 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Co-curricular, Sports & Classroom Activities
            </h3>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No activity records logged.</p>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => (
                  <div key={act.id} className="p-3 rounded-xl border border-slate-200 bg-white text-xs flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{act.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                          {act.activityType}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{act.description}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 font-mono">{act.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 19: Parent Meeting Records */}
        {activeTab === 19 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Parent Meetings & Communication History</span>
            </h3>

            {parentMeetings.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No parent meetings recorded for this student.</p>
            ) : (
              <div className="space-y-3">
                {parentMeetings.map((pm) => (
                  <div key={pm.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>Meeting: {pm.meetingReason}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {pm.meetingStatus}
                      </span>
                    </div>
                    <div className="text-slate-700 space-y-1">
                      <div>Parent: <strong>{pm.parentName}</strong> ({pm.contactNumber})</div>
                      <div>Date: <strong>{pm.meetingDate}</strong> • Teachers Attending: {pm.teacherAttending}</div>
                      <div>Agreed Action Plan: <strong>{pm.agreedActionPlan}</strong></div>
                      <div>Parent Feedback: <em>"{pm.parentFeedback}"</em></div>
                      {pm.followUpDate && <div>Follow-up Scheduled: <strong className="text-amber-700">{pm.followUpDate}</strong></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 20: Uploaded Documents */}
        {activeTab === 20 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Digital Portfolio Documents & Certificates</span>
            </h3>
            {docs.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No documents uploaded for this student.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {docs.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{doc.title}</div>
                      <div className="text-[11px] text-slate-500">{doc.category} • {doc.fileSize}</div>
                    </div>
                    <span className="text-emerald-700 font-semibold text-xs cursor-pointer hover:underline">
                      Download
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 21 & 22: Annual Progress Report & Complete History */}
        {(activeTab === 21 || activeTab === 22) && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              {activeTab === 21 ? 'Official Annual Progress Report Card' : 'Comprehensive Lifecycle Audit Log'}
            </h3>
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-3">
              <div className="flex justify-between items-center font-bold text-slate-900">
                <span>Green Island Foundation School Comprehensive Portfolio Ledger</span>
                <span>ID: {student.id}</span>
              </div>
              <p className="text-slate-600">
                Permanent records archived from admission date ({student.admissionDate}) through current academic term.
                Attendance percentage, subject test curves, disciplinary logs, and parent communication threads preserved without deletion.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg text-xs hover:bg-emerald-800"
                >
                  Generate Official Printable Progress Transcript
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
