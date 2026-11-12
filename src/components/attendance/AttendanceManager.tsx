import React, { useState, useMemo } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, AttendanceStatus, Student } from '../../types';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Phone,
  Save,
  Check,
  FileText,
  UserCheck,
  Calendar,
} from 'lucide-react';

export const AttendanceManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { canMarkAttendance, currentUser } = useAuth();
  const classes = StorageService.getClasses();
  const allStudents = StorageService.getStudents();

  // Determine initial class and section based on teacher assignment if available
  const initialClassId = useMemo(() => {
    if (currentUser?.assignedClasses && currentUser.assignedClasses.length > 0) {
      const match = currentUser.assignedClasses[0].split('-')[0];
      const found = classes.find((c) => c.name.toLowerCase() === match.toLowerCase() || c.id === match);
      if (found) return found.id;
    }
    return classes[0]?.id || 'c9';
  }, [currentUser, classes]);

  const initialSectionId = useMemo(() => {
    if (currentUser?.assignedClasses && currentUser.assignedClasses.length > 0) {
      const parts = currentUser.assignedClasses[0].split('-');
      if (parts[1]) return parts[1].trim().toUpperCase().replace(/^SECTION\s+/i, '');
    }
    return 'A';
  }, [currentUser]);

  // State
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSectionId);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Filter students belonging to this class & section
  const targetStudents = useMemo(() => {
    return allStudents.filter(
      (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId && s.status === 'Active'
    );
  }, [allStudents, selectedClassId, selectedSectionId]);

  // Load existing records or initialize with Default Present System
  const [attendanceMap, setAttendanceMap] = useState<Record<string, {
    status: AttendanceStatus;
    arrivalTime: string;
    lateDurationMinutes: number;
    reason: string;
    remarks: string;
  }>>({});

  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Load attendance whenever date or class changes
  React.useEffect(() => {
    const existing = StorageService.getAttendance().filter(
      (a) => a.classId === selectedClassId && a.sectionId === selectedSectionId && a.date === selectedDate
    );

    const newMap: Record<string, any> = {};
    let allFinalized = existing.length > 0;

    targetStudents.forEach((std) => {
      const match = existing.find((e) => e.studentId === std.id);
      if (match) {
        newMap[std.id] = {
          status: match.status,
          arrivalTime: match.arrivalTime || '07:45 AM',
          lateDurationMinutes: match.lateDurationMinutes || 0,
          reason: match.reason || '',
          remarks: match.remarks || '',
        };
        if (!match.isVerified) allFinalized = false;
      } else {
        // Section 10.1: Default Present System
        newMap[std.id] = {
          status: 'Present',
          arrivalTime: '07:45 AM',
          lateDurationMinutes: 0,
          reason: '',
          remarks: '',
        };
        allFinalized = false;
      }
    });

    setAttendanceMap(newMap);
    setIsVerified(allFinalized);
  }, [selectedClassId, selectedSectionId, selectedDate, targetStudents]);

  // Quick status toggle
  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        reason: status === 'Absent' ? 'Unexplained absence' : prev[studentId]?.reason || '',
      },
    }));
  };

  // Mark All Present (Quick helper)
  const handleMarkAllPresent = () => {
    const updated: Record<string, any> = {};
    targetStudents.forEach((std) => {
      updated[std.id] = {
        ...attendanceMap[std.id],
        status: 'Present',
        reason: '',
      };
    });
    setAttendanceMap(updated);
  };

  // Save / Finalize Attendance
  const handleSaveAttendance = (finalize: boolean) => {
    const recordsToSave: Omit<AttendanceRecord, 'id' | 'updatedAt'>[] = targetStudents.map((std) => {
      const entry = attendanceMap[std.id] || { status: 'Present', arrivalTime: '07:45 AM', reason: '', remarks: '' };
      return {
        studentId: std.id,
        studentName: std.name,
        rollNo: std.rollNo,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        date: selectedDate,
        status: entry.status,
        arrivalTime: entry.status === 'Late' || entry.status === 'Present' ? entry.arrivalTime : undefined,
        lateDurationMinutes: entry.lateDurationMinutes,
        reason: entry.reason,
        remarks: entry.remarks,
        isVerified: finalize,
        verifiedBy: finalize ? (currentUser?.name || 'Authorized Staff') : undefined,
        recordedBy: currentUser?.name || 'Authorized Staff',
      };
    });

    StorageService.markAttendance(recordsToSave);
    setIsVerified(finalize);
    setSaveSuccessMsg(
      finalize
        ? `Attendance verified and finalized for ${targetStudents.length} students on ${selectedDate}!`
        : `Draft attendance records saved as pending verification.`
    );
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Consecutive Absence Calculation for Alert Desk (Section 10.2)
  const consecutiveAbsenceStudents = useMemo(() => {
    const contactList = StorageService.getStudentsRequiringParentContact();
    return contactList.filter((item) => item.alerts.some((a) => a.category === 'Consecutive Absence'));
  }, [attendanceMap]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      {/* Header & Section Explanation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <CalendarCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Daily Attendance Management
                </h2>
                <p className="text-xs text-slate-500">
                  Default Present System (Section 10.1) • Teachers only mark absent, late, or leave
                </p>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                isVerified
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              {isVerified ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Finalized & Verified</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Pending Teacher Verification</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Date & Class Selectors */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Attendance Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Select Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-xs text-slate-800"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Select Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-xs text-slate-800"
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 mt-2 sm:mt-0 sm:ml-auto">
            <button
              onClick={handleMarkAllPresent}
              className="flex-1 sm:flex-none px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-center"
            >
              Reset All to Present
            </button>
            <button
              onClick={() => handleSaveAttendance(true)}
              disabled={!canMarkAttendance(selectedClassId, selectedSectionId)}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Verify & Finalize</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* SECTION 10.2: AUTOMATIC CONSECUTIVE ABSENCE ALERT PANEL */}
      {consecutiveAbsenceStudents.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-950 uppercase tracking-wide">
                  CONSECUTIVE ABSENCE ALERT – PARENT CONTACT REQUIRED (SECTION 10.2)
                </h3>
                <p className="text-xs text-amber-900">
                  Students absent for 2 or more consecutive working days without approved medical leave.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600 text-white">
              {consecutiveAbsenceStudents.length} Active Alerts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {consecutiveAbsenceStudents.map((item) => (
              <div
                key={item.student.id}
                className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-xs flex items-start justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="text-rose-600 font-extrabold">●</span>
                    <span>{item.student.name}</span>
                    <span className="text-slate-400 font-normal">
                      (Roll #{item.student.rollNo} • {item.student.className}-{item.student.sectionName})
                    </span>
                  </div>
                  <p className="text-amber-900 text-[11px] mt-1">
                    {item.alerts.find((a) => a.category === 'Consecutive Absence')?.description}
                  </p>
                  <div className="mt-2 text-slate-600 flex items-center gap-1 font-mono text-[11px]">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Parent: {item.student.parentContact} ({item.student.fatherName})</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectStudent(item.student.id)}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg shrink-0 ml-2"
                >
                  Contact →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class Attendance Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>
            Class Roster: <strong>{selectedClass?.name} - Section {selectedSectionId}</strong> ({targetStudents.length} Students)
          </span>
          <span className="text-slate-500">
            Click status pill to toggle: Present / Absent / Late / Leave / Half Day
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Roll #</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Attendance Status (Interactive)</th>
                <th className="py-2.5 px-3">Arrival Time</th>
                <th className="py-2.5 px-3">Absence Reason / Notes</th>
                <th className="py-2.5 px-4 text-right">Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targetStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active students registered in this class and section.
                  </td>
                </tr>
              ) : (
                targetStudents.map((std) => {
                  const entry = attendanceMap[std.id] || {
                    status: 'Present',
                    arrivalTime: '07:45 AM',
                    reason: '',
                    remarks: '',
                  };

                  return (
                    <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {std.rollNo}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{std.name}</div>
                        <div className="text-[11px] text-slate-400">Adm: {std.admissionNo}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(['Present', 'Absent', 'Late', 'Leave', 'Half Day'] as AttendanceStatus[]).map((st) => {
                            const isSelected = entry.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateStudentStatus(std.id, st)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  isSelected
                                    ? st === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : st === 'Absent'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : st === 'Late'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : st === 'Leave'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {entry.status === 'Late' ? (
                          <input
                            type="text"
                            value={entry.arrivalTime || '08:15 AM'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttendanceMap((prev) => ({
                                ...prev,
                                [std.id]: { ...prev[std.id], arrivalTime: val },
                              }));
                            }}
                            className="p-1 px-2 border border-slate-300 rounded text-xs w-24 font-mono"
                          />
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">
                            {entry.status === 'Present' ? entry.arrivalTime : '-'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder={entry.status === 'Absent' ? 'Specify reason for absence...' : 'Optional remark...'}
                          value={entry.reason || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAttendanceMap((prev) => ({
                              ...prev,
                              [std.id]: { ...prev[std.id], reason: val },
                            }));
                          }}
                          className={`p-1 px-2 rounded text-xs w-full max-w-xs border ${
                            entry.status === 'Absent' && !entry.reason
                              ? 'border-rose-300 bg-rose-50/50'
                              : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectStudent(std.id)}
                          className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          View Log →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
