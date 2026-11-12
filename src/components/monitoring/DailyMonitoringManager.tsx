import React, { useState, useMemo } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { DailySubjectMonitoring, TriState, Student } from '../../types';
import {
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  Plus,
  Phone,
  Filter,
} from 'lucide-react';

export const DailyMonitoringManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser, canEnterMarksForSubject } = useAuth();
  const classes = StorageService.getClasses();
  const subjects = StorageService.getSubjects();
  const allStudents = StorageService.getStudents();
  const [monitoringRecords, setMonitoringRecords] = useState<DailySubjectMonitoring[]>(() =>
    StorageService.getMonitoring()
  );

  // Determine initial class, section & subject from teacher profile
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

  const initialSubject = useMemo(() => {
    if (currentUser?.assignedSubjects && currentUser.assignedSubjects.length > 0) {
      return currentUser.assignedSubjects[0].subjectName;
    }
    if (currentUser?.selectedSubjectNames && currentUser.selectedSubjectNames.length > 0) {
      return currentUser.selectedSubjectNames[0];
    }
    return subjects[0]?.name || 'Mathematics';
  }, [currentUser, subjects]);

  // Active Filters & Selection
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSectionId);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Target class students
  const classStudents = useMemo(() => {
    return allStudents.filter(
      (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId && s.status === 'Active'
    );
  }, [allStudents, selectedClassId, selectedSectionId]);

  // Form state map: studentId -> fields
  const [formState, setFormState] = useState<Record<string, {
    textbookBrought: TriState;
    notebookBrought: TriState;
    homeworkCompleted: TriState;
    classworkCompleted: TriState;
    remarks: string;
  }>>({});

  // Initialize form state
  React.useEffect(() => {
    const existing = monitoringRecords.filter(
      (m) =>
        m.classId === selectedClassId &&
        m.sectionId === selectedSectionId &&
        m.subjectName === selectedSubject &&
        m.date === selectedDate
    );

    const initial: Record<string, any> = {};
    classStudents.forEach((std) => {
      const match = existing.find((e) => e.studentId === std.id);
      if (match) {
        initial[std.id] = {
          textbookBrought: match.textbookBrought,
          notebookBrought: match.notebookBrought,
          homeworkCompleted: match.homeworkCompleted,
          classworkCompleted: match.classworkCompleted,
          remarks: match.remarks || '',
        };
      } else {
        // Defaults to complete
        initial[std.id] = {
          textbookBrought: 'Yes',
          notebookBrought: 'Yes',
          homeworkCompleted: 'Yes',
          classworkCompleted: 'Yes',
          remarks: '',
        };
      }
    });

    setFormState(initial);
  }, [selectedClassId, selectedSectionId, selectedSubject, selectedDate, classStudents, monitoringRecords]);

  const updateStudentField = (
    studentId: string,
    field: 'textbookBrought' | 'notebookBrought' | 'homeworkCompleted' | 'classworkCompleted',
    val: TriState
  ) => {
    setFormState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val,
      },
    }));
  };

  const handleSaveMonitoring = () => {
    classStudents.forEach((std) => {
      const data = formState[std.id];
      if (!data) return;

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
        requiredMaterialBrought: 'Yes',
        remarks: data.remarks,
      });
    });

    setMonitoringRecords(StorageService.getMonitoring());
    setSaveSuccessMsg(`Daily monitoring records logged for ${selectedSubject} on ${selectedDate}!`);
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
                Track required textbooks, notebooks, and assignments • 3x missing in a week triggers ORANGE ALERT (Section 11.1)
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveMonitoring}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors text-xs self-start md:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>Save Class Inspection Log</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Inspection Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
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
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-slate-500 mb-1 font-semibold">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full sm:w-auto p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-emerald-800 sm:min-w-[200px]"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
                  REPEATED NOTEBOOK ISSUE – PARENT ATTENTION REQUIRED (SECTION 11.1)
                </h3>
                <p className="text-xs text-amber-900">
                  Students missing a required notebook or textbook 3 or more times this school week in the same subject.
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

                  <button
                    onClick={() => onSelectStudent(item.student.id)}
                    className="px-2.5 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg shrink-0 ml-2"
                  >
                    Action →
                  </button>
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
            {selectedSubject} Inspection Roster • {classStudents.length} Students
          </span>
          <span className="text-slate-500">
            Click Yes / No to toggle item status for today
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
                <th className="py-2.5 px-3 text-right">Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std) => {
                const state = formState[std.id] || {
                  textbookBrought: 'Yes',
                  notebookBrought: 'Yes',
                  homeworkCompleted: 'Yes',
                  classworkCompleted: 'Yes',
                  remarks: '',
                };

                return (
                  <tr key={std.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{std.rollNo}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{std.name}</td>

                    {/* Textbook */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          updateStudentField(std.id, 'textbookBrought', state.textbookBrought === 'Yes' ? 'No' : 'Yes')
                        }
                        className={`px-3 py-1 rounded-lg font-bold text-xs ${
                          state.textbookBrought === 'Yes'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-600 text-white shadow-xs'
                        }`}
                      >
                        {state.textbookBrought}
                      </button>
                    </td>

                    {/* Notebook */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          updateStudentField(std.id, 'notebookBrought', state.notebookBrought === 'Yes' ? 'No' : 'Yes')
                        }
                        className={`px-3 py-1 rounded-lg font-bold text-xs ${
                          state.notebookBrought === 'Yes'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-600 text-white shadow-xs'
                        }`}
                      >
                        {state.notebookBrought}
                      </button>
                    </td>

                    {/* Homework */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          updateStudentField(std.id, 'homeworkCompleted', state.homeworkCompleted === 'Yes' ? 'No' : 'Yes')
                        }
                        className={`px-3 py-1 rounded-lg font-bold text-xs ${
                          state.homeworkCompleted === 'Yes'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {state.homeworkCompleted}
                      </button>
                    </td>

                    {/* Classwork */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          updateStudentField(std.id, 'classworkCompleted', state.classworkCompleted === 'Yes' ? 'No' : 'Yes')
                        }
                        className={`px-3 py-1 rounded-lg font-bold text-xs ${
                          state.classworkCompleted === 'Yes'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {state.classworkCompleted}
                      </button>
                    </td>

                    {/* Remarks */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        placeholder="Observation notes..."
                        value={state.remarks}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormState((prev) => ({
                            ...prev,
                            [std.id]: { ...prev[std.id], remarks: val },
                          }));
                        }}
                        className="w-full p-1 px-2 rounded border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                      />
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectStudent(std.id)}
                        className="text-emerald-700 font-bold hover:underline"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
