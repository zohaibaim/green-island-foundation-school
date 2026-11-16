import React, { useState } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { Student } from '../../types';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileCheck,
  RefreshCw,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ExcelImportExport: React.FC<{ onNavigateToStudent: (id: string) => void }> = ({
  onNavigateToStudent,
}) => {
  const { canEditStudentDetails } = useAuth();
  const classes = StorageService.getClasses();

  // Wizard Steps (1 through 3)
  const [step, setStep] = useState<number>(1);
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'c9');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(classes[0]?.sections[0] || 'A');

  const defaultSelectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Keep default section valid when default class changes
  const handleDefaultClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.id === newClassId);
    if (cls && cls.sections.length > 0 && !cls.sections.includes(selectedSectionId)) {
      setSelectedSectionId(cls.sections[0]);
    }
  };

  // Parsed Data & Validation
  const [fileName, setFileName] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [validatedStudents, setValidatedStudents] = useState<{
    data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>;
    isValid: boolean;
    errors: string[];
    isDuplicate: boolean;
  }[]>([]);
  const [importCompleted, setImportCompleted] = useState<boolean>(false);
  const [importedCount, setImportedCount] = useState<number>(0);

  // Resolve Class string from Excel (handles "Class IX", "IX", "9", "Class 9", "O Level 1", etc.)
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
  const revalidateList = (payloads: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const dbStudents = StorageService.getStudents();
    const seenAdm = new Set<string>();
    const seenClassRoll = new Set<string>();

    const checked = payloads.map((payload) => {
      const errors: string[] = [];
      if (!payload.name.trim()) errors.push('Student name is required');
      if (!payload.fatherName.trim()) errors.push("Father's name is required");
      if (!payload.rollNo.trim()) errors.push('Roll No is required');
      if (!payload.classId) errors.push('Valid Class is required');
      if (!payload.sectionId) errors.push('Valid Section is required');

      const admKey = payload.admissionNo.trim().toLowerCase();
      const rollKey = `${payload.classId}|${payload.sectionId}|${payload.rollNo.trim().toLowerCase()}`;

      const dupAdmDb = dbStudents.some((s) => s.admissionNo.trim().toLowerCase() === admKey);
      const dupRollDb = dbStudents.some(
        (s) =>
          s.classId === payload.classId &&
          s.sectionId.toUpperCase() === payload.sectionId.toUpperCase() &&
          s.rollNo.trim().toLowerCase() === payload.rollNo.trim().toLowerCase()
      );
      const dupAdmBatch = seenAdm.has(admKey);
      const dupRollBatch = seenClassRoll.has(rollKey);

      if (dupAdmDb || dupAdmBatch) errors.push(`Duplicate Admission No (${payload.admissionNo})`);
      if (dupRollDb || dupRollBatch) errors.push(`Roll #${payload.rollNo} duplicate in ${payload.className}-${payload.sectionId}`);

      seenAdm.add(admKey);
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

  // Download Sample Template WITH Class, Section, Roll No
  const handleDownloadTemplate = () => {
    const defaultClsName = defaultSelectedClass?.name || 'Class IX';
    const defaultSec = selectedSectionId || 'A';
    const templateData = [
      {
        'Class': defaultClsName,
        'Section': defaultSec,
        'Roll No': '01',
        'Student Name': 'Muhammad Bilal',
        'Father Name': 'Bilal Farooq',
        'Admission No': 'GIFS-2026-0601',
        'Date of Birth': '2012-04-15',
        'Gender': 'Male',
        'Parent Contact': '0300-1122334',
        'Address': 'Gulshan-e-Iqbal, Karachi',
        'Medical Info': 'None',
      },
      {
        'Class': defaultClsName,
        'Section': defaultSelectedClass?.sections[1] || defaultSec,
        'Roll No': '02',
        'Student Name': 'Fatima Zehra',
        'Father Name': 'Syed Zehra',
        'Admission No': 'GIFS-2026-0602',
        'Date of Birth': '2012-07-22',
        'Gender': 'Female',
        'Parent Contact': '0300-9988776',
        'Address': 'Clifton Block 5, Karachi',
        'Medical Info': 'Mild asthma',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 14 }, // Class
      { wch: 10 }, // Section
      { wch: 10 }, // Roll No
      { wch: 22 }, // Student Name
      { wch: 20 }, // Father Name
      { wch: 18 }, // Admission No
      { wch: 14 }, // Date of Birth
      { wch: 10 }, // Gender
      { wch: 16 }, // Parent Contact
      { wch: 28 }, // Address
      { wch: 18 }, // Medical Info
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Template');
    XLSX.writeFile(workbook, 'Green_Island_Student_Import_Template.xlsx');
  };

  // Handle File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);
        setRawRows(data);
        validateImportData(data);
        setStep(2);
      } catch (err) {
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Validate Imported Data & Check Duplicates
  const validateImportData = (rows: any[]) => {
    const payloads: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[] = rows.map((row: any, idx: number) => {
      const rawClass = row['Class'] ?? row['Class Name'] ?? row['Grade'] ?? row['ClassName'] ?? '';
      const rawSection = row['Section'] ?? row['Sec'] ?? row['Section Name'] ?? row['SectionName'] ?? '';
      const resolvedCls = resolveClassFromExcel(rawClass);
      const fallbackCls = classes.find((c) => c.id === selectedClassId) || classes[0];
      const finalCls = resolvedCls || fallbackCls;

      const cleanSectionRaw = String(rawSection || selectedSectionId || 'A')
        .trim()
        .toUpperCase()
        .replace(/^SECTION\s+/i, '');
      const finalSectionId = cleanSectionRaw || finalCls?.sections[0] || 'A';

      const rollNo = String(
        row['Roll No'] ?? row['Roll #'] ?? row['RollNo'] ?? row['Roll Number'] ?? idx + 1
      ).trim();
      const name = String(row['Student Name'] || row['Name'] || row['StudentName'] || '').trim();
      const father = String(row['Father Name'] || row['Father'] || row['FatherName'] || '').trim();
      const admissionNo = String(
        row['Admission No'] || row['AdmissionNo'] || `GIFS-${academicYear.split('-')[0]}-${1000 + idx}`
      ).trim();
      const dob = String(row['Date of Birth'] || row['DOB'] || '2012-01-01').trim();
      const gender = (String(row['Gender'] || 'Male').toLowerCase().startsWith('f') ? 'Female' : 'Male') as
        | 'Male'
        | 'Female';
      const contact = String(row['Parent Contact'] || row['Contact'] || row['Phone'] || '0300-0000000').trim();
      const address = String(row['Address'] || 'Karachi').trim();
      const medical = String(row['Medical Info'] || row['Medical'] || '').trim();

      return {
        name,
        fatherName: father,
        admissionNo,
        rollNo,
        dob,
        gender,
        admissionDate: new Date().toISOString().split('T')[0],
        academicYear,
        classId: finalCls?.id || selectedClassId,
        sectionId: finalSectionId,
        className: finalCls?.name || (String(rawClass) || 'Class IX'),
        sectionName: `Section ${finalSectionId}`,
        parentContact: contact,
        address,
        medicalInfo: medical,
        status: 'Active',
      };
    });

    revalidateList(payloads);
  };

  // Allow editing Class, Section, or Roll No directly in Step 2 preview
  const updatePreviewRow = (index: number, patch: { classId?: string; sectionId?: string; rollNo?: string }) => {
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
      };
    });
    revalidateList(nextPayloads);
  };

  // Confirm Import
  const handleConfirmImport = () => {
    let count = 0;
    validatedStudents.forEach((item) => {
      if (item.isValid) {
        StorageService.addStudent(item.data);
        count++;
      }
    });

    setImportedCount(count);
    setImportCompleted(true);
    setStep(3);
  };

  const handleExportAllSchoolData = () => {
    const studentsData = StorageService.getStudents();
    const classesData = StorageService.getClasses();
    const marksData = StorageService.getMarks();

    const wb = XLSX.utils.book_new();

    const wsStudents = XLSX.utils.json_to_sheet(
      studentsData.map((s) => ({
        AdmissionNo: s.admissionNo,
        Class: s.className,
        Section: s.sectionId,
        RollNo: s.rollNo,
        Name: s.name,
        FatherName: s.fatherName,
        DOB: s.dob,
        Gender: s.gender,
        Contact: s.parentContact,
        Address: s.address,
        Status: s.status,
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
                Excel template includes Class, Section, Roll No, and student details with automated duplicate checks
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download Template (.xlsx)</span>
            </button>
            <button
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
              Class, Section & File
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
              Validation & Preview
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
              Confirmation & Portfolios
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Target Class & File Upload */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Academic Year</label>
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

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <strong>Template Columns Included:</strong> Class, Section, Roll No, Student Name, Father Name, Admission No, Date of Birth, Gender, Parent Contact, Address, Medical Info. If Class or Section is left blank in any Excel row, the Default Class/Section above will be applied automatically.
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-all">
            <Upload className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">
              Upload Student Roster Spreadsheet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Select or drop an Excel (.xlsx, .xls) or CSV file containing Class, Section, Roll No, student names, and contact information.
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
                <span className="text-slate-400">Default Target:</span>{' '}
                <strong className="text-slate-900">
                  {selClass?.name} - Section {selectedSectionId} ({academicYear})
                </strong>
                <div className="text-slate-500 mt-0.5">
                  File: <strong>{fileName}</strong> • Total Records Found: <strong>{rawRows.length}</strong> • You can edit Class, Section & Roll No boxes below before importing.
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={validatedStudents.filter((s) => s.isValid).length === 0}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  Confirm Import ({validatedStudents.filter((s) => s.isValid).length} Valid Students)
                </button>
              </div>
            </div>
          </div>

          {/* Validation Table with Class, Section & Roll No boxes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Father Name</th>
                    <th className="py-2.5 px-3">Admission No</th>
                    <th className="py-2.5 px-3">Parent Contact</th>
                    <th className="py-2.5 px-3">Validation Result</th>
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
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.data.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {item.data.fatherName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {item.data.admissionNo}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {item.data.parentContact}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.isValid ? (
                            <span className="text-emerald-700 font-semibold text-[11px]">
                              Ready to import
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Successfully Registered {importedCount} Students!
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Individual digital portfolios, attendance logs, and academic tracking files have been automatically created
            in Green Island Foundation School database.
          </p>

          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => {
                setStep(1);
                setRawRows([]);
                setValidatedStudents([]);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Import Another Class
            </button>
            <button
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
