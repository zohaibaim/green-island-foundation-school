import React, { useState, useMemo, useEffect } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { useCloudSync } from '../../hooks/useCloudSync';
import { DailySubjectMonitoring, TriState, Student } from '../../types';
import {
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Save,
  Phone,
  Lock,
  Check,
  Sparkles,
} from 'lucide-react';

type MonitoringEntry = {
  textbookBrought: TriState;
  notebookBrought: TriState;
  homeworkCompleted: TriState;
  classworkCompleted: TriState;
  remarks: string;
};

const DEFAULT_ENTRY: MonitoringEntry = {
  textbookBrought: 'Yes',
  notebookBrought: 'Yes',
  homeworkCompleted: 'Yes',
  classworkCompleted: 'Yes',
  remarks: '',
};

export const DailyMonitoringManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser, currentRole, canMonitorSubject, isSubjectAssignedToUser } = useAuth();
  const classes = StorageService.getClasses();
  const subjects = StorageService.getSubjects();
  const [allStudents, setAllStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [monitoringRecords, setMonitoringRecords] = useState<DailySubjectMonitoring[]>(() =>
    StorageService.getMonitoring()
  );
  const [cloudMonTick, setCloudMonTick] = useState(0);
  const isDirtyRef = React.useRef(false);

  useEffect(() => {
    setAllStudents(StorageService.getStudents());
    setMonitoringRecords(StorageService.getMonitoring());
  }, []);

  useCloudSync(() => {
    setAllStudents(StorageService.getStudents());
    setMonitoringRecords(StorageService.getMonitoring());
    if (!isDirtyRef.current) {
      setCloudMonTick((t) => t + 1);
    }
  });

  const parseClassToken = (token: string): { classId: string; sectionId: string } | null => {
    const trimmed = token.trim();
    if (!trimmed) return null;
    const lastDash = trimmed.lastIndexOf('-');
    const clsPart = lastDash > -1 ? trimmed.slice(0, lastDash).trim() : trimmed;
    const secPart = lastDash > -1 ? trimmed.slice(lastDash + 1).trim().toUpperCase().replace(/^SECTION\s+/i, '') : 'A';
    const found = classes.find((c) => c.name.toLowerCase() === clsPart.toLowerCase() || c.id === clsPart);
    if (!found) return null;
    return {
      classId: found.id,
      sectionId: secPart === 'ALL' ? found.sections[0] || 'A' : secPart,
    };
  };

  // Quick shortcuts for teachers with assigned classes/subjects
  const teacherShortcuts = useMemo(() => {
    if (!currentUser || (currentRole !== 'subject_teacher' && currentRole !== 'class_teacher')) return [];
    const list: { classId: string; className: string; sectionId: string; subjectName: string }[] = [];
    const seen = new Set<string>();

    (currentUser.assignedSubjects || []).forEach((as) => {
      if (as.classId && as.classId !== 'ALL') {
        const cls = classes.find((c) => c.id === as.classId);
        const sec = !as.sectionId || as.sectionId === 'ALL' ? cls?.sections[0] || 'A' : as.sectionId;
        const key = `${as.classId}|${sec}|${as.subjectName}`;
        if (cls && !seen.has(key)) {
          seen.add(key);
          list.push({ classId: cls.id, className: cls.name, sectionId: sec, subjectName: as.subjectName });
        }
      } else if (as.className) {
        const parsed = parseClassToken(as.className);
        if (parsed) {
          const cls = classes.find((c) => c.id === parsed.classId);
          const key = `${parsed.classId}|${parsed.sectionId}|${as.subjectName}`;
          if (cls && !seen.has(key)) {
            seen.add(key);
            list.push({ classId: cls.id, className: cls.name, sectionId: parsed.sectionId, subjectName: as.subjectName });
          }
        }
      }
    });

    if (list.length === 0) {
      const clsTokens = currentUser.inChargeClass
        ? [currentUser.inChargeClass, ...(currentUser.assignedClasses || [])]
        : currentUser.assignedClasses || [];
      const subjNames =
        currentUser.selectedSubjectNames && currentUser.selectedSubjectNames.length > 0
          ? currentUser.selectedSubjectNames
          : [subjects[0]?.name || 'Mathematics'];
      clsTokens.forEach((tok) => {
        const parsed = parseClassToken(tok);
        if (!parsed) return;
        const cls = classes.find((c) => c.id === parsed.classId);
        if (!cls) return;
        subjNames.forEach((subj) => {
          const key = `${cls.id}|${parsed.sectionId}|${subj}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ classId: cls.id, className: cls.name, sectionId: parsed.sectionId, subjectName: subj });
          }
        });
      });
    }

    return list;
  }, [currentUser, currentRole, classes, subjects]);

  const initialClassId = useMemo(() => {
    if (teacherShortcuts.length > 0) return teacherShortcuts[0].classId;
    const token = currentUser?.inChargeClass || currentUser?.assignedClasses?.[0];
    if (token) {
      const parsed = parseClassToken(token);
      if (parsed) return parsed.classId;
    }
    return classes[0]?.id || 'c9';
  }, [teacherShortcuts, currentUser, classes]);

  const initialSectionId = useMemo(() => {
    if (teacherShortcuts.length > 0) return teacherShortcuts[0].sectionId;
    const token = currentUser?.inChargeClass || currentUser?.assignedClasses?.[0];
    if (token) {
      const parsed = parseClassToken(token);
      if (parsed) return parsed.sectionId;
    }
    return classes[0]?.sections[0] || 'A';
  }, [teacherShortcuts, currentUser, classes]);

  const initialSubject = useMemo(() => {
    if (teacherShortcuts.length > 0) return teacherShortcuts[0].subjectName;
    if (currentUser?.assignedSubjects && currentUser.assignedSubjects.length > 0) {
      return currentUser.assignedSubjects[0].subjectName;
    }
    if (currentUser?.selectedSubjectNames && currentUser.selectedSubjectNames.length > 0) {
      return currentUser.selectedSubjectNames[0];
    }
    return subjects[0]?.name || 'Mathematics';
  }, [teacherShortcuts, currentUser, subjects]);

  // Active Filters & Selection
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSectionId);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [bulkStatusValue, setBulkStatusValue] = useState<TriState>('Yes');

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const availableSections = selectedClass?.sections || ['A', 'B', 'C', 'D'];

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.id === newClassId);
    if (cls && cls.sections.length > 0 && !cls.sections.includes(selectedSectionId)) {
      setSelectedSectionId(cls.sections[0]);
    }
  };

  // Permission Check for selected Class, Section & Subject
  const isEditable = canMonitorSubject(selectedSubject, selectedClassId, selectedSectionId);

  // Target class students
  const classStudents = useMemo(() => {
    return allStudents.filter(
      (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId && s.status === 'Active'
    );
  }, [allStudents, selectedClassId, selectedSectionId]);

  const classStudentsKey = useMemo(() => classStudents.map((s) => s.id).join(','), [classStudents]);

  // Form state map: studentId -> fields
  const [formState, setFormState] = useState<Record<string, MonitoringEntry>>({});

  // Initialize form state whenever selection or student roster changes
  useEffect(() => {
    const existing = StorageService.getMonitoring().filter(
      (m) =>
        m.classId === selectedClassId &&
        m.sectionId === selectedSectionId &&
        m.subjectName === selectedSubject &&
        m.date === selectedDate
    );

    const initial: Record<string, MonitoringEntry> = {};
    classStudents.forEach((std) => {
      const match = existing.find((e) => e.studentId === std.id);
      if (match) {
        initial[std.id] = {
          textbookBrought: match.textbookBrought || 'Yes',
          notebookBrought: match.notebookBrought || 'Yes',
          homeworkCompleted: match.homeworkCompleted || 'Yes',
          classworkCompleted: match.classworkCompleted || 'Yes',
          remarks: match.remarks || '',
        };
      } else {
        initial[std.id] = { ...DEFAULT_ENTRY };
      }
    });

    setFormState(initial);
    isDirtyRef.current = false;
  }, [selectedClassId, selectedSectionId, selectedSubject, selectedDate, classStudentsKey, cloudMonTick]);

  const updateStudentField = (
    studentId: string,
    field: 'textbookBrought' | 'notebookBrought' | 'homeworkCompleted' | 'classworkCompleted',
    val: TriState
  ) => {
    if (!isEditable) return;
    isDirtyRef.current = true;
    setFormState((prev) => {
      const current = prev[studentId] || { ...DEFAULT_ENTRY };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: val,
        },
      };
    });
  };

  const handleBulkSetAll = (val: TriState) => {
    if (!isEditable) return;
    isDirtyRef.current = true;
    setFormState((prev) => {
      const updated: Record<string, MonitoringEntry> = {};
      classStudents.forEach((std) => {
        const cur = prev[std.id] || { ...DEFAULT_ENTRY };
        updated[std.id] = {
          ...cur,
          textbookBrought: val,
          notebookBrought: val,
          homeworkCompleted: val,
          classworkCompleted: val,
        };
      });
      return updated;
    });
  };

  const handleSaveMonitoring = () => {
    if (!isEditable) return;
    classStudents.forEach((std) => {
      const data = formState[std.id] || { ...DEFAULT_ENTRY };

      StorageService.addMonitoring({
        date: selectedDate,
        studentId: std.id,
        studentName: std.name,
        rollNo: std.rollNo,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectName: selectedSubject,
        teacherId: currentUser?.id || 'staff',
        teacherName: currentUser?.name || 'Authorized Staff',
        textbookBrought: data.textbookBrought,
        notebookBrought: data.notebookBrought,
        homeworkCompleted: data.homeworkCompleted,
        classworkCompleted: data.classworkCompleted,
        assignmentCompleted: 'Not Applicable',
        requiredMaterialBrought: data.textbookBrought === 'No' ? 'No' : 'Yes',
        remarks: data.remarks,
      });
    });

    isDirtyRef.current = false;
    setMonitoringRecords(StorageService.getMonitoring());
    setSaveSuccessMsg(
      `✓ Daily Books & Homework log saved for ${selectedSubject} (${selectedClass?.name || ''} - Sec ${selectedSectionId}) on ${selectedDate}!`
    );
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Repeated notebook alerts from Alert Engine (Section 11.1)
  const notebookAlerts = useMemo(() => {
    const contactList = StorageService.getStudentsRequiringParentContact();
    return contactList.filter((item) =>
      item.alerts.some(
        (a) => a.category === 'Repeated Missing Notebook' || a.category === 'Repeated Missing Textbook'
      )
    );
  }, [monitoringRecords]);

  const getDropdownStyle = (val: TriState, isStrictMissing = false) => {
    if (val === 'Yes') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    }
    if (val === 'No') {
      return isStrictMissing
        ? 'bg-rose-50 text-rose-800 border-rose-400'
        : 'bg-amber-50 text-amber-800 border-amber-300';
    }
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Subject-Wise Books, Notebooks & Homework Monitoring
              </h2>
              <p className="text-xs text-slate-500">
                Use the dropdown list in each column to mark Yes / No / Not Applicable • 3x missing triggers an Orange Alert
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveMonitoring}
            disabled={!isEditable || classStudents.length === 0}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors text-xs self-start md:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>Save Class Inspection Log</span>
          </button>
        </div>

        {/* Teacher Assigned Quick Jump Pills */}
        {teacherShortcuts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 uppercase text-[11px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Your Assigned Classes & Subjects:
            </span>
            {teacherShortcuts.map((sc) => {
              const active =
                sc.classId === selectedClassId &&
                sc.sectionId === selectedSectionId &&
                sc.subjectName === selectedSubject;
              return (
                <button
                  key={`${sc.classId}-${sc.sectionId}-${sc.subjectName}`}
                  type="button"
                  onClick={() => {
                    setSelectedClassId(sc.classId);
                    setSelectedSectionId(sc.sectionId);
                    setSelectedSubject(sc.subjectName);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all border ${
                    active
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {sc.className}-{sc.sectionId} • {sc.subjectName}
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end gap-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Inspection Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800 min-w-[130px]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
            >
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-slate-500 mb-1 font-semibold">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full sm:w-auto p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-emerald-800 sm:min-w-[220px]"
            >
              {subjects.map((s) => {
                const assigned = isSubjectAssignedToUser(s.name);
                return (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.code}){currentRole === 'subject_teacher' ? (assigned ? ' ✓ Assigned' : ' 🔒 View Only') : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {isEditable && classStudents.length > 0 && (
            <div className="sm:ml-auto flex items-center gap-2">
              <label className="text-slate-500 font-semibold">Bulk Set All:</label>
              <select
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value as TriState)}
                className="p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
              >
                <option value="Yes">Yes (All Complete)</option>
                <option value="No">No (Missing)</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
              <button
                type="button"
                onClick={() => handleBulkSetAll(bulkStatusValue)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          )}
        </div>

        {/* Permission Lock Banner */}
        {!isEditable && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>View Only Mode:</strong> As a {currentRole === 'subject_teacher' ? 'Subject Teacher' : 'Class Teacher'}, you can only update Books & Homework logs for your assigned classes and subjects. Use the quick-jump buttons above or switch to an assigned class/subject.
            </span>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* SECTION 11.1: REPEATED MISSING NOTEBOOK & BOOK ALERT BANNER */}
      {notebookAlerts.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-950 uppercase tracking-wide">
                  REPEATED NOTEBOOK ISSUE – PARENT ATTENTION REQUIRED
                </h3>
                <p className="text-xs text-amber-900">
                  Students missing a required notebook or textbook 3 or more times in the same subject.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600 text-white">
              {notebookAlerts.length} Active Alerts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notebookAlerts.map((item) => {
              const alert = item.alerts.find(
                (a) => a.category === 'Repeated Missing Notebook' || a.category === 'Repeated Missing Textbook'
              );
              return (
                <div
                  key={item.student.id}
                  className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-xs flex items-start justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {item.student.name}{' '}
                      <span className="text-slate-400 font-normal">
                        (Roll #{item.student.rollNo} • {item.student.className}-{item.student.sectionName})
                      </span>
                    </div>
                    <p className="text-amber-900 text-[11px] mt-1 font-medium">{alert?.description}</p>
                    <div className="mt-2 text-slate-600 flex items-center gap-1 font-mono text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>Parent: {item.student.parentContact}</span>
                    </div>
                  </div>

                  {currentRole !== 'subject_teacher' && (
                    <button
                      type="button"
                      onClick={() => onSelectStudent(item.student.id)}
                      className="px-2.5 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg shrink-0 ml-2"
                    >
                      Action →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Subject Inspection Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            {selectedClass?.name} - Section {selectedSectionId} • {selectedSubject} Roster • {classStudents.length} Students
          </span>
          <span className="text-slate-500 hidden sm:inline">
            Select Yes, No, or Not Applicable from the dropdown menus and click Save
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/60 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-16">Roll #</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3 text-center">Textbook Brought</th>
                <th className="py-2.5 px-3 text-center">Notebook Brought</th>
                <th className="py-2.5 px-3 text-center">Homework Done</th>
                <th className="py-2.5 px-3 text-center">Classwork Done</th>
                <th className="py-2.5 px-3">Teacher Remarks</th>
                {currentRole !== 'subject_teacher' && (
                  <th className="py-2.5 px-3 text-right">Portfolio</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={currentRole !== 'subject_teacher' ? 8 : 7} className="py-8 text-center text-slate-400">
                    No active students found in {selectedClass?.name} - Section {selectedSectionId}.
                  </td>
                </tr>
              ) : (
                classStudents.map((std) => {
                  const state = formState[std.id] || DEFAULT_ENTRY;

                  return (
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{std.rollNo}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{std.name}</td>

                      {/* Textbook Dropdown */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          disabled={!isEditable}
                          value={state.textbookBrought}
                          onChange={(e) =>
                            updateStudentField(std.id, 'textbookBrought', e.target.value as TriState)
                          }
                          className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getDropdownStyle(
                            state.textbookBrought,
                            true
                          )}`}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="Not Applicable">Not Applicable</option>
                        </select>
                      </td>

                      {/* Notebook Dropdown */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          disabled={!isEditable}
                          value={state.notebookBrought}
                          onChange={(e) =>
                            updateStudentField(std.id, 'notebookBrought', e.target.value as TriState)
                          }
                          className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getDropdownStyle(
                            state.notebookBrought,
                            true
                          )}`}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="Not Applicable">Not Applicable</option>
                        </select>
                      </td>

                      {/* Homework Dropdown */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          disabled={!isEditable}
                          value={state.homeworkCompleted}
                          onChange={(e) =>
                            updateStudentField(std.id, 'homeworkCompleted', e.target.value as TriState)
                          }
                          className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getDropdownStyle(
                            state.homeworkCompleted,
                            false
                          )}`}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="Not Applicable">Not Applicable</option>
                        </select>
                      </td>

                      {/* Classwork Dropdown */}
                      <td className="py-2.5 px-3 text-center">
                        <select
                          disabled={!isEditable}
                          value={state.classworkCompleted}
                          onChange={(e) =>
                            updateStudentField(std.id, 'classworkCompleted', e.target.value as TriState)
                          }
                          className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getDropdownStyle(
                            state.classworkCompleted,
                            false
                          )}`}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="Not Applicable">Not Applicable</option>
                        </select>
                      </td>

                      {/* Remarks */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          disabled={!isEditable}
                          placeholder="Observation notes..."
                          value={state.remarks}
                          onChange={(e) => {
                            const val = e.target.value;
                            isDirtyRef.current = true;
                            setFormState((prev) => ({
                              ...prev,
                              [std.id]: { ...(prev[std.id] || DEFAULT_ENTRY), remarks: val },
                            }));
                          }}
                          className="w-full min-w-[140px] p-1.5 px-2 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                        />
                      </td>

                      {currentRole !== 'subject_teacher' && (
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectStudent(std.id)}
                            className="text-emerald-700 font-bold hover:underline"
                          >
                            View →
                          </button>
                        </td>
                      )}
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
