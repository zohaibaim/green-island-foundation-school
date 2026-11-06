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
  const existingStudents = StorageService.getStudents();

  // Wizard Steps (1 through 4)
  const [step, setStep] = useState<number>(1);
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');
  const [selectedClassId, setSelectedClassId] = useState<string>('c9');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('A');

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

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
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
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
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
        setStep(2); // Move to Preview & Validation
      } catch (err) {
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Validate Imported Data & Check Duplicates
  const validateImportData = (rows: any[]) => {
    const selClass = classes.find((c) => c.id === selectedClassId);
    const results = rows.map((row: any, idx: number) => {
      const errors: string[] = [];
      const rollNo = String(row['Roll No'] || row['Roll #'] || row['RollNo'] || idx + 1).trim();
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

      if (!name) errors.push('Student name is required');
      if (!father) errors.push("Father's name is required");

      // Check duplicate admission number or duplicate roll number in same class/section
      const dupAdm = existingStudents.some((s) => s.admissionNo === admissionNo);
      const dupRoll = existingStudents.some(
        (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId && s.rollNo === rollNo
      );

      if (dupAdm) errors.push(`Duplicate Admission No (${admissionNo})`);
      if (dupRoll) errors.push(`Roll #${rollNo} already assigned in this section`);

      const studentPayload: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        fatherName: father,
        admissionNo,
        rollNo,
        dob,
        gender,
        admissionDate: new Date().toISOString().split('T')[0],
        academicYear,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        className: selClass?.name || 'Class IX',
        sectionName: `Section ${selectedSectionId}`,
        parentContact: contact,
        address,
        medicalInfo: medical,
        status: 'Active',
      };

      return {
        data: studentPayload,
        isValid: errors.length === 0,
        errors,
        isDuplicate: dupAdm || dupRoll,
      };
    });

    setValidatedStudents(results);
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
    const subjectsData = StorageService.getSubjects();
    const marksData = StorageService.getMarks();
    const attendanceData = StorageService.getAttendance();
    const complaintsData = StorageService.getComplaints();

    const wb = XLSX.utils.book_new();

    const wsStudents = XLSX.utils.json_to_sheet(
      studentsData.map((s) => ({
        AdmissionNo: s.admissionNo,
        RollNo: s.rollNo,
        Name: s.name,
        FatherName: s.fatherName,
        Class: s.className,
        Section: s.sectionName,
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

  const selClass = classes.find((c) => c.id === selectedClassId);

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
                Register entire classes with automated duplicate detection, column matching, and export master spreadsheets (Section 17)
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
              Target Class & File
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
              <label className="block text-slate-600 font-semibold mb-1">Select Target Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
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
              <label className="block text-slate-600 font-semibold mb-1">Select Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-all">
            <Upload className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">
              Upload Student Roster Spreadsheet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Select or drop an Excel (.xlsx, .xls) or CSV file containing student names, roll numbers, and contact information.
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
                <span className="text-slate-400">Target:</span>{' '}
                <strong className="text-slate-900">
                  {selClass?.name} - Section {selectedSectionId} ({academicYear})
                </strong>
                <div className="text-slate-500 mt-0.5">
                  File: <strong>{fileName}</strong> • Total Records Found: <strong>{rawRows.length}</strong>
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

          {/* Validation Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Roll #</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Father Name</th>
                    <th className="py-2.5 px-3">Admission No</th>
                    <th className="py-2.5 px-3">Parent Contact</th>
                    <th className="py-2.5 px-3">Validation Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validatedStudents.map((item, idx) => (
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
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {item.data.rollNo}
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
                  ))}
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
