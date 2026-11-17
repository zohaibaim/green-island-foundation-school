import React, { useState, useMemo, useEffect } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { useCloudSync } from '../../hooks/useCloudSync';
import { Examination, ExaminationCategory, StudentMarkRecord, Student } from '../../types';
import { OFFICIAL_EXAM_TERMS } from '../../db/initialData';
import {
  GraduationCap,
  Save,
  CheckCircle2,
  AlertTriangle,
  Download,
  Table,
  Layers,
  Plus,
  Edit3,
  Trash2,
  Lock,
  Calendar,
  Award,
  Sparkles,
  CheckSquare,
  Square,
} from 'lucide-react';
import * as XLSX from 'xlsx';

type PaperConfig = {
  subjectName: string;
  enabled: boolean;
  totalMarks: number;
  passMarks: number;
};

export const ExaminationsManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser, currentRole, canCreateExams, canEnterMarksForSubject } = useAuth();
  const classes = StorageService.getClasses();
  const subjects = StorageService.getSubjects();
  const settings = StorageService.getSettings();

  const [allStudents, setAllStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [allExams, setAllExams] = useState<Examination[]>(() => StorageService.getExaminations());
  const [allMarks, setAllMarks] = useState<StudentMarkRecord[]>(() => StorageService.getMarks());
  const [cloudExamTick, setCloudExamTick] = useState(0);
  const isDirtyRef = React.useRef(false);

  useEffect(() => {
    setAllStudents(StorageService.getStudents());
    setAllExams(StorageService.getExaminations());
    setAllMarks(StorageService.getMarks());
  }, []);

  useCloudSync(() => {
    setAllStudents(StorageService.getStudents());
    setAllExams(StorageService.getExaminations());
    setAllMarks(StorageService.getMarks());
    if (!isDirtyRef.current) {
      setCloudExamTick((t) => t + 1);
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

  // Teacher quick shortcuts (only their assigned class + section + subject combinations)
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

    if (list.length === 0 && (currentUser.selectedSubjectNames?.length || 0) > 0) {
      const clsTokens = currentUser.assignedClasses || [];
      clsTokens.forEach((tok) => {
        const parsed = parseClassToken(tok);
        if (!parsed) return;
        const cls = classes.find((c) => c.id === parsed.classId);
        if (!cls) return;
        (currentUser.selectedSubjectNames || []).forEach((subj) => {
          const key = `${cls.id}|${parsed.sectionId}|${subj}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ classId: cls.id, className: cls.name, sectionId: parsed.sectionId, subjectName: subj });
          }
        });
      });
    }

    return list;
  }, [currentUser, currentRole, classes]);

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

  const [activeView, setActiveView] = useState<'subject_entry' | 'consolidated_sheet' | 'create_exams'>(
    'subject_entry'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSectionId);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [actionErrorMsg, setActionErrorMsg] = useState<string>('');

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const availableSections = selectedClass?.sections || ['A', 'B', 'C', 'D'];

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.id === newClassId);
    if (cls && cls.sections.length > 0 && !cls.sections.includes(selectedSectionId)) {
      setSelectedSectionId(cls.sections[0]);
    }
  };

  // Examinations available for selected class & section
  const examsForSelectedClass = useMemo(() => {
    return allExams.filter(
      (ex) => ex.classId === selectedClassId && (ex.sectionId === 'ALL' || ex.sectionId === selectedSectionId)
    );
  }, [allExams, selectedClassId, selectedSectionId]);

  // Keep selectedExamId valid when class or exams list changes
  useEffect(() => {
    if (examsForSelectedClass.length === 0) {
      setSelectedExamId('');
      return;
    }
    if (!examsForSelectedClass.some((ex) => ex.id === selectedExamId)) {
      setSelectedExamId(examsForSelectedClass[0].id);
    }
  }, [examsForSelectedClass, selectedExamId]);

  const currentExam = useMemo(() => {
    return examsForSelectedClass.find((ex) => ex.id === selectedExamId) || examsForSelectedClass[0] || null;
  }, [examsForSelectedClass, selectedExamId]);

  // Configured papers inside the selected exam
  const examSubjectsList = useMemo(() => {
    if (currentExam && currentExam.subjects && currentExam.subjects.length > 0) {
      return currentExam.subjects;
    }
    return subjects.map((s) => ({
      subjectName: s.name,
      totalMarks: 100,
      passMarks: 60,
      teacherName: 'Assigned Teacher',
    }));
  }, [currentExam, subjects]);

  // Keep selectedSubject aligned with currentExam papers
  useEffect(() => {
    if (examSubjectsList.length === 0) return;
    if (!examSubjectsList.some((p) => p.subjectName === selectedSubject)) {
      const assignedPaper = examSubjectsList.find((p) =>
        canEnterMarksForSubject(p.subjectName, selectedClassId, selectedSectionId)
      );
      setSelectedSubject(assignedPaper ? assignedPaper.subjectName : examSubjectsList[0].subjectName);
    }
  }, [examSubjectsList, selectedClassId, selectedSectionId]);

  const currentPaper = useMemo(() => {
    return examSubjectsList.find((p) => p.subjectName === selectedSubject) || examSubjectsList[0];
  }, [examSubjectsList, selectedSubject]);

  const paperTotalMarks = currentPaper?.totalMarks || 100;
  const passingPct = currentExam?.passingPercentage ?? settings.lowMarksThreshold ?? 60;
  const paperPassMarks = currentPaper?.passMarks ?? Math.round((paperTotalMarks * passingPct) / 100);

  // Strict Permission Check for current (Subject, Class, Section)
  const canEditSelectedMarks = Boolean(
    currentExam && canEnterMarksForSubject(selectedSubject, selectedClassId, selectedSectionId)
  );

  // Target students for selected class & section
  const targetStudents = useMemo(() => {
    return allStudents.filter(
      (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId && s.status === 'Active'
    );
  }, [allStudents, selectedClassId, selectedSectionId]);

  const targetStudentsKey = useMemo(() => targetStudents.map((s) => s.id).join(','), [targetStudents]);

  // Marks map: studentId -> { obtained, remarks }
  const [marksMap, setMarksMap] = useState<Record<string, { obtained: string; remarks: string }>>({});

  useEffect(() => {
    if (!currentExam) {
      setMarksMap({});
      return;
    }
    const existingMarks = StorageService.getMarks();
    const newMap: Record<string, { obtained: string; remarks: string }> = {};

    targetStudents.forEach((std) => {
      const existing = existingMarks.find(
        (m) =>
          m.examinationId === currentExam.id &&
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
    isDirtyRef.current = false;
  }, [currentExam?.id, selectedClassId, selectedSectionId, selectedSubject, targetStudentsKey, cloudExamTick]);

  const calculateGrade = (pct: number | null, customPassPct = passingPct): { grade: string; color: string; isLow: boolean } => {
    if (pct === null || isNaN(pct)) return { grade: 'N/A', color: 'bg-slate-100 text-slate-600', isLow: false };
    const isBelowPass = pct < customPassPct;
    if (pct >= 90) return { grade: 'A*', color: 'bg-emerald-100 text-emerald-800 font-bold', isLow: isBelowPass };
    if (pct >= 80) return { grade: 'A', color: 'bg-emerald-50 text-emerald-700 font-bold', isLow: isBelowPass };
    if (pct >= 70) return { grade: 'B', color: 'bg-blue-100 text-blue-800 font-bold', isLow: isBelowPass };
    if (pct >= 60) return { grade: 'C', color: 'bg-amber-100 text-amber-800 font-bold', isLow: isBelowPass };
    if (!isBelowPass) return { grade: 'Pass', color: 'bg-teal-100 text-teal-800 font-bold', isLow: false };
    return { grade: 'Fail / U', color: 'bg-rose-600 text-white font-extrabold', isLow: true };
  };

  // Handle saving marks
  const handleSaveMarks = () => {
    if (!currentExam || !canEditSelectedMarks) return;
    setActionErrorMsg('');
    const totalMax = Number(paperTotalMarks) || 100;
    const recordsToSave: Omit<StudentMarkRecord, 'id'>[] = [];

    for (const std of targetStudents) {
      const entry = marksMap[std.id];
      const rawVal = entry?.obtained?.trim();
      const numVal = rawVal !== undefined && rawVal !== '' ? parseFloat(rawVal) : null;

      if (numVal !== null && (isNaN(numVal) || numVal < 0 || numVal > totalMax)) {
        setActionErrorMsg(
          `Invalid marks for ${std.name} (Roll #${std.rollNo}): Must be between 0 and ${totalMax}.`
        );
        return;
      }

      const pct = numVal !== null ? Math.round((numVal / totalMax) * 100) : null;
      const { grade, isLow } = calculateGrade(pct, passingPct);

      recordsToSave.push({
        examinationId: currentExam.id,
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
        remarks:
          entry?.remarks ||
          (isLow ? `Obtained below ${passingPct}%. Needs academic support.` : 'Satisfactory result.'),
        teacherId: currentUser?.id || 'staff',
        teacherName: currentUser?.name || 'Authorized Staff',
        date: new Date().toISOString().split('T')[0],
      });
    }

    StorageService.saveBulkMarks(recordsToSave);
    isDirtyRef.current = false;
    setAllMarks(StorageService.getMarks());
    setSaveSuccessMsg(
      `✓ Marks for ${selectedSubject} (${currentExam.name} • ${selectedClass?.name} - Sec ${selectedSectionId}) saved successfully!`
    );
    setTimeout(() => setSaveSuccessMsg(''), 4500);
  };

  // Export Consolidated Mark Sheet to Excel (.xlsx)
  const handleExportConsolidatedExcel = () => {
    if (!currentExam) return;
    const exportRows = targetStudents.map((std) => {
      const row: Record<string, any> = {
        'Roll No': std.rollNo,
        'Admission No': std.admissionNo,
        'Student Name': std.name,
        'Father Name': std.fatherName,
      };

      let studentTotalObtained = 0;
      let studentTotalMax = 0;

      examSubjectsList.forEach((paper) => {
        const mark = allMarks.find(
          (m) =>
            m.examinationId === currentExam.id &&
            m.studentId === std.id &&
            m.subjectName === paper.subjectName
        );
        if (mark && mark.obtainedMarks !== null) {
          row[paper.subjectName] = `${mark.obtainedMarks}/${paper.totalMarks} (${mark.percentage}%)`;
          studentTotalObtained += mark.obtainedMarks;
          studentTotalMax += paper.totalMarks;
        } else {
          row[paper.subjectName] = '-';
        }
      });

      const examMaxMarks = currentExam.totalExamMarks || examSubjectsList.reduce((sum, p) => sum + p.totalMarks, 0);
      const overallPct = studentTotalMax > 0 ? Math.round((studentTotalObtained / studentTotalMax) * 100) : null;
      row['Obtained Total'] = studentTotalObtained;
      row['Exam Total Marks'] = examMaxMarks;
      row['Overall %'] = overallPct !== null ? `${overallPct}%` : 'N/A';
      row['Result'] = overallPct !== null ? (overallPct >= passingPct ? 'PASS' : 'FAIL') : 'N/A';
      row['Overall Grade'] = calculateGrade(overallPct, passingPct).grade;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, currentExam.category.slice(0, 31));
    XLSX.writeFile(
      workbook,
      `Green_Island_${currentExam.name.replace(/\s+/g, '_')}_Class_${selectedClassId}_Sec_${selectedSectionId}.xlsx`
    );
  };

  // =========================================================================
  // PRE-EXAM SETUP & CONFIGURATION STATE (Admin & Principal Only)
  // =========================================================================
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examFormCategory, setExamFormCategory] = useState<ExaminationCategory>('1st Monthly Test');
  const [examFormName, setExamFormName] = useState<string>('1st Monthly Test');
  const [examFormDate, setExamFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [examFormYear, setExamFormYear] = useState<string>(settings.academicYear || '2026-2027');
  const [examFormPassingPct, setExamFormPassingPct] = useState<number>(60);
  const [examFormClassIds, setExamFormClassIds] = useState<string[]>(classes.map((c) => c.id));
  const [examFormSectionScope, setExamFormSectionScope] = useState<string>('ALL');
  const [examPapers, setExamPapers] = useState<PaperConfig[]>(() =>
    subjects.map((s) => ({
      subjectName: s.name,
      enabled: true,
      totalMarks: 25,
      passMarks: 15,
    }))
  );
  const [examFilterClassId, setExamFilterClassId] = useState<string>('ALL');

  const computedTotalExamMarks = useMemo(() => {
    return examPapers
      .filter((p) => p.enabled)
      .reduce((sum, p) => sum + (Number(p.totalMarks) || 0), 0);
  }, [examPapers]);

  const handleSelectTermPreset = (category: ExaminationCategory) => {
    const preset = OFFICIAL_EXAM_TERMS.find((t) => t.category === category);
    const defaultMax = preset?.defaultTotalMarks || 100;
    setExamFormCategory(category);
    if (!editingExamId) {
      setExamFormName(category);
    }
    setExamPapers((prev) =>
      prev.map((p) => ({
        ...p,
        totalMarks: defaultMax,
        passMarks: Math.round((defaultMax * examFormPassingPct) / 100),
      }))
    );
  };

  const handlePassingPctChange = (pct: number) => {
    const safePct = Math.max(1, Math.min(100, pct || 1));
    setExamFormPassingPct(safePct);
    setExamPapers((prev) =>
      prev.map((p) => ({
        ...p,
        passMarks: Math.round((p.totalMarks * safePct) / 100),
      }))
    );
  };

  const applyMarksToAllEnabledPapers = (marks: number) => {
    setExamPapers((prev) =>
      prev.map((p) => ({
        ...p,
        totalMarks: marks,
        passMarks: Math.round((marks * examFormPassingPct) / 100),
      }))
    );
  };

  const resetExamBuilder = () => {
    setEditingExamId(null);
    setExamFormCategory('1st Monthly Test');
    setExamFormName('1st Monthly Test');
    setExamFormDate(new Date().toISOString().split('T')[0]);
    setExamFormYear(settings.academicYear || '2026-2027');
    setExamFormPassingPct(60);
    setExamFormClassIds(classes.map((c) => c.id));
    setExamFormSectionScope('ALL');
    setExamPapers(
      subjects.map((s) => ({
        subjectName: s.name,
        enabled: true,
        totalMarks: 25,
        passMarks: 15,
      }))
    );
  };

  const handleEditExistingExam = (ex: Examination) => {
    setEditingExamId(ex.id);
    setExamFormCategory(ex.category);
    setExamFormName(ex.name);
    setExamFormDate(ex.date);
    setExamFormYear(ex.academicYear);
    const pct = ex.passingPercentage ?? 60;
    setExamFormPassingPct(pct);
    setExamFormClassIds([ex.classId]);
    setExamFormSectionScope(ex.sectionId || 'ALL');

    const mapBySubj = new Map(ex.subjects.map((s) => [s.subjectName.toLowerCase(), s]));
    const updatedPapers: PaperConfig[] = subjects.map((s) => {
      const found = mapBySubj.get(s.name.toLowerCase());
      return {
        subjectName: s.name,
        enabled: Boolean(found),
        totalMarks: found ? found.totalMarks : 100,
        passMarks: found ? found.passMarks : Math.round((100 * pct) / 100),
      };
    });

    // Preserve any custom subject name inside the exam not in default subjects list
    ex.subjects.forEach((es) => {
      if (!subjects.some((s) => s.name.toLowerCase() === es.subjectName.toLowerCase())) {
        updatedPapers.push({
          subjectName: es.subjectName,
          enabled: true,
          totalMarks: es.totalMarks,
          passMarks: es.passMarks,
        });
      }
    });

    setExamPapers(updatedPapers);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveExamConfiguration = (e: React.FormEvent) => {
    e.preventDefault();
    setActionErrorMsg('');
    const enabledPapers = examPapers.filter((p) => p.enabled && p.totalMarks > 0);
    if (enabledPapers.length === 0) {
      setActionErrorMsg('Please select at least one subject paper with valid Max Marks.');
      return;
    }
    if (examFormClassIds.length === 0) {
      setActionErrorMsg('Please select at least one target Class.');
      return;
    }

    const totalExamMarks = enabledPapers.reduce((sum, p) => sum + Number(p.totalMarks), 0);
    const configuredSubjects = enabledPapers.map((p) => ({
      subjectName: p.subjectName,
      totalMarks: Number(p.totalMarks),
      passMarks: Number(p.passMarks),
      teacherName: 'Assigned Subject Teacher',
    }));

    if (editingExamId) {
      StorageService.updateExamination(editingExamId, {
        academicYear: examFormYear,
        classId: examFormClassIds[0],
        sectionId: examFormSectionScope || 'ALL',
        name: examFormName.trim() || examFormCategory,
        category: examFormCategory,
        date: examFormDate,
        passingPercentage: examFormPassingPct,
        totalExamMarks,
        subjects: configuredSubjects,
      });
      setSaveSuccessMsg(`✓ Examination "${examFormName}" updated successfully!`);
    } else {
      let createdCount = 0;
      let updatedCount = 0;
      const currentList = StorageService.getExaminations();

      examFormClassIds.forEach((clsId) => {
        const clsObj = classes.find((c) => c.id === clsId);
        // Include subjects relevant to that class (or all selected subjects if none match explicitly)
        const clsSubjectIds = new Set(
          subjects.filter((s) => s.classIds.length === 0 || s.classIds.includes(clsId)).map((s) => s.name)
        );
        const classSpecificPapers = configuredSubjects.filter(
          (p) => clsSubjectIds.size === 0 || clsSubjectIds.has(p.subjectName)
        );
        const papersToUse = classSpecificPapers.length > 0 ? classSpecificPapers : configuredSubjects;
        const clsTotalMarks = papersToUse.reduce((s, p) => s + p.totalMarks, 0);

        const existingSame = currentList.find(
          (ex) =>
            ex.classId === clsId &&
            ex.sectionId === (examFormSectionScope || 'ALL') &&
            ex.category === examFormCategory &&
            ex.name.toLowerCase() === (examFormName.trim() || examFormCategory).toLowerCase()
        );

        if (existingSame) {
          StorageService.updateExamination(existingSame.id, {
            academicYear: examFormYear,
            date: examFormDate,
            passingPercentage: examFormPassingPct,
            totalExamMarks: clsTotalMarks,
            subjects: papersToUse,
          });
          updatedCount++;
        } else {
          StorageService.addExamination({
            academicYear: examFormYear,
            classId: clsId,
            sectionId: examFormSectionScope || 'ALL',
            name: examFormName.trim() || examFormCategory,
            category: examFormCategory,
            date: examFormDate,
            passingPercentage: examFormPassingPct,
            totalExamMarks: clsTotalMarks,
            createdBy: currentUser?.name || 'Admin / Principal',
            subjects: papersToUse,
          });
          createdCount++;
        }
        void clsObj;
      });

      setSaveSuccessMsg(
        `✓ Examination configured for ${examFormClassIds.length} class(es) (${createdCount} created, ${updatedCount} updated)! Teachers can now enter marks for their assigned subjects.`
      );
    }

    setAllExams(StorageService.getExaminations());
    resetExamBuilder();
    setTimeout(() => setSaveSuccessMsg(''), 5000);
  };

  const handleDeleteExam = (exId: string) => {
    if (!canCreateExams()) return;
    StorageService.deleteExamination(exId);
    setAllExams(StorageService.getExaminations());
    setSaveSuccessMsg('✓ Examination configuration removed.');
    setTimeout(() => setSaveSuccessMsg(''), 3500);
  };

  const filteredConfiguredExams = useMemo(() => {
    if (examFilterClassId === 'ALL') return allExams;
    return allExams.filter((ex) => ex.classId === examFilterClassId);
  }, [allExams, examFilterClassId]);

  const recordedCount = useMemo(() => {
    return targetStudents.filter((std) => {
      const val = marksMap[std.id]?.obtained?.trim();
      return val !== undefined && val !== '';
    }).length;
  }, [targetStudents, marksMap]);

  return (
    <div className="space-y-6">
      {/* Header & Top Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                School Examination & Marks Management
              </h2>
              <p className="text-xs text-slate-500">
                Principal/Admin configures Term, Total Marks & Passing % • Teachers enter marks strictly for their assigned classes & subjects
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              <span>Consolidated Sheet</span>
            </button>

            {canCreateExams() && (
              <button
                type="button"
                onClick={() => setActiveView('create_exams')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === 'create_exams'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create & Configure Exams</span>
              </button>
            )}

            {activeView === 'subject_entry' && (
              <button
                type="button"
                onClick={handleSaveMarks}
                disabled={!canEditSelectedMarks || targetStudents.length === 0}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Marks</span>
              </button>
            )}

            {activeView === 'consolidated_sheet' && (
              <button
                type="button"
                onClick={handleExportConsolidatedExcel}
                disabled={!currentExam || targetStudents.length === 0}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel (.xlsx)</span>
              </button>
            )}
          </div>
        </div>

        {/* Teacher Quick-Jump Bar */}
        {activeView !== 'create_exams' && teacherShortcuts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 uppercase text-[11px] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Your Teaching Assignments:
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

        {/* Filter Bar for Marks Entry & Consolidated Views */}
        {activeView !== 'create_exams' && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
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
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[220px]">
              <label className="block text-slate-500 mb-1 font-semibold">
                Scheduled Examination ({examsForSelectedClass.length})
              </label>
              <select
                value={currentExam?.id || ''}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900"
              >
                {examsForSelectedClass.length === 0 ? (
                  <option value="">No Exam Created Yet</option>
                ) : (
                  examsForSelectedClass.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.category}) — Total: {ex.totalExamMarks || ex.subjects.reduce((s, p) => s + p.totalMarks, 0)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {activeView === 'subject_entry' && currentExam && (
              <div className="min-w-[220px]">
                <label className="block text-slate-500 mb-1 font-semibold">Subject Paper</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-emerald-800"
                >
                  {examSubjectsList.map((paper) => {
                    const allowed = canEnterMarksForSubject(
                      paper.subjectName,
                      selectedClassId,
                      selectedSectionId
                    );
                    return (
                      <option key={paper.subjectName} value={paper.subjectName}>
                        {paper.subjectName} (Max: {paper.totalMarks})
                        {currentRole === 'subject_teacher' || currentRole === 'class_teacher'
                          ? allowed
                            ? ' ✓ Assigned'
                            : ' 🔒 Locked'
                          : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="sm:ml-auto flex items-center gap-3 text-slate-500">
              <span>
                Students: <strong className="text-slate-800">{targetStudents.length}</strong>
              </span>
              {activeView === 'subject_entry' && currentExam && (
                <span>
                  Entered: <strong className="text-emerald-700">{recordedCount}/{targetStudents.length}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Exam Specification Summary Bar */}
        {activeView !== 'create_exams' && currentExam && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold">
                Term: {currentExam.category}
              </span>
              <span className="text-slate-600 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date: {currentExam.date}
              </span>
              <span className="text-slate-700 font-semibold">
                Paper Max Marks: <strong className="font-mono text-slate-900">{paperTotalMarks}</strong>
              </span>
              <span className="text-slate-700 font-semibold">
                Pass Marks: <strong className="font-mono text-emerald-700">{paperPassMarks}</strong> ({passingPct}%)
              </span>
            </div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              <span>
                Exam Grand Total: {currentExam.totalExamMarks || examSubjectsList.reduce((s, p) => s + p.totalMarks, 0)} Marks ({examSubjectsList.length} Papers)
              </span>
            </div>
          </div>
        )}

        {/* Access Restriction Banner for Marks Entry */}
        {activeView === 'subject_entry' && currentExam && !canEditSelectedMarks && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Access Restricted (View Only):</strong> Only the assigned teacher for <strong>{selectedSubject}</strong> in <strong>{selectedClass?.name} - Section {selectedSectionId}</strong> (or Principal / Admin) is permitted to enter or modify marks here.
            </span>
          </div>
        )}

        {actionErrorMsg && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Empty Exam State */}
      {activeView !== 'create_exams' && !currentExam && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No Examination Configured for {selectedClass?.name} - Section {selectedSectionId}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Before marks can be entered, the School Principal or Administrator must create the examination term, subject papers, total marks, and passing percentage.
          </p>
          {canCreateExams() && (
            <button
              type="button"
              onClick={() => {
                setExamFormClassIds([selectedClassId]);
                setActiveView('create_exams');
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Exam for {selectedClass?.name}</span>
            </button>
          )}
        </div>
      )}

      {/* VIEW 1: SUBJECT MARKS ENTRY TABLE */}
      {activeView === 'subject_entry' && currentExam && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>
              {currentExam.name} • <strong>{selectedSubject}</strong> • {selectedClass?.name} - Section {selectedSectionId}
            </span>
            <span className="text-slate-500 hidden sm:inline">
              Max Marks: {paperTotalMarks} • Passing Threshold: {passingPct}% ({paperPassMarks} Marks)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-16">Roll #</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Father Name</th>
                  <th className="py-2.5 px-3 text-center w-24">Max Marks</th>
                  <th className="py-2.5 px-3 text-center w-32">Obtained Marks</th>
                  <th className="py-2.5 px-3 text-center w-20">Percentage</th>
                  <th className="py-2.5 px-3 text-center w-24">Grade / Status</th>
                  <th className="py-2.5 px-3">Teacher Remarks</th>
                  {currentRole !== 'subject_teacher' && (
                    <th className="py-2.5 px-3 text-right">Portfolio</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetStudents.length === 0 ? (
                  <tr>
                    <td colSpan={currentRole !== 'subject_teacher' ? 9 : 8} className="py-8 text-center text-slate-400">
                      No active students found in {selectedClass?.name} - Section {selectedSectionId}.
                    </td>
                  </tr>
                ) : (
                  targetStudents.map((std) => {
                    const entry = marksMap[std.id] || { obtained: '', remarks: '' };
                    const rawVal = entry.obtained.trim();
                    const numVal = rawVal !== '' ? parseFloat(rawVal) : null;
                    const maxVal = Number(paperTotalMarks) || 100;
                    const pct = numVal !== null && !isNaN(numVal) ? Math.round((numVal / maxVal) * 100) : null;
                    const { grade, color, isLow } = calculateGrade(pct, passingPct);

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
                            disabled={!canEditSelectedMarks}
                            step="0.5"
                            min="0"
                            max={maxVal}
                            placeholder="Marks"
                            value={entry.obtained}
                            onChange={(e) => {
                              const val = e.target.value;
                              isDirtyRef.current = true;
                              setMarksMap((prev) => ({
                                ...prev,
                                [std.id]: { ...(prev[std.id] || { obtained: '', remarks: '' }), obtained: val },
                              }));
                            }}
                            className={`p-1.5 px-2.5 border rounded-lg text-xs font-mono font-bold text-center w-24 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                              isLow
                                ? 'border-rose-400 bg-rose-50 text-rose-900 ring-1 ring-rose-300'
                                : 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500'
                            }`}
                          />
                        </td>

                        {/* Percentage */}
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {pct !== null ? (
                            <span className={pct < passingPct ? 'text-rose-600' : 'text-emerald-700'}>
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
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> &lt;{passingPct}%
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Teacher Remarks */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            disabled={!canEditSelectedMarks}
                            placeholder={isLow ? 'Remedial note...' : 'Optional remark...'}
                            value={entry.remarks}
                            onChange={(e) => {
                              const val = e.target.value;
                              isDirtyRef.current = true;
                              setMarksMap((prev) => ({
                                ...prev,
                                [std.id]: { ...(prev[std.id] || { obtained: '', remarks: '' }), remarks: val },
                              }));
                            }}
                            className="w-full min-w-[140px] p-1.5 px-2 rounded border border-slate-200 text-xs bg-slate-50 focus:bg-white disabled:opacity-60"
                          />
                        </td>

                        {currentRole !== 'subject_teacher' && (
                          <td className="py-3 px-3 text-right">
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
      )}

      {/* VIEW 2: CONSOLIDATED CLASS MARK SHEET */}
      {activeView === 'consolidated_sheet' && currentExam && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>
              Consolidated Sheet • {currentExam.name} ({currentExam.category}) • {selectedClass?.name} - Section {selectedSectionId}
            </span>
            <span className="text-slate-500">
              Passing Standard: {passingPct}% • Total Students: {targetStudents.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-14">Roll #</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  {examSubjectsList.map((paper) => (
                    <th key={paper.subjectName} className="py-2.5 px-2 text-center truncate max-w-[110px]" title={`${paper.subjectName} (Max: ${paper.totalMarks})`}>
                      <div>{paper.subjectName.split(' ')[0]}</div>
                      <div className="text-[9px] text-slate-400 font-mono">/{paper.totalMarks}</div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center font-bold">Total Obt</th>
                  <th className="py-2.5 px-3 text-center font-bold">Overall %</th>
                  <th className="py-2.5 px-3 text-center font-bold">Result / Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetStudents.length === 0 ? (
                  <tr>
                    <td colSpan={examSubjectsList.length + 5} className="py-8 text-center text-slate-400">
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

                        {examSubjectsList.map((paper) => {
                          const mark = allMarks.find(
                            (m) =>
                              m.examinationId === currentExam.id &&
                              m.studentId === std.id &&
                              m.subjectName === paper.subjectName
                          );

                          if (mark && mark.obtainedMarks !== null) {
                            totalObtained += mark.obtainedMarks;
                            totalMax += paper.totalMarks;
                            const isLow = mark.percentage !== null && mark.percentage < passingPct;

                            return (
                              <td key={paper.subjectName} className="py-3 px-2 text-center font-mono">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                    isLow ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {mark.obtainedMarks}/{paper.totalMarks}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={paper.subjectName} className="py-3 px-2 text-center text-slate-300 font-mono text-[11px]">
                              -
                            </td>
                          );
                        })}

                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                          {totalMax > 0 ? `${totalObtained} / ${totalMax}` : '-'}
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {totalMax > 0 ? (
                            <span
                              className={
                                Math.round((totalObtained / totalMax) * 100) < passingPct
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

                        <td className="py-3 px-3 text-center">
                          {totalMax > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                calculateGrade(Math.round((totalObtained / totalMax) * 100), passingPct).color
                              }`}
                            >
                              {calculateGrade(Math.round((totalObtained / totalMax) * 100), passingPct).grade}
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

      {/* VIEW 3: PRE-EXAM CREATION & CONFIGURATION (ADMIN & PRINCIPAL ONLY) */}
      {activeView === 'create_exams' && canCreateExams() && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveExamConfiguration}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingExamId ? 'Edit Configured Examination' : 'Create Examination Schedule & Subject Marks'}
                </h3>
                <p className="text-xs text-slate-500">
                  Define the exam term, total marks per subject, passing percentage, and target classes before marks entry begins.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold">
                  Grand Total: {computedTotalExamMarks} Marks
                </span>
                {editingExamId && (
                  <button
                    type="button"
                    onClick={resetExamBuilder}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {/* Step 1: Exam Term & Basic Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Exam Term *</label>
                <select
                  value={examFormCategory}
                  onChange={(e) => handleSelectTermPreset(e.target.value as ExaminationCategory)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900"
                >
                  {OFFICIAL_EXAM_TERMS.map((t) => (
                    <option key={t.id} value={t.category}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Examination Title *</label>
                <input
                  type="text"
                  required
                  value={examFormName}
                  onChange={(e) => setExamFormName(e.target.value)}
                  placeholder="e.g. 1st Monthly Test 2026"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Exam Date *</label>
                <input
                  type="date"
                  required
                  value={examFormDate}
                  onChange={(e) => setExamFormDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Passing Percentage (%) *</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={examFormPassingPct}
                    onChange={(e) => handlePassingPctChange(Number(e.target.value))}
                    className="w-20 p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-slate-900 text-center"
                  />
                  {[40, 50, 60].map((presetPct) => (
                    <button
                      key={presetPct}
                      type="button"
                      onClick={() => handlePassingPctChange(presetPct)}
                      className={`px-2 py-2 rounded-lg font-bold border text-[11px] ${
                        examFormPassingPct === presetPct
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {presetPct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Target Classes */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
                  Select Target Classes ({examFormClassIds.length} Selected)
                </label>
                {!editingExamId && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExamFormClassIds(classes.map((c) => c.id))}
                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold"
                    >
                      Select All Classes
                    </button>
                    <button
                      type="button"
                      onClick={() => setExamFormClassIds([])}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-bold"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {classes.map((cls) => {
                  const selected = examFormClassIds.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      disabled={Boolean(editingExamId)}
                      onClick={() =>
                        setExamFormClassIds((prev) =>
                          prev.includes(cls.id) ? prev.filter((id) => id !== cls.id) : [...prev, cls.id]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all disabled:opacity-75 ${
                        selected
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {selected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{cls.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="font-semibold text-slate-600">Section Scope:</label>
                <select
                  value={examFormSectionScope}
                  onChange={(e) => setExamFormSectionScope(e.target.value)}
                  className="p-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  <option value="ALL">All Sections (Recommended)</option>
                  <option value="A">Section A Only</option>
                  <option value="B">Section B Only</option>
                  <option value="C">Section C Only</option>
                  <option value="D">Section D Only</option>
                </select>
                <label className="font-semibold text-slate-600 ml-2">Academic Year:</label>
                <input
                  type="text"
                  value={examFormYear}
                  onChange={(e) => setExamFormYear(e.target.value)}
                  className="p-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 w-28"
                />
              </div>
            </div>

            {/* Step 3: Subject Papers & Marks Table */}
            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
                  Configure Subject Papers, Max Marks & Passing Marks
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">Quick Set All Papers:</span>
                  {[25, 50, 75, 100].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => applyMarksToAllEnabledPapers(m)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-800 hover:text-emerald-900 font-bold border border-slate-200"
                    >
                      {m} Marks
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Include</th>
                      <th className="py-2.5 px-3">Subject Name</th>
                      <th className="py-2.5 px-3 text-center w-36">Paper Max Marks</th>
                      <th className="py-2.5 px-3 text-center w-36">Pass Marks ({examFormPassingPct}%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {examPapers.map((paper, idx) => (
                      <tr key={paper.subjectName} className={paper.enabled ? 'bg-white' : 'bg-slate-50 opacity-60'}>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={paper.enabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setExamPapers((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, enabled: checked } : item))
                              );
                            }}
                            className="w-4 h-4 rounded text-emerald-700"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{paper.subjectName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            disabled={!paper.enabled}
                            min={1}
                            max={500}
                            value={paper.totalMarks}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 1);
                              setExamPapers((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        totalMarks: val,
                                        passMarks: Math.round((val * examFormPassingPct) / 100),
                                      }
                                    : item
                                )
                              );
                            }}
                            className="w-24 p-1.5 rounded-lg border border-slate-300 text-center font-mono font-bold text-slate-900 bg-white"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            disabled={!paper.enabled}
                            min={1}
                            max={paper.totalMarks}
                            value={paper.passMarks}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setExamPapers((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, passMarks: val } : item))
                              );
                            }}
                            className="w-24 p-1.5 rounded-lg border border-slate-300 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs text-xs flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{editingExamId ? 'Update Examination' : 'Create & Publish Examination Schedule'}</span>
              </button>
            </div>
          </form>

          {/* Existing Configured Examinations List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-800">
                Configured School Examinations ({filteredConfiguredExams.length})
              </span>
              <select
                value={examFilterClassId}
                onChange={(e) => setExamFilterClassId(e.target.value)}
                className="p-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
              >
                <option value="ALL">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Exam Name & Term</th>
                    <th className="py-2.5 px-3">Class / Section</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Subjects</th>
                    <th className="py-2.5 px-3 text-center">Total Exam Marks</th>
                    <th className="py-2.5 px-3 text-center">Pass %</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredConfiguredExams.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No examinations created yet. Use the form above to schedule examinations.
                      </td>
                    </tr>
                  ) : (
                    filteredConfiguredExams.map((ex) => {
                      const cls = classes.find((c) => c.id === ex.classId);
                      const grandTotal =
                        ex.totalExamMarks ?? ex.subjects.reduce((s, p) => s + (Number(p.totalMarks) || 0), 0);
                      return (
                        <tr key={ex.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{ex.name}</div>
                            <div className="text-[11px] text-emerald-700 font-semibold">{ex.category}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {cls?.name || ex.classId} ({ex.sectionId === 'ALL' ? 'All Sections' : `Sec ${ex.sectionId}`})
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">{ex.date}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                            {ex.subjects.length}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                            {grandTotal}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                            {ex.passingPercentage ?? 60}%
                          </td>
                          <td className="py-3 px-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClassId(ex.classId);
                                if (ex.sectionId !== 'ALL') setSelectedSectionId(ex.sectionId);
                                setSelectedExamId(ex.id);
                                setActiveView('subject_entry');
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold"
                            >
                              Marks
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditExistingExam(ex)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                              title="Edit Exam"
                            >
                              <Edit3 className="w-3.5 h-3.5 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExam(ex.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Delete Exam"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
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
      )}
    </div>
  );
};
