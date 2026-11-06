import React, { useMemo } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  CalendarCheck,
  GraduationCap,
  AlertTriangle,
  BookOpen,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  PhoneCall,
  CheckCircle2,
  XCircle,
  FileCheck,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Lock,
  LogIn,
} from 'lucide-react';
import { StudentAlert, AlertSeverity } from '../../types';

interface MainDashboardProps {
  onSelectStudent: (studentId: string) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  onSelectStudent,
  onNavigateToTab,
}) => {
  const { isVisitor, openLoginModal } = useAuth();
  const settings = StorageService.getSettings();
  const students = StorageService.getStudents();
  const classes = StorageService.getClasses();
  const subjects = StorageService.getSubjects();
  const users = StorageService.getUsers();
  const attendance = StorageService.getAttendance();
  const marks = StorageService.getMarks();
  const monitoring = StorageService.getMonitoring();
  const complaints = StorageService.getComplaints();
  const parentMeetings = StorageService.getParentMeetings();

  // Compute live alerts from alert engine
  const studentsRequiringContact = useMemo(() => {
    return StorageService.getStudentsRequiringParentContact();
  }, [students, marks, attendance, monitoring, complaints, parentMeetings]);

  // Daily stats for current date or latest recorded date
  const latestDate = useMemo(() => {
    if (attendance.length === 0) return new Date().toISOString().split('T')[0];
    const dates = attendance.map((a) => a.date).sort();
    return dates[dates.length - 1];
  }, [attendance]);

  const todayAttendance = useMemo(() => {
    return attendance.filter((a) => a.date === latestDate);
  }, [attendance, latestDate]);

  const presentCount = todayAttendance.filter((a) => a.status === 'Present').length;
  const absentCount = todayAttendance.filter((a) => a.status === 'Absent').length;
  const leaveCount = todayAttendance.filter((a) => a.status === 'Leave').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'Late').length;
  const pendingVerification = todayAttendance.filter((a) => !a.isVerified).length;

  // Academic stats (<60% low marks)
  const lowMarksRecords = useMemo(() => {
    return marks.filter((m) => m.obtainedMarks !== null && m.percentage !== null && m.percentage < (settings.lowMarksThreshold || 60));
  }, [marks, settings]);

  const uniqueLowMarksStudents = useMemo(() => {
    return new Set(lowMarksRecords.map((m) => m.studentId)).size;
  }, [lowMarksRecords]);

  // Discipline stats
  const pendingComplaints = complaints.filter((c) => c.status === 'Pending').length;
  const repeatedComplaintsCount = useMemo(() => {
    // 3 or more complaints in same category
    let count = 0;
    const catMap: Record<string, number> = {};
    complaints.forEach((c) => {
      const key = `${c.studentId}_${c.category}`;
      catMap[key] = (catMap[key] || 0) + 1;
      if (catMap[key] === (settings.repeatedComplaintThreshold || 3)) {
        count++;
      }
    });
    return count;
  }, [complaints, settings]);

  // Consecutive absence count
  const consecutiveAbsenceCount = useMemo(() => {
    return studentsRequiringContact.filter((item) =>
      item.alerts.some((a) => a.category === 'Consecutive Absence')
    ).length;
  }, [studentsRequiringContact]);

  // Repeated notebook alerts count
  const repeatedNotebookCount = useMemo(() => {
    return studentsRequiringContact.filter((item) =>
      item.alerts.some((a) => a.category === 'Repeated Missing Notebook' || a.category === 'Repeated Missing Textbook')
    ).length;
  }, [studentsRequiringContact]);

  return (
    <div className="space-y-6">
      {/* Public Visitor Mode Notification */}
      {isVisitor && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-amber-950">
                  Public Visitor Portal View
                </h3>
                <span className="text-[10px] uppercase font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  Dashboard Only
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 max-w-2xl">
                Visitors have read-only overview access. To manage students, mark attendance, record exam marks, or configure curriculum, please log in with your authorized school credentials (Admin, Principal, or Teacher).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openLoginModal()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Staff Login</span>
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-200 border border-emerald-600/40 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Real-Time Academic & Monitoring Intelligence</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Green Island Foundation School Dashboard
            </h2>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl">
              Automatic alert engine actively identifying students needing academic intervention,
              disciplinary review, consecutive attendance follow-up, or parent involvement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateToTab('alerts')}
              className="px-3 sm:px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Parent Desk ({studentsRequiringContact.length})</span>
            </button>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="px-3 sm:px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-medium transition-all"
            >
              Export Reports
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Students</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {students.length}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">
            {students.filter((s) => s.status === 'Active').length} Active
          </div>
        </div>

        {/* Classes & Sections */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Classes & O Levels</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {classes.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {classes.reduce((acc, c) => acc + c.sections.length, 0)} Active Sections
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Present Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            {presentCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {todayAttendance.length > 0
              ? `${Math.round((presentCount / (todayAttendance.length || 1)) * 100)}% attendance rate`
              : 'Date: ' + latestDate}
          </div>
        </div>

        {/* Absences / Consecutive Alert */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Absent Today</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {absentCount}
          </div>
          <div className="mt-1 text-[11px] text-amber-600 font-semibold">
            {consecutiveAbsenceCount} Consecutive (≥2d)
          </div>
        </div>

        {/* Low Marks (<60%) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Below 60% Marks</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {uniqueLowMarksStudents}
          </div>
          <div className="mt-1 text-[11px] text-rose-500 font-medium">
            {lowMarksRecords.length} subject entries
          </div>
        </div>

        {/* Discipline / 3x Complaints */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Complaints</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {complaints.length}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-bold">
            {repeatedComplaintsCount} Repeated (3x alert)
          </div>
        </div>
      </div>

      {/* CRITICAL DASHBOARD SECTION: STUDENTS REQUIRING PARENT CONTACT (Section 5 & 13) */}
      <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 px-5 py-3.5 border-b border-rose-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950 uppercase tracking-wider flex items-center gap-2">
                STUDENTS REQUIRING PARENT CONTACT
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-600 text-white">
                  {studentsRequiringContact.length} Pending Actions
                </span>
              </h3>
              <p className="text-xs text-rose-800">
                Triggered automatically by low marks (&lt;60%), 2+ consecutive absences, repeated missing notebooks/books, or 3 repeated complaints.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('alerts')}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center space-x-1 hover:underline"
          >
            <span>Open Dedicated Parent Action Desk</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {studentsRequiringContact.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">All Student Profiles in Good Standing</p>
            <p className="text-xs text-slate-400">No active RED or ORANGE early warning alerts at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Student & Roll No.</th>
                  <th className="py-2.5 px-3">Class & Section</th>
                  <th className="py-2.5 px-3">Severity & Reason</th>
                  <th className="py-2.5 px-3">Trigger Details</th>
                  <th className="py-2.5 px-3">Parent Contact</th>
                  <th className="py-2.5 px-3">Follow-up Status</th>
                  <th className="py-2.5 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsRequiringContact.map((item) => {
                  const { student, alerts, highestSeverity, parentMeeting } = item;
                  const isRed = highestSeverity === 'RED';

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isRed ? 'bg-rose-50/30' : 'bg-amber-50/20'
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isRed ? 'bg-rose-600 animate-ping' : 'bg-amber-500'
                            }`}
                          />
                          <div>
                            <div className="text-slate-900 font-bold hover:text-emerald-700 cursor-pointer" onClick={() => onSelectStudent(student.id)}>
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              Roll #{student.rollNo} • Adm: {student.admissionNo}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        <span className="font-medium">{student.className}</span>
                        <span className="text-slate-400 text-[11px] block">{student.sectionName}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isRed
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {highestSeverity} ALERT
                        </span>
                        <div className="text-slate-800 font-medium text-xs mt-0.5">
                          {alerts.map((a) => a.title).join(' • ')}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate text-[11px]">
                        {alerts[0]?.description}
                      </td>

                      <td className="py-3 px-3 text-slate-800 font-mono text-[11px]">
                        <div className="flex items-center space-x-1 text-slate-700">
                          <PhoneCall className="w-3 h-3 text-slate-400" />
                          <span>{student.parentContact}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {student.fatherName}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {parentMeeting ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            Meeting: {parentMeeting.meetingDate}
                          </span>
                        ) : alerts.some((a) => a.parentContacted) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
                            Contacted (Diary/Phone)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                            Needs Contact
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onSelectStudent(student.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                          >
                            Open Portfolio
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Analytics & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Verification & Daily Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Today's Attendance Status</span>
            </h4>
            <span className="text-xs text-slate-500 font-mono">{latestDate}</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Present ({presentCount})</span>
                <span className="font-semibold text-emerald-700">
                  {todayAttendance.length ? Math.round((presentCount / todayAttendance.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${todayAttendance.length ? (presentCount / todayAttendance.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Absent ({absentCount})</span>
                <span className="font-semibold text-rose-600">
                  {todayAttendance.length ? Math.round((absentCount / todayAttendance.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${todayAttendance.length ? (absentCount / todayAttendance.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Late Arrivals ({lateCount})</span>
                <span className="font-semibold text-amber-600">
                  {todayAttendance.length ? Math.round((lateCount / todayAttendance.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${todayAttendance.length ? (lateCount / todayAttendance.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Official Leave ({leaveCount})</span>
                <span className="font-semibold text-blue-600">
                  {todayAttendance.length ? Math.round((leaveCount / todayAttendance.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${todayAttendance.length ? (leaveCount / todayAttendance.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {pendingVerification > 0 ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {pendingVerification} classes pending verification
                </span>
              ) : (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All attendance finalized
                </span>
              )}
            </span>
            <button
              onClick={() => onNavigateToTab('attendance')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
            >
              Manage Attendance →
            </button>
          </div>
        </div>

        {/* Academic Marks & Low Marks Alerts (<60%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Academic Performance & Alerts</span>
            </h4>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
              Threshold: &lt;60%
            </span>
          </div>

          <div className="space-y-3">
            {lowMarksRecords.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No scores below 60% recorded.</p>
            ) : (
              lowMarksRecords.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 cursor-pointer hover:underline" onClick={() => onSelectStudent(rec.studentId)}>
                      {rec.studentName}
                    </span>{' '}
                    <span className="text-slate-400">(Roll #{rec.rollNo})</span>
                    <div className="text-[11px] text-slate-500">
                      {rec.subjectName} • {rec.obtainedMarks}/{rec.totalMarks}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-200 shadow-xs">
                      {rec.percentage}%
                    </span>
                    <div className="text-[10px] text-rose-500 font-semibold mt-0.5">
                      Needs Help
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Total {lowMarksRecords.length} low mark alerts
            </span>
            <button
              onClick={() => onNavigateToTab('academics')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
            >
              Marks & Examinations →
            </button>
          </div>
        </div>

        {/* Daily Monitoring & Discipline Overview */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Books & Discipline Monitoring</span>
            </h4>
            <span className="text-xs text-slate-500">This Week</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-amber-900">Missing Notebooks / Books</div>
                <div className="text-[11px] text-amber-800">
                  {repeatedNotebookCount} students with ≥3 missing copies in same subject
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('monitoring')}
                className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg text-[11px] hover:bg-amber-700"
              >
                Inspect
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-rose-950">Disciplinary Complaints</div>
                <div className="text-[11px] text-rose-800">
                  {pendingComplaints} pending review • {repeatedComplaintsCount} with 3+ repeated incidents
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('complaints')}
                className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg text-[11px] hover:bg-rose-700"
              >
                Inspect
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-emerald-950">Parent Communication</div>
                <div className="text-[11px] text-emerald-800">
                  {parentMeetings.length} total meetings recorded • {parentMeetings.filter((m) => m.meetingStatus === 'Scheduled').length} upcoming
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('parent_meetings')}
                className="px-2.5 py-1 bg-emerald-700 text-white font-bold rounded-lg text-[11px] hover:bg-emerald-800"
              >
                Log
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Continuous 360° student tracking</span>
            <button
              onClick={() => onNavigateToTab('students')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
            >
              All Student Portfolios →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
