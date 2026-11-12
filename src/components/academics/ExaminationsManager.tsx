import React, { useState, useMemo, useEffect } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { ExaminationCategory, StudentMarkRecord, Student } from '../../types';
import { OFFICIAL_EXAM_TERMS } from '../../db/initialData';
import {
  GraduationCap,
  Save,
  CheckCircle2,
  AlertTriangle,
  Download,
  Table,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Award,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ExaminationsManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser, canEnterMarksForSubject } = useAuth();
  const classes = StorageService.getClasses();
  const subjects = StorageService.getSubjects();
  const allStudents = StorageService.getStudents();
  const [allMarks, setAllMarks] = useState<StudentMarkRecord[]>(() => StorageService.getMarks());

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

  const initialSubject = useMemo(() => {
    if (currentUser?.assignedSubjects && currentUser.assignedSubjects.length > 0) {
      return currentUser.assignedSubjects[0].subjectName;
    }
    if (currentUser?.selectedSubjectNames && currentUser.selectedSubjectNames.length > 0) {
      return currentUser.selectedSubjectNames[0];
    }
    return subjects[0]?.name || 'Mathematics';
  }, [currentUser, subjects]);

  // Selected Exam Term (Default to 1st Monthly Test)
  const [selectedTermId, setSelectedTermId] = useState<string>('exam-1st-monthly');
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSectionId);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [activeView, setActiveView] = useState<'subject_entry' | 'consolidated_sheet'>('subject_entry');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Find currently active exam definition
  const currentExamTerm = useMemo(() => {
    return OFFICIAL_EXAM_TERMS.find((t) => t.id === selectedTermId) || OFFICIAL_EXAM_TERMS[0];
  }, [selectedTermId]);

  // Total Marks for current subject (defaults to exam default: 25 or 100)
  const [totalMarksInput, setTotalMarksInput] = useState<number>(currentExamTerm.defaultTotalMarks);

  // Update total marks input when exam term changes
  useEffect(() => {
    setTotalMarksInput(currentExamTerm.defaultTotalMarks);
  }, [currentExamTerm]);

  // Target students for the selected class and section
  const targetStudents = useMemo(() => {
    return allStudents.filter(
      (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId && s.status === 'Active'
    );
  }, [allStudents, selectedClassId, selectedSectionId]);

  // Marks map: studentId -> { obtainedMarks: string, remarks: string }
  const [marksMap, setMarksMap] = useState<Record<string, { obtained: string; remarks: string }>>({});

  // Populate existing marks when exam, class, section, or subject changes
  useEffect(() => {
    const newMap: Record<string, { obtained: string; remarks: string }> = {};

    targetStudents.forEach((std) => {
      const existing = allMarks.find(
        (m) =>
          m.examinationId === selectedTermId &&
          m.studentId === std.id &&
          m.subjectName === selectedSubject
      );

      if (existing && existing.obtainedMarks !== null) {
        newMap[std.id] = {
          obtained: String(existing.obtainedMarks),
          remarks: existing.remarks || '',
        };
      } else {
        newMap[std.id] = {
          obtained: '',
          remarks: '',
        };
      }
    });

    setMarksMap(newMap);
  }, [selectedTermId, selectedClassId, selectedSectionId, selectedSubject, targetStudents, allMarks]);

  // Grade calculation helper
  const calculateGrade = (pct: number | null): { grade: string; color: string; isLow: boolean } => {
    if (pct === null || isNaN(pct)) return { grade: 'N/A', color: 'bg-slate-100 text-slate-600', isLow: false };
    if (pct >= 90) return { grade: 'A*', color: 'bg-emerald-100 text-emerald-800 font-bold', isLow: false };
    if (pct >= 80) return { grade: 'A', color: 'bg-emerald-50 text-emerald-700 font-bold', isLow: false };
    if (pct >= 70) return { grade: 'B', color: 'bg-blue-100 text-blue-800 font-bold', isLow: false };
    if (pct >= 60) return { grade: 'C', color: 'bg-amber-100 text-amber-800 font-bold', isLow: false };
    return { grade: 'Fail / U', color: 'bg-rose-600 text-white font-extrabold', isLow: true };
  };

  // Handle saving marks
  const handleSaveMarks = () => {
    const totalMax = Number(totalMarksInput) || 100;
    const recordsToSave: Omit<StudentMarkRecord, 'id'>[] = [];

    targetStudents.forEach((std) => {
      const entry = marksMap[std.id];
      const rawVal = entry?.obtained?.trim();
      const numVal = rawVal !== undefined && rawVal !== '' ? parseFloat(rawVal) : null;
      const pct = numVal !== null ? Math.round((numVal / totalMax) * 100) : null;
      const { grade, isLow } = calculateGrade(pct);

      recordsToSave.push({
        examinationId: selectedTermId,
        studentId: std.id,
        studentName: std.name,
        rollNo: std.rollNo,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectName: selectedSubject,
        totalMarks: totalMax,
        obtainedMarks: numVal,
        percentage: pct,
        grade,
        remarks: entry?.remarks || (isLow ? 'Obtained below 60%. Needs academic intervention.' : 'Satisfactory result.'),
        teacherId: currentUser?.id || 'staff',
        teacherName: currentUser?.name || 'Authorized Staff',
        date: new Date().toISOString().split('T')[0],
      });
    });

    StorageService.saveBulkMarks(recordsToSave);
    setAllMarks(StorageService.getMarks());
    setSaveSuccessMsg(
      `✓ Marks for ${selectedSubject} (${selectedClass?.name || 'Class'} - Sec ${selectedSectionId}) saved successfully to database!`
    );
    setTimeout(() => setSaveSuccessMsg(''), 4500);
  };

  // Export Consolidated Mark Sheet to Excel (.xlsx)
  const handleExportConsolidatedExcel = () => {
    const exportRows = targetStudents.map((std) => {
      const row: Record<string, any> = {
        'Roll No': std.rollNo,
        'Admission No': std.admissionNo,
        'Student Name': std.name,
        'Father Name': std.fatherName,
      };

      let studentTotalObtained = 0;
      let studentTotalMax = 0;

      subjects.forEach((subj) => {
        const mark = allMarks.find(
          (m) =>
            m.examinationId === selectedTermId &&
            m.studentId === std.id &&
            m.subjectName === subj.name
        );
        if (mark && mark.obtainedMarks !== null) {
          row[subj.name] = `${mark.obtainedMarks}/${mark.totalMarks} (${mark.percentage}%)`;
          studentTotalObtained += mark.obtainedMarks;
          studentTotalMax += mark.totalMarks;
        } else {
          row[subj.name] = '-';
        }
      });

      const overallPct = studentTotalMax > 0 ? Math.round((studentTotalObtained / studentTotalMax) * 100) : null;
      row['Total Obtained'] = studentTotalObtained;
      row['Max Marks'] = studentTotalMax;
      row['Overall %'] = overallPct !== null ? `${overallPct}%` : 'N/A';
      row['Overall Grade'] = calculateGrade(overallPct).grade;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, currentExamTerm.name);
    XLSX.writeFile(
      workbook,
      `Green_Island_${currentExamTerm.name.replace(/\s+/g, '_')}_Class_${selectedClassId}_Sec_${selectedSectionId}.xlsx`
    );
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      {/* 4 Standard School Exam Terms Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                School Examination & Marks Management
              </h2>
              <p className="text-xs text-slate-500">
                Official Green Island Foundation School Terms • 1st Monthly, Mid-Term, 2nd Monthly & Final Term
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveView('subject_entry')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'subject_entry'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Marks Entry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('consolidated_sheet')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeView === 'consolidated_sheet'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Class Consolidated Sheet</span>
            </button>
            {activeView === 'subject_entry' ? (
              <button
                type="button"
                onClick={handleSaveMarks}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Marks to Database</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportConsolidatedExcel}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export to Excel (.xlsx)</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Standard Exam Term Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Select Examination Term:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {OFFICIAL_EXAM_TERMS.map((term) => {
              const isSelected = selectedTermId === term.id;
              return (
                <button
                  key={term.id}
                  type="button"
                  onClick={() => setSelectedTermId(term.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs ring-2 ring-emerald-500/30'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">{term.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {term.defaultTotalMarks} Marks
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {term.defaultTotalMarks === 25 ? 'Monthly Assessment' : 'Comprehensive Examination'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Class, Section, Subject & Total Marks Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800 min-w-[140px]"
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

          {activeView === 'subject_entry' && (
            <>
              <div className="min-w-[180px]">
                <label className="block text-slate-500 mb-1 font-semibold">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-emerald-800"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Total Max Marks</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={totalMarksInput}
                  onChange={(e) => setTotalMarksInput(Number(e.target.value) || 100)}
                  className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-slate-800 w-24"
                />
              </div>
            </>
          )}

          <div className="sm:ml-auto mt-2 sm:mt-0 flex items-center gap-2">
            <span className="text-slate-500 text-xs">
              Students in Class: <strong>{targetStudents.length}</strong>
            </span>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* VIEW 1: SUBJECT MARKS ENTRY TABLE */}
      {activeView === 'subject_entry' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>
              {currentExamTerm.name} • <strong>{selectedSubject}</strong> • {selectedClass?.name} - Section {selectedSectionId}
            </span>
            <span className="text-slate-500 hidden sm:inline">
              Type obtained marks • Grade & % are auto-calculated in real time
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-16">Roll #</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Father Name</th>
                  <th className="py-2.5 px-3 text-center w-28">Max Marks</th>
                  <th className="py-2.5 px-3 text-center w-36">Obtained Marks</th>
                  <th className="py-2.5 px-3 text-center w-20">Percentage</th>
                  <th className="py-2.5 px-3 text-center w-24">Grade</th>
                  <th className="py-2.5 px-3">Teacher Remarks</th>
                  <th className="py-2.5 px-3 text-right">Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No active students found in this class and section.
                    </td>
                  </tr>
                ) : (
                  targetStudents.map((std) => {
                    const entry = marksMap[std.id] || { obtained: '', remarks: '' };
                    const rawVal = entry.obtained.trim();
                    const numVal = rawVal !== '' ? parseFloat(rawVal) : null;
                    const maxVal = Number(totalMarksInput) || 100;
                    const pct = numVal !== null ? Math.round((numVal / maxVal) * 100) : null;
                    const { grade, color, isLow } = calculateGrade(pct);

                    return (
                      <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">{std.rollNo}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{std.name}</div>
                          <div className="text-[11px] text-slate-400">{std.admissionNo}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{std.fatherName}</td>

                        {/* Max Marks */}
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-500">
                          {maxVal}
                        </td>

                        {/* Obtained Marks Input */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={maxVal}
                            placeholder="Marks"
                            value={entry.obtained}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMarksMap((prev) => ({
                                ...prev,
                                [std.id]: { ...prev[std.id], obtained: val },
                              }));
                            }}
                            className={`p-1.5 px-2.5 border rounded-lg text-xs font-mono font-bold text-center w-24 ${
                              isLow
                                ? 'border-rose-400 bg-rose-50 text-rose-900 ring-1 ring-rose-300'
                                : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500'
                            }`}
                          />
                        </td>

                        {/* Percentage */}
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {pct !== null ? (
                            <span className={pct < 60 ? 'text-rose-600' : 'text-emerald-700'}>
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Grade Badge */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2.5 py-0.5 rounded text-xs ${color}`}>
                              {grade}
                            </span>
                            {isLow && (
                              <span className="text-[10px] text-rose-700 font-extrabold flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> &lt;60% Alert
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Teacher Remarks */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder={isLow ? 'Reason for low marks / remedial action...' : 'Optional remark...'}
                            value={entry.remarks}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMarksMap((prev) => ({
                                ...prev,
                                [std.id]: { ...prev[std.id], remarks: val },
                              }));
                            }}
                            className="w-full p-1.5 px-2 rounded border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                          />
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectStudent(std.id)}
                            className="text-emerald-700 font-bold hover:underline"
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
      )}

      {/* VIEW 2: CONSOLIDATED CLASS MARK SHEET ACROSS ALL SUBJECTS */}
      {activeView === 'consolidated_sheet' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>
              Consolidated Class Sheet • {currentExamTerm.name} • {selectedClass?.name} - Section {selectedSectionId}
            </span>
            <span className="text-slate-500">
              Total Students: {targetStudents.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-14">Roll #</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  {subjects.map((s) => (
                    <th key={s.id} className="py-2.5 px-2 text-center truncate max-w-[100px]" title={s.name}>
                      {s.name.split(' ')[0]}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center font-bold">Total Obt</th>
                  <th className="py-2.5 px-3 text-center font-bold">Overall %</th>
                  <th className="py-2.5 px-3 text-center font-bold">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetStudents.length === 0 ? (
                  <tr>
                    <td colSpan={subjects.length + 5} className="py-8 text-center text-slate-400">
                      No active students found in this class and section.
                    </td>
                  </tr>
                ) : (
                  targetStudents.map((std) => {
                    let totalObtained = 0;
                    let totalMax = 0;

                    return (
                      <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">{std.rollNo}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{std.name}</td>

                        {subjects.map((subj) => {
                          const mark = allMarks.find(
                            (m) =>
                              m.examinationId === selectedTermId &&
                              m.studentId === std.id &&
                              m.subjectName === subj.name
                          );

                          if (mark && mark.obtainedMarks !== null) {
                            totalObtained += mark.obtainedMarks;
                            totalMax += mark.totalMarks;
                            const isLow = mark.percentage !== null && mark.percentage < 60;

                            return (
                              <td key={subj.id} className="py-3 px-2 text-center font-mono">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                    isLow ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {mark.obtainedMarks}/{mark.totalMarks}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={subj.id} className="py-3 px-2 text-center text-slate-300 font-mono text-[11px]">
                              -
                            </td>
                          );
                        })}

                        {/* Total Obtained */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                          {totalMax > 0 ? `${totalObtained} / ${totalMax}` : '-'}
                        </td>

                        {/* Overall % */}
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {totalMax > 0 ? (
                            <span
                              className={
                                Math.round((totalObtained / totalMax) * 100) < 60
                                  ? 'text-rose-600 font-extrabold'
                                  : 'text-emerald-700'
                              }
                            >
                              {Math.round((totalObtained / totalMax) * 100)}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Grade */}
                        <td className="py-3 px-3 text-center">
                          {totalMax > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                calculateGrade(Math.round((totalObtained / totalMax) * 100)).color
                              }`}
                            >
                              {calculateGrade(Math.round((totalObtained / totalMax) * 100)).grade}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
