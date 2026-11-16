import React, { useState } from 'react';
import { StorageService } from '../../db/storage';
import { Student } from '../../types';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';

type StudentPayload = Omit<Student, 'id' | 'createdAt' | 'updatedAt'>;

const TEMPLATE_COLUMNS: { key: string; required: boolean; example: string }[] = [
  { key: 'Student Full Name', required: true, example: 'Danish Khan' },
  { key: 'Admission Number', required: true, example: 'GIFS-2026-0501' },
  { key: 'Class', required: true, example: 'Class IX' },
  { key: 'Section', required: true, example: 'A' },
  { key: 'Roll Number', required: true, example: '12' },
  { key: 'Gender', required: true, example: 'Male' },
  { key: 'Date of Birth', required: true, example: '2012-04-15' },
  { key: "Father's Name", required: true, example: 'Mansoor Khan' },
  { key: 'Parent Contact Number', required: true, example: '0300-1234567' },
  { key: 'Residential Address', required: true, example: 'Gulshan-e-Iqbal, Karachi' },
  { key: 'Medical Care & Allergies', required: false, example: 'None' },
];

export const ExcelImportExport: React.FC<{ onNavigateToStudent: (id: string) => void }> = ({
  onNavigateToStudent,
}) => {
  const classes = StorageService.getClasses();

  // Wizard Steps (1 through 3)
  const [step, setStep] = useState<number>(1);
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'c9');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(classes[0]?.sections[0] || 'A');

  const defaultSelectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const handleDefaultClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.id === newClassId);
    if (cls && cls.sections.length > 0 && !cls.sections.includes(selectedSectionId)) {
      setSelectedSectionId(cls.sections[0]);
    }
  };

  // Parsed Data & Validation
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [validatedStudents, setValidatedStudents] = useState<{
    data: StudentPayload;
    isValid: boolean;
    errors: string[];
    isDuplicate: boolean;
  }[]>([]);
  const [importedStudents, setImportedStudents] = useState<Student[]>([]);

  // Format cell values cleanly (including Excel Date objects)
  const formatExcelDate = (val: any, fallback: string): string => {
    if (val === undefined || val === null || val === '') return fallback;
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (!str) return fallback;
    // Handle DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      const dd = dmy[1].padStart(2, '0');
      const mm = dmy[2].padStart(2, '0');
      const yyyy = dmy[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return str;
  };

  // Case-insensitive & alias-friendly column lookup
  const getCell = (row: Record<string, any>, aliases: string[]): any => {
    const normalizedKeys = new Map<string, any>();
    Object.keys(row).forEach((k) => {
      normalizedKeys.set(k.trim().toLowerCase().replace(/[\s_*]+/g, ' '), row[k]);
    });
    for (const alias of aliases) {
      const norm = alias.trim().toLowerCase().replace(/[\s_*]+/g, ' ');
      if (normalizedKeys.has(norm)) {
        const v = normalizedKeys.get(norm);
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          return v;
        }
      }
    }
    return '';
  };

  // Resolve Class string from Excel (handles "Class IX", "IX", "9", "Class 9", "O Level 1", "OL1", etc.)
  const resolveClassFromExcel = (rawClassVal: any) => {
    const val = String(rawClassVal ?? '').trim();
    if (!val) {
      return classes.find((c) => c.id === selectedClassId) || classes[0];
    }
    const lower = val.toLowerCase().replace(/\s+/g, ' ');
    const romanMap: Record<string, string> = {
      '1': 'i', 'i': 'i', 'class 1': 'class i', 'class i': 'class i',
      '2': 'ii', 'ii': 'ii', 'class 2': 'class ii', 'class ii': 'class ii',
      '3': 'iii', 'iii': 'iii', 'class 3': 'class iii', 'class iii': 'class iii',
      '4': 'iv', 'iv': 'iv', 'class 4': 'class iv', 'class iv': 'class iv',
      '5': 'v', 'v': 'v', 'class 5': 'class v', 'class v': 'class v',
      '6': 'vi', 'vi': 'vi', 'class 6': 'class vi', 'class vi': 'class vi',
      '7': 'vii', 'vii': 'vii', 'class 7': 'class vii', 'class vii': 'class vii',
      '8': 'viii', 'viii': 'viii', 'class 8': 'class viii', 'class viii': 'class viii',
      '9': 'ix', 'ix': 'ix', 'class 9': 'class ix', 'class ix': 'class ix',
      '10': 'x', 'x': 'x', 'class 10': 'class x', 'class x': 'class x',
      'ol1': 'o level 1', 'o-level 1': 'o level 1', 'o level 1': 'o level 1',
      'ol2': 'o level 2', 'o-level 2': 'o level 2', 'o level 2': 'o level 2',
    };

    const normalized = romanMap[lower] || lower;
    const matched = classes.find((c) => {
      const cname = c.name.toLowerCase();
      return (
        cname === lower ||
        cname === normalized ||
        cname.replace('class ', '') === normalized ||
        c.id.toLowerCase() === lower
      );
    });
    return matched || null;
  };

  // Re-evaluate validation across current student payloads
  const revalidateList = (payloads: StudentPayload[]) => {
    const dbStudents = StorageService.getStudents();
    const seenAdm = new Set<string>();
    const seenClassRoll = new Set<string>();

    const checked = payloads.map((payload) => {
      const errors: string[] = [];
      if (!payload.name.trim()) errors.push('Student Full Name required');
      if (!payload.fatherName.trim()) errors.push('Father Name required');
      if (!payload.rollNo.trim()) errors.push('Roll Number required');
      if (!payload.classId) errors.push('Valid Class required');
      if (!payload.sectionId) errors.push('Valid Section required');

      const admKey = payload.admissionNo.trim().toLowerCase();
      const rollKey = `${payload.classId}|${payload.sectionId}|${payload.rollNo.trim().toLowerCase()}`;

      const dupAdmDb = Boolean(admKey) && dbStudents.some((s) => s.admissionNo.trim().toLowerCase() === admKey);
      const dupRollDb = dbStudents.some(
        (s) =>
          s.classId === payload.classId &&
          s.sectionId.toUpperCase() === payload.sectionId.toUpperCase() &&
          s.rollNo.trim().toLowerCase() === payload.rollNo.trim().toLowerCase()
      );
      const dupAdmBatch = Boolean(admKey) && seenAdm.has(admKey);
      const dupRollBatch = seenClassRoll.has(rollKey);

      if (dupAdmDb || dupAdmBatch) errors.push(`Duplicate Admission No (${payload.admissionNo})`);
      if (dupRollDb || dupRollBatch) errors.push(`Roll #${payload.rollNo} duplicate in ${payload.className}-${payload.sectionId}`);

      if (admKey) seenAdm.add(admKey);
      seenClassRoll.add(rollKey);

      return {
        data: payload,
        isValid: errors.length === 0,
        errors,
        isDuplicate: dupAdmDb || dupRollDb || dupAdmBatch || dupRollBatch,
      };
    });

    setValidatedStudents(checked);
  };

  // Download Sample Template with the exact 11 Register New Student headings
  const handleDownloadTemplate = () => {
    const defaultClsName = defaultSelectedClass?.name || 'Class IX';
    const defaultSec = selectedSectionId || 'A';
    const secondSec = defaultSelectedClass?.sections[1] || defaultSec;

    const templateData = [
      {
        'Student Full Name': 'Danish Khan',
        'Admission Number': 'GIFS-2026-0501',
        'Class': defaultClsName,
        'Section': defaultSec,
        'Roll Number': '01',
        'Gender': 'Male',
        'Date of Birth': '2012-04-15',
        "Father's Name": 'Mansoor Khan',
        'Parent Contact Number': '0300-1234567',
        'Residential Address': 'Gulshan-e-Iqbal, Karachi',
        'Medical Care & Allergies': 'None',
      },
      {
        'Student Full Name': 'Fatima Zehra',
        'Admission Number': 'GIFS-2026-0502',
        'Class': defaultClsName,
        'Section': secondSec,
        'Roll Number': '02',
        'Gender': 'Female',
        'Date of Birth': '2012-07-22',
        "Father's Name": 'Syed Ali Raza',
        'Parent Contact Number': '0300-9988776',
        'Residential Address': 'Clifton Block 5, Karachi',
        'Medical Care & Allergies': 'Mild asthma',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 22 }, // Student Full Name
      { wch: 18 }, // Admission Number
      { wch: 13 }, // Class
      { wch: 10 }, // Section
      { wch: 12 }, // Roll Number
      { wch: 10 }, // Gender
      { wch: 14 }, // Date of Birth
      { wch: 20 }, // Father's Name
      { wch: 20 }, // Parent Contact Number
      { wch: 28 }, // Residential Address
      { wch: 24 }, // Medical Care & Allergies
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Template');
    XLSX.writeFile(workbook, 'Green_Island_Student_Import_Template.xlsx');
  };

  // Handle File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError('');
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }) as any[];
        const nonEmptyRows = data.filter((r) =>
          Object.values(r).some((v) => v !== undefined && v !== null && String(v).trim() !== '')
        );
        if (nonEmptyRows.length === 0) {
          setParseError('The uploaded Excel file appears empty. Please enter student rows under the headings and re-upload.');
          return;
        }
        setRawRows(nonEmptyRows);
        validateImportData(nonEmptyRows);
        setStep(2);
      } catch (err) {
        setParseError('Failed to read Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Validate Imported Data & Map All 20 Registration Fields
  const validateImportData = (rows: any[]) => {
    const existingDbCount = StorageService.getStudents().length;
    const today = new Date().toISOString().split('T')[0];

    const payloads: StudentPayload[] = rows.map((row: any, idx: number) => {
      const rawClass = getCell(row, ['Class', 'Class Name', 'Grade', 'ClassName']);
      const rawSection = getCell(row, ['Section', 'Sec', 'Section Name', 'SectionName']);
      const resolvedCls = resolveClassFromExcel(rawClass);
      const fallbackCls = classes.find((c) => c.id === selectedClassId) || classes[0];
      const finalCls = resolvedCls || fallbackCls;

      const cleanSectionRaw = String(rawSection || selectedSectionId || 'A')
        .trim()
        .toUpperCase()
        .replace(/^SECTION\s+/i, '');
      const finalSectionId = cleanSectionRaw || finalCls?.sections[0] || 'A';

      const name = String(getCell(row, ['Student Full Name', 'Student Name', 'Full Name', 'Name', 'StudentName'])).trim();
      const fatherName = String(getCell(row, ['Father Name', "Father's Name", 'Father', 'FatherName'])).trim();
      const motherName = String(getCell(row, ['Mother Name', "Mother's Name", 'Mother', 'MotherName'])).trim();
      const guardianName = String(getCell(row, ['Guardian Name', 'Guardian'])).trim() || fatherName;

      const rollNo = String(
        getCell(row, ['Roll Number', 'Roll No', 'Roll #', 'RollNo']) || String(idx + 1).padStart(2, '0')
      ).trim();

      const rawAdm = String(
        getCell(row, ['Admission Number', 'Admission No', 'Adm No', 'AdmissionNo'])
      ).trim();
      const admissionNo = rawAdm || `GIFS-${academicYear.split('-')[0]}-${1001 + existingDbCount + idx}`;

      const rawGender = String(getCell(row, ['Gender', 'Sex']) || 'Male').trim().toLowerCase();
      const gender: 'Male' | 'Female' | 'Other' = rawGender.startsWith('f')
        ? 'Female'
        : rawGender.startsWith('o')
        ? 'Other'
        : 'Male';

      const dob = formatExcelDate(getCell(row, ['Date of Birth', 'DOB', 'Birth Date']), '2012-01-01');
      const admissionDate = formatExcelDate(getCell(row, ['Admission Date', 'Adm Date']), today);
      const rowAcademicYear = String(getCell(row, ['Academic Year', 'Session']) || academicYear).trim();

      const parentContact = String(
        getCell(row, ['Parent Contact Number', 'Parent Contact', 'Contact', 'Phone', 'Mobile']) || '0300-0000000'
      ).trim();
      const alternativeContact = String(
        getCell(row, ['Alternative Contact', 'Alt Contact', 'Secondary Contact'])
      ).trim();
      const emergencyContact = String(
        getCell(row, ['Emergency Contact', 'Emergency Phone'])
      ).trim();

      const address = String(
        getCell(row, ['Residential Address', 'Address', 'Home Address']) || 'Karachi'
      ).trim();
      const previousSchool = String(getCell(row, ['Previous School', 'Last School'])).trim();
      const medicalInfo = String(
        getCell(row, ['Medical Care & Allergies', 'Medical Info', 'Medical', 'Allergies'])
      ).trim();
      const specialEducationalNeeds = String(
        getCell(row, ['Special Educational Needs', 'Special Needs', 'SEN'])
      ).trim();
      const remarks = String(getCell(row, ['Remarks', 'Notes'])).trim();

      return {
        name,
        fatherName,
        motherName: motherName || undefined,
        guardianName: guardianName || undefined,
        admissionNo,
        rollNo,
        dob,
        gender,
        admissionDate,
        academicYear: rowAcademicYear,
        classId: finalCls?.id || selectedClassId,
        sectionId: finalSectionId,
        className: finalCls?.name || (String(rawClass) || 'Class IX'),
        sectionName: `Section ${finalSectionId}`,
        previousSchool: previousSchool || undefined,
        parentContact,
        alternativeContact: alternativeContact || undefined,
        emergencyContact: emergencyContact || undefined,
        address,
        medicalInfo: medicalInfo || undefined,
        specialEducationalNeeds: specialEducationalNeeds || undefined,
        remarks: remarks || undefined,
        status: 'Active',
      };
    });

    revalidateList(payloads);
  };

  // Allow inline editing directly in Step 2 preview
  const updatePreviewRow = (
    index: number,
    patch: {
      classId?: string;
      sectionId?: string;
      rollNo?: string;
      admissionNo?: string;
      name?: string;
      fatherName?: string;
      parentContact?: string;
    }
  ) => {
    const nextPayloads = validatedStudents.map((item, i) => {
      if (i !== index) return item.data;
      const nextClassId = patch.classId ?? item.data.classId;
      const clsObj = classes.find((c) => c.id === nextClassId);
      let nextSectionId = patch.sectionId ?? item.data.sectionId;
      if (patch.classId && clsObj && clsObj.sections.length > 0 && !clsObj.sections.includes(nextSectionId)) {
        nextSectionId = clsObj.sections[0];
      }
      return {
        ...item.data,
        classId: nextClassId,
        className: clsObj?.name || item.data.className,
        sectionId: nextSectionId,
        sectionName: `Section ${nextSectionId}`,
        rollNo: patch.rollNo !== undefined ? patch.rollNo : item.data.rollNo,
        admissionNo: patch.admissionNo !== undefined ? patch.admissionNo : item.data.admissionNo,
        name: patch.name !== undefined ? patch.name : item.data.name,
        fatherName: patch.fatherName !== undefined ? patch.fatherName : item.data.fatherName,
        parentContact: patch.parentContact !== undefined ? patch.parentContact : item.data.parentContact,
      };
    });
    revalidateList(nextPayloads);
  };

  // Confirm Import & Save All Valid Students
  const handleConfirmImport = () => {
    const added: Student[] = [];
    validatedStudents.forEach((item) => {
      if (item.isValid) {
        const created = StorageService.addStudent(item.data);
        added.push(created);
      }
    });

    setImportedStudents(added);
    setStep(3);
  };

  const handleExportAllSchoolData = () => {
    const studentsData = StorageService.getStudents();
    const classesData = StorageService.getClasses();
    const marksData = StorageService.getMarks();

    const wb = XLSX.utils.book_new();

    const wsStudents = XLSX.utils.json_to_sheet(
      studentsData.map((s) => ({
        'Student Full Name': s.name,
        'Admission Number': s.admissionNo,
        'Class': s.className,
        'Section': s.sectionId,
        'Roll Number': s.rollNo,
        'Gender': s.gender,
        'Date of Birth': s.dob,
        'Admission Date': s.admissionDate,
        'Academic Year': s.academicYear,
        'Father Name': s.fatherName,
        'Mother Name': s.motherName || '',
        'Guardian Name': s.guardianName || '',
        'Parent Contact Number': s.parentContact,
        'Alternative Contact': s.alternativeContact || '',
        'Emergency Contact': s.emergencyContact || '',
        'Residential Address': s.address,
        'Previous School': s.previousSchool || '',
        'Medical Care & Allergies': s.medicalInfo || '',
        'Special Educational Needs': s.specialEducationalNeeds || '',
        'Remarks': s.remarks || '',
        'Status': s.status,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsStudents, 'All_Students');

    const wsClasses = XLSX.utils.json_to_sheet(
      classesData.map((c) => ({
        ClassID: c.id,
        Name: c.name,
        Category: c.category,
        Sections: c.sections.join(', '),
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsClasses, 'Classes');

    const wsMarks = XLSX.utils.json_to_sheet(
      marksData.map((m) => ({
        Student: m.studentName,
        RollNo: m.rollNo,
        Subject: m.subjectName,
        Obtained: m.obtainedMarks,
        Total: m.totalMarks,
        Percentage: m.percentage,
        Grade: m.grade,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsMarks, 'Exam_Marks');

    XLSX.writeFile(wb, `GIFS_Master_All_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const selClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Bulk Student Registration & Master Excel Export
              </h2>
              <p className="text-xs text-slate-500">
                Download the complete Excel template with all Student Registration headings, fill student rows, and import all at once
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download Full Registration Template (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleExportAllSchoolData}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export All School Data (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Wizard Step Pills */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= 1 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              1
            </span>
            <span className={`font-semibold ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
              Template & File Upload
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= 2 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </span>
            <span className={`font-semibold ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
              Validation & Inline Edit Preview
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />

            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step >= 3 ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </span>
            <span className={`font-semibold ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
              Added to Portfolios
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Target Class & File Upload */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Academic Year (Fallback)</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold"
              >
                <option value="2026-2027">2026-2027 (Current)</option>
                <option value="2027-2028">2027-2028</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Default Class (Fallback)</label>
              <select
                value={selectedClassId}
                onChange={(e) => handleDefaultClassChange(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Default Section (Fallback)</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold"
              >
                {(selClass?.sections || ['A', 'B', 'C', 'D']).map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Registration Headings Breakdown */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Exact Student Registration Headings Included in Excel Template (11 Columns):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_COLUMNS.map((col) => (
                <span
                  key={col.key}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    col.required
                      ? 'bg-white text-emerald-900 border-emerald-300'
                      : 'bg-white/70 text-slate-600 border-slate-200'
                  }`}
                >
                  {col.key}
                  {col.required ? ' *' : ''}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-emerald-800">
              Same fields as the Register New Student form. Medical Care & Allergies is optional; all other fields match your Student Registration form directly.
            </p>
          </div>

          {parseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-all">
            <Upload className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">
              Upload Filled Student Registration Excel File
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Select an Excel (.xlsx, .xls) or CSV file using the downloaded template headings. All valid students will be previewed before final import.
            </p>
            <div className="mt-4">
              <label className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer inline-flex items-center gap-2">
                <span>Select Excel File</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Validation & Preview */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400">Default Fallback:</span>{' '}
                <strong className="text-slate-900">
                  {selClass?.name} - Section {selectedSectionId} ({academicYear})
                </strong>
                <div className="text-slate-500 mt-0.5">
                  File: <strong>{fileName}</strong> • Total Rows: <strong>{rawRows.length}</strong> • Valid:{' '}
                  <strong className="text-emerald-700">{validatedStudents.filter((s) => s.isValid).length}</strong> • Edit any highlighted cell below before importing.
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={validatedStudents.filter((s) => s.isValid).length === 0}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  Confirm & Add ({validatedStudents.filter((s) => s.isValid).length} Students)
                </button>
              </div>
            </div>
          </div>

          {/* Validation Table with Inline Editable Registration Boxes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-2">Class</th>
                    <th className="py-2.5 px-2">Section</th>
                    <th className="py-2.5 px-2">Roll No</th>
                    <th className="py-2.5 px-2">Student Full Name</th>
                    <th className="py-2.5 px-2">Father Name</th>
                    <th className="py-2.5 px-2">Admission No</th>
                    <th className="py-2.5 px-2">Parent Contact</th>
                    <th className="py-2.5 px-3">Gender / DOB</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validatedStudents.map((item, idx) => {
                    const rowClassObj = classes.find((c) => c.id === item.data.classId) || classes[0];
                    return (
                      <tr
                        key={idx}
                        className={!item.isValid ? 'bg-rose-50/60' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2.5 px-3">
                          {item.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.data.classId}
                            onChange={(e) => updatePreviewRow(idx, { classId: e.target.value })}
                            className="p-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-800"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.data.sectionId}
                            onChange={(e) => updatePreviewRow(idx, { sectionId: e.target.value })}
                            className="p-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-xs text-slate-800"
                          >
                            {(rowClassObj?.sections || ['A', 'B', 'C', 'D']).map((sec) => (
                              <option key={sec} value={sec}>
                                Sec {sec}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.data.rollNo}
                            onChange={(e) => updatePreviewRow(idx, { rollNo: e.target.value })}
                            className="w-16 p-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs text-slate-800 text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.data.name}
                            onChange={(e) => updatePreviewRow(idx, { name: e.target.value })}
                            className="w-36 p-1.5 rounded-lg border border-slate-300 bg-white font-bold text-xs text-slate-900"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.data.fatherName}
                            onChange={(e) => updatePreviewRow(idx, { fatherName: e.target.value })}
                            className="w-32 p-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.data.admissionNo}
                            onChange={(e) => updatePreviewRow(idx, { admissionNo: e.target.value })}
                            className="w-32 p-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-700"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.data.parentContact}
                            onChange={(e) => updatePreviewRow(idx, { parentContact: e.target.value })}
                            className="w-28 p-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-700"
                          />
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                          <div>{item.data.gender}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.data.dob}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate" title={item.data.address}>
                          {item.data.address}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.isValid ? (
                            <span className="text-emerald-700 font-semibold text-[11px]">
                              Ready
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold text-[11px]">
                              {item.errors.join('; ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Successfully Registered {importedStudents.length} Students!
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All valid students have been added to Green Island Foundation School with full personal details and portfolios ready.
          </p>

          {importedStudents.length > 0 && (
            <div className="max-w-xl mx-auto bg-slate-50 rounded-xl border border-slate-200 p-3 text-left max-h-48 overflow-y-auto divide-y divide-slate-200/70 text-xs">
              {importedStudents.map((s) => (
                <div key={s.id} className="py-1.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900">{s.name}</span>{' '}
                    <span className="text-slate-500">
                      (Roll #{s.rollNo} • {s.className} - Sec {s.sectionId})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToStudent(s.id)}
                    className="text-emerald-700 font-bold hover:underline shrink-0"
                  >
                    Open Portfolio →
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-center space-x-3">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setRawRows([]);
                setValidatedStudents([]);
                setImportedStudents([]);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Import More Students
            </button>
            <button
              type="button"
              onClick={() => onNavigateToStudent('')}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs"
            >
              Open Student Directory →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
