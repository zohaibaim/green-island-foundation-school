import React, { useState, useMemo } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { Examination, ExaminationCategory, StudentMarkRecord, Student } from '../../types';
import {
  GraduationCap,
  Plus,
  Save,
  TrendingDown,
  AlertTriangle,
  Download,
  Table,
  User,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ExaminationsManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { canEnterMarksForSubject, canAccessAdminSettings, currentUser } = useAuth();
  const settings = StorageService.getSettings();
  const classes = StorageService.getClasses();
  const subjects = StorageService.getSubjects();
  const allStudents = StorageService.getStudents();
  const [examinations, setExaminations] = useState<Examination[]>(() => StorageService.getExaminations());
  const [allMarks, setAllMarks] = useState<StudentMarkRecord[]>(() => StorageService.getMarks());

  // Active Selected Exam
  const [selectedExamId, setSelectedExamId] = useState<string>(() => examinations[0]?.id || '');
  const [entryMode, setEntryMode] = useState<'bulk' | 'individual'>('bulk');
  const [saveMessage, setSaveMessage] = useState<string>('');

  // New Exam Modal
  const [isNewExamModalOpen, setIsNewExamModalOpen] = useState(false);
  const [newExamForm, setNewExamForm] = useState({
    name: 'Term 1 Mid-Term Test',
    category: 'Mid-Term Examination' as ExaminationCategory,
    classId: 'c9',
    sectionId: 'A',
    academicYear: '2026-2027',
    date: new Date().toISOString().split('T')[0],
  });

  const selectedExam = examinations.find((e) => e.id === selectedExamId) || examinations[0];

  // Target students for the selected exam's class and section
  const examStudents = useMemo(() => {
    if (!selectedExam) return [];
    return allStudents.filter(
      (s) => s.classId === selectedExam.classId && s.sectionId === selectedExam.sectionId && s.status === 'Active'
    );
  }, [selectedExam, allStudents]);

  // Bulk marks matrix state: studentId -> { [subjectName]: obtainedMarks }
  const [matrixMarks, setMatrixMarks] = useState<Record<string, Record<string, string>>>({});

  // Sync matrix state from database
  React.useEffect(() => {
    if (!selectedExam) return;
    const initialMatrix: Record<string, Record<string, string>> = {};

    examStudents.forEach((std) => {
      initialMatrix[std.id] = {};
      selectedExam.subjects.forEach((subj) => {
        const existingMark = allMarks.find(
          (m) =>
            m.examinationId === selectedExam.id &&
            m.studentId === std.id &&
            m.subjectName === subj.subjectName
        );
        initialMatrix[std.id][subj.subjectName] =
          existingMark && existingMark.obtainedMarks !== null ? String(existingMark.obtainedMarks) : '';
      });
    });

    setMatrixMarks(initialMatrix);
  }, [selectedExam, examStudents, allMarks]);

  // Calculate grade helper
  const calculateGrade = (pct: number | null) => {
    if (pct === null) return 'N/A';
    if (pct >= 90) return 'A*';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    return 'U';
  };

  // Bulk input change handler
  const handleMarkChange = (studentId: string, subjectName: string, value: string) => {
    setMatrixMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectName]: value,
      },
    }));
  };

  // Save Bulk Marks (Section 9.1: Auto calculation of totals, grades, low marks)
  const handleSaveMarks = () => {
    if (!selectedExam) return;

    const recordsToSave: Omit<StudentMarkRecord, 'id'>[] = [];

    examStudents.forEach((std) => {
      const studentSubjMarks = matrixMarks[std.id] || {};

      selectedExam.subjects.forEach((subj) => {
        const rawVal = studentSubjMarks[subj.subjectName];
        const numVal = rawVal !== undefined && rawVal !== '' ? parseFloat(rawVal) : null;
        const pct = numVal !== null ? Math.round((numVal / subj.totalMarks) * 100) : null;
        const grade = calculateGrade(pct);

        recordsToSave.push({
          examinationId: selectedExam.id,
          studentId: std.id,
          studentName: std.name,
          rollNo: std.rollNo,
          classId: selectedExam.classId,
          sectionId: selectedExam.sectionId,
          subjectName: subj.subjectName,
          totalMarks: subj.totalMarks,
          obtainedMarks: numVal,
          percentage: pct,
          grade,
          remarks: pct !== null && pct < 60 ? 'Obtained below 60%. Needs academic intervention.' : 'Satisfactory result.',
          teacherId: currentUser?.id || 'staff',
          teacherName: currentUser?.name || 'Authorized Staff',
          date: selectedExam.date,
        });
      });
    });

    StorageService.saveBulkMarks(recordsToSave);
    setAllMarks(StorageService.getMarks());
    setSaveMessage('Examination marks saved successfully! Centralized alert engine updated.');
    setTimeout(() => setSaveMessage(''), 4000);
  };

  // Export marks sheet to Excel
  const handleExportMarksExcel = () => {
    if (!selectedExam) return;

    const exportRows = examStudents.map((std) => {
      const studentSubjMarks = matrixMarks[std.id] || {};
      const row: Record<string, any> = {
        'Roll No': std.rollNo,
        'Student Name': std.name,
      };

      let totalObtained = 0;
      let totalMax = 0;
      let recordedCount = 0;

      selectedExam.subjects.forEach((subj) => {
        const val = studentSubjMarks[subj.subjectName];
        row[`${subj.subjectName} (/${subj.totalMarks})`] = val !== '' ? val : 'N/A';
        if (val !== '' && !isNaN(Number(val))) {
          totalObtained += Number(val);
          totalMax += subj.totalMarks;
          recordedCount++;
        }
      });

      const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
      row['Total Obtained'] = totalObtained;
      row['Maximum Marks'] = totalMax;
      row['Overall %'] = overallPct + '%';
      row['Grade'] = calculateGrade(overallPct);
      row['Below 60% Alert'] = overallPct < 60 ? 'RED ALERT' : 'PASS';

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exam Marks');
    XLSX.writeFile(workbook, `${selectedExam.name.replace(/\s+/g, '_')}_Marks.xlsx`);
  };

  // Create new examination handler
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    const selClass = classes.find((c) => c.id === newExamForm.classId);
    const standardSubjects = [
      { subjectName: 'English Language & Literature', totalMarks: 100, passMarks: 60, teacherName: 'Ms. Aisha Siddiqui' },
      { subjectName: 'Mathematics', totalMarks: 100, passMarks: 60, teacherName: 'Mr. Farhan Zaidi' },
      { subjectName: 'Physics', totalMarks: 100, passMarks: 60, teacherName: 'Engr. Waqas Khan' },
      { subjectName: 'Chemistry', totalMarks: 100, passMarks: 60, teacherName: 'Dr. Shahida Bano' },
      { subjectName: 'Computer Science', totalMarks: 100, passMarks: 60, teacherName: 'Mr. Nabeel Sheikh' },
      { subjectName: 'Urdu', totalMarks: 100, passMarks: 60, teacherName: 'Mrs. Parveen Akhtar' },
      { subjectName: 'Islamiyat', totalMarks: 100, passMarks: 60, teacherName: 'Qari Muhammad Asif' },
    ];

    const created = StorageService.addExamination({
      ...newExamForm,
      subjects: standardSubjects,
    });

    setExaminations(StorageService.getExaminations());
    setSelectedExamId(created.id);
    setIsNewExamModalOpen(false);
  };

  // Summary Calculations for Selected Exam
  const examStats = useMemo(() => {
    if (!selectedExam) return { totalStudents: 0, classAverage: 0, lowMarksCount: 0 };
    let totalPctSum = 0;
    let studentsCounted = 0;
    let lowMarks = 0;

    examStudents.forEach((std) => {
      const stdMarks = matrixMarks[std.id] || {};
      let stdTotal = 0;
      let stdMax = 0;
      selectedExam.subjects.forEach((subj) => {
        const val = stdMarks[subj.subjectName];
        if (val !== '' && !isNaN(Number(val))) {
          const num = Number(val);
          const pct = (num / subj.totalMarks) * 100;
          if (pct < 60) lowMarks++;
          stdTotal += num;
          stdMax += subj.totalMarks;
        }
      });
      if (stdMax > 0) {
        totalPctSum += (stdTotal / stdMax) * 100;
        studentsCounted++;
      }
    });

    return {
      totalStudents: examStudents.length,
      classAverage: studentsCounted > 0 ? Math.round(totalPctSum / studentsCounted) : 0,
      lowMarksCount: lowMarks,
    };
  }, [selectedExam, examStudents, matrixMarks]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Exam Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Examination & Academic Marks Management
              </h2>
              <p className="text-xs text-slate-500">
                Spreadsheet-style bulk marks entry • Automatic percentage & grade computation • Automatic &lt;60% RED ALERTS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportMarksExcel}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Marks Sheet</span>
            </button>

            {canAccessAdminSettings() && (
              <button
                onClick={() => setIsNewExamModalOpen(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Examination</span>
              </button>
            )}
          </div>
        </div>

        {/* Examination Selector & Controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-auto">
              <label className="block text-slate-500 mb-1 font-semibold">Active Examination</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full sm:w-auto p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900 text-xs sm:min-w-[260px]"
              >
                {examinations.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} ({exam.category})
                  </option>
                ))}
              </select>
            </div>

            {selectedExam && (
              <div className="flex flex-wrap items-center gap-3 pt-1 sm:pt-4 text-xs text-slate-600">
                <span>Class: <strong>{classes.find((c) => c.id === selectedExam.classId)?.name}</strong></span>
                <span>Section: <strong>{selectedExam.sectionId}</strong></span>
                <span>Date: <strong>{selectedExam.date}</strong></span>
              </div>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center pt-2">
            <button
              onClick={handleSaveMarks}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save & Calculate Marks</span>
            </button>
          </div>
        </div>

        {saveMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveMessage}</span>
          </div>
        )}
      </div>

      {/* SECTION 9.1: AUTOMATIC LOW MARKS ALERT INDICATOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500">Total Enrolled Students</span>
            <div className="text-xl font-bold text-slate-900">{examStats.totalStudents}</div>
          </div>
          <User className="w-6 h-6 text-slate-300" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500">Class Examination Average</span>
            <div className="text-xl font-bold text-emerald-700">{examStats.classAverage}%</div>
          </div>
          <GraduationCap className="w-6 h-6 text-emerald-600" />
        </div>

        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-rose-800 font-semibold">Low Marks (&lt;60%) Flags</span>
            <div className="text-xl font-bold text-rose-600">
              {examStats.lowMarksCount} Entries Flagged
            </div>
          </div>
          <TrendingDown className="w-6 h-6 text-rose-600" />
        </div>
      </div>

      {/* SPREADSHEET-STYLE BULK MARKS ENTRY TABLE (Section 9 - Method B) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-800">
              Spreadsheet Bulk Marks Entry Grid
            </span>{' '}
            <span className="text-slate-500">
              (Scores below 60% automatically highlight in RED)
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ≥60% Pass
            </span>
            <span className="flex items-center gap-1 text-rose-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> &lt;60% RED ALERT
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200 w-16">Roll #</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-44">Student Name</th>
                {selectedExam?.subjects.map((subj) => (
                  <th key={subj.subjectName} className="py-2.5 px-3 border-r border-slate-200 text-center min-w-[110px]">
                    <div>{subj.subjectName}</div>
                    <div className="text-[10px] text-slate-400 font-normal">Max: {subj.totalMarks}</div>
                  </th>
                ))}
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-20">Total</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-20">Overall %</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-16">Grade</th>
                <th className="py-2.5 px-3 text-right">Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {examStudents.length === 0 ? (
                <tr>
                  <td colSpan={selectedExam?.subjects.length + 5} className="py-8 text-center text-slate-400">
                    No students registered in this class.
                  </td>
                </tr>
              ) : (
                examStudents.map((std) => {
                  const stdMarks = matrixMarks[std.id] || {};
                  let totalObt = 0;
                  let totalMax = 0;
                  let hasScores = false;

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-700 border-r border-slate-200">
                        {std.rollNo}
                      </td>

                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                        <span className="cursor-pointer hover:text-emerald-700" onClick={() => onSelectStudent(std.id)}>
                          {std.name}
                        </span>
                      </td>

                      {/* Subject Mark Inputs */}
                      {selectedExam?.subjects.map((subj) => {
                        const rawVal = stdMarks[subj.subjectName] || '';
                        const numVal = rawVal !== '' ? parseFloat(rawVal) : null;
                        const pct = numVal !== null ? (numVal / subj.totalMarks) * 100 : null;
                        const isLow = pct !== null && pct < 60;

                        if (numVal !== null) {
                          totalObt += numVal;
                          totalMax += subj.totalMarks;
                          hasScores = true;
                        }

                        return (
                          <td
                            key={subj.subjectName}
                            className={`py-1.5 px-2 text-center border-r border-slate-200 ${
                              isLow ? 'bg-rose-50/80' : ''
                            }`}
                          >
                            <input
                              type="number"
                              min="0"
                              max={subj.totalMarks}
                              value={rawVal}
                              onChange={(e) => handleMarkChange(std.id, subj.subjectName, e.target.value)}
                              placeholder="-"
                              className={`w-16 p-1 text-center font-mono font-bold rounded border text-xs ${
                                isLow
                                  ? 'border-rose-400 bg-rose-100 text-rose-800'
                                  : 'border-slate-200 bg-white text-slate-800 focus:border-emerald-500'
                              }`}
                            />
                            {pct !== null && (
                              <div
                                className={`text-[10px] font-bold mt-0.5 ${
                                  isLow ? 'text-rose-600' : 'text-slate-400'
                                }`}
                              >
                                {Math.round(pct)}%
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Cumulative Total */}
                      <td className="py-2 px-3 text-center font-mono font-bold border-r border-slate-200 text-slate-800">
                        {hasScores ? `${totalObt}/${totalMax}` : '-'}
                      </td>

                      {/* Cumulative % */}
                      <td className="py-2 px-3 text-center font-bold border-r border-slate-200">
                        {hasScores ? (
                          <span
                            className={`px-2 py-0.5 rounded ${
                              (totalObt / totalMax) * 100 < 60
                                ? 'bg-rose-600 text-white font-extrabold'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {Math.round((totalObt / totalMax) * 100)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Grade */}
                      <td className="py-2 px-3 text-center font-extrabold border-r border-slate-200 text-slate-800">
                        {hasScores ? calculateGrade(Math.round((totalObt / totalMax) * 100)) : '-'}
                      </td>

                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => onSelectStudent(std.id)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                        >
                          View →
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

      {/* New Exam Modal */}
      {isNewExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Create Examination Schedule
              </h3>
              <button
                onClick={() => setIsNewExamModalOpen(false)}
                className="text-slate-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Examination Title *</label>
                <input
                  type="text"
                  required
                  value={newExamForm.name}
                  onChange={(e) => setNewExamForm({ ...newExamForm, name: e.target.value })}
                  placeholder="e.g. Mid-Term Examination 2026"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Examination Category *</label>
                <select
                  value={newExamForm.category}
                  onChange={(e) => setNewExamForm({ ...newExamForm, category: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Monthly Tests">Monthly Tests</option>
                  <option value="Weekly Tests">Weekly Tests</option>
                  <option value="First Term Examination">First Term Examination</option>
                  <option value="Mid-Term Examination">Mid-Term Examination</option>
                  <option value="Second Term Examination">Second Term Examination</option>
                  <option value="Final Term Examination">Final Term Examination</option>
                  <option value="Annual Examination">Annual Examination</option>
                  <option value="Class Assessments">Class Assessments</option>
                  <option value="Subject Assignments">Subject Assignments</option>
                  <option value="Custom Examinations">Custom Examinations</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Class *</label>
                  <select
                    value={newExamForm.classId}
                    onChange={(e) => setNewExamForm({ ...newExamForm, classId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Section *</label>
                  <select
                    value={newExamForm.sectionId}
                    onChange={(e) => setNewExamForm({ ...newExamForm, sectionId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Examination Date *</label>
                <input
                  type="date"
                  required
                  value={newExamForm.date}
                  onChange={(e) => setNewExamForm({ ...newExamForm, date: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewExamModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                >
                  Schedule Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
