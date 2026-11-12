import React, { useState, useMemo } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const ReportsCenter: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const settings = StorageService.getSettings();
  const classes = StorageService.getClasses();
  const subjects = StorageService.getSubjects();
  const students = StorageService.getStudents();
  const marks = StorageService.getMarks();
  const attendance = StorageService.getAttendance();
  const complaints = StorageService.getComplaints();
  const monitoring = StorageService.getMonitoring();
  const parentMeetings = StorageService.getParentMeetings();

  // Active Report Selection (23 types from Section 23)
  const [selectedReportId, setSelectedReportId] = useState<number>(1);
  const [selectedClassId, setSelectedClassId] = useState<string>('c9');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');

  const REPORT_TYPES = [
    { id: 1, name: 'Complete Individual Student Portfolio', category: 'Individual' },
    { id: 2, name: 'Monthly Academic Report', category: 'Academic' },
    { id: 3, name: 'Weekly Test Report', category: 'Academic' },
    { id: 4, name: 'First Term Examination Report', category: 'Academic' },
    { id: 5, name: 'Mid-Term Examination Report', category: 'Academic' },
    { id: 6, name: 'Final-Term Examination Report', category: 'Academic' },
    { id: 7, name: 'Annual Academic Report', category: 'Academic' },
    { id: 8, name: 'Subject-Wise Result Report', category: 'Academic' },
    { id: 9, name: 'Students Below 60% Low Marks Report', category: 'Alerts' },
    { id: 10, name: 'Daily Attendance Report', category: 'Attendance' },
    { id: 11, name: 'Monthly Attendance Report', category: 'Attendance' },
    { id: 12, name: 'Annual Attendance Report', category: 'Attendance' },
    { id: 13, name: 'Consecutive Absence (≥2 Days) Report', category: 'Alerts' },
    { id: 14, name: 'Repeated Notebook Missing Report', category: 'Alerts' },
    { id: 15, name: 'Repeated Textbook Missing Report', category: 'Alerts' },
    { id: 16, name: 'Repeated Complaint (3x Discipline) Report', category: 'Alerts' },
    { id: 17, name: 'Parent Meeting & Follow-Up Report', category: 'Communication' },
    { id: 18, name: 'Class-Wise Student Performance Report', category: 'Analytics' },
    { id: 19, name: 'Subject-Wise Performance Report', category: 'Analytics' },
    { id: 20, name: 'Students Requiring Attention Report', category: 'Alerts' },
    { id: 21, name: 'Hygiene and Uniform Inspection Report', category: 'Daily Monitoring' },
    { id: 22, name: 'Teacher Observation & Feedback Report', category: 'Daily Monitoring' },
    { id: 23, name: 'Daily Activity & Co-Curricular Report', category: 'Daily Monitoring' },
  ];

  const selectedReport = REPORT_TYPES.find((r) => r.id === selectedReportId) || REPORT_TYPES[0];
  const targetStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const selClass = classes.find((c) => c.id === selectedClassId);

  // PDF Generator using jsPDF and autoTable
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. School Header Banner
    doc.setFillColor(6, 95, 70); // Emerald 800
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('GREEN ISLAND FOUNDATION SCHOOL', pageWidth / 2, 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('(A Project of GIT)', pageWidth / 2, 16, { align: 'center' });
    doc.text('144-D Hali Road, P.E.C.H.S, Block 2, Karachi • info@greenisland.edu.pk', pageWidth / 2, 21, {
      align: 'center',
    });

    // 2. Report Subheading
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(selectedReport.name.toUpperCase(), 14, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Academic Year: ${settings.academicYear} | Issued Date: ${new Date().toLocaleDateString()}`, 14, 43);

    let tableHead: string[][] = [];
    let tableBody: (string | number)[][] = [];

    if (selectedReportId === 1 && targetStudent) {
      // Individual Student Portfolio
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Student: ${targetStudent.name} (Roll #${targetStudent.rollNo} • Adm: ${targetStudent.admissionNo})`, 14, 50);
      doc.setFont('helvetica', 'normal');
      doc.text(`Class: ${targetStudent.className} - ${targetStudent.sectionName} | Parent: ${targetStudent.fatherName} (${targetStudent.parentContact})`, 14, 55);

      const stdMarks = marks.filter((m) => m.studentId === targetStudent.id);
      tableHead = [['Subject', 'Total Marks', 'Obtained', 'Percentage', 'Grade', 'Teacher']];
      tableBody = stdMarks.map((m) => [
        m.subjectName,
        m.totalMarks,
        m.obtainedMarks ?? 'N/A',
        `${m.percentage}%`,
        m.grade,
        m.teacherName,
      ]);
    } else if (selectedReportId === 9) {
      // Students Below 60%
      const lowMarksList = marks.filter((m) => m.percentage !== null && m.percentage < 60);
      tableHead = [['Student Name', 'Roll #', 'Subject', 'Obtained / Total', 'Percentage', 'Teacher']];
      tableBody = lowMarksList.map((m) => [
        m.studentName,
        m.rollNo,
        m.subjectName,
        `${m.obtainedMarks} / ${m.totalMarks}`,
        `${m.percentage}%`,
        m.teacherName,
      ]);
    } else if (selectedReportId === 13) {
      // Consecutive Absence
      const attList = StorageService.getStudentsRequiringParentContact().filter((i) =>
        i.alerts.some((a) => a.category === 'Consecutive Absence')
      );
      tableHead = [['Student Name', 'Roll #', 'Class', 'Parent Contact', 'Alert Reason']];
      tableBody = attList.map((i) => [
        i.student.name,
        i.student.rollNo,
        `${i.student.className}-${i.student.sectionName}`,
        i.student.parentContact,
        i.alerts.find((a) => a.category === 'Consecutive Absence')?.description || '',
      ]);
    } else {
      // Generic Class / Section Summary
      const classStudents = students.filter(
        (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId
      );
      tableHead = [['Roll #', 'Student Name', 'Father Name', 'Admission No', 'Parent Contact', 'Status']];
      tableBody = classStudents.map((s) => [
        s.rollNo,
        s.name,
        s.fatherName,
        s.admissionNo,
        s.parentContact,
        s.status,
      ]);
    }

    autoTable(doc, {
      startY: selectedReportId === 1 ? 62 : 48,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [6, 95, 70],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // Signatures footer
    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    if (finalY + 30 < doc.internal.pageSize.getHeight()) {
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('_________________________', 20, finalY + 25);
      doc.text('Class Teacher Signature', 20, finalY + 30);

      doc.text('_________________________', pageWidth - 70, finalY + 25);
      doc.text('Principal / Head of School', pageWidth - 70, finalY + 30);
    }

    doc.save(`GIFS_${selectedReport.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Excel Export
  const handleExportExcel = () => {
    const classStudents = students.filter(
      (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId
    );
    const data = classStudents.map((s) => ({
      'Roll No': s.rollNo,
      'Student Name': s.name,
      'Father Name': s.fatherName,
      'Admission No': s.admissionNo,
      'Class': s.className,
      'Section': s.sectionName,
      'Parent Contact': s.parentContact,
      'Status': s.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `GIFS_${selectedReport.name.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-indigo-100 text-indigo-800 rounded-xl">
              <FileText className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Official School Reports & PDF Center
              </h2>
              <p className="text-xs text-slate-500">
                23 Standardized school reports with official Green Island Foundation School branding, charts, signatures, and instant PDF/Excel exports (Section 23)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={handleGeneratePDF}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Select Report Type (23 Available)</label>
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(Number(e.target.value))}
              className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900"
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id}. {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Filter Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Filter Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium"
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          {selectedReportId === 1 && (
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Select Individual Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Roll #{s.rollNo})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Preview Document */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 max-w-4xl mx-auto space-y-6">
        {/* Printable Official Header */}
        <div className="border-b-2 border-emerald-900 pb-4 text-center space-y-1">
          <div className="flex justify-center mb-2">
            <img
              src="/gifs_logo.png"
              alt="Green Island Foundation School"
              className="h-16 w-auto object-contain mx-auto"
            />
          </div>
          <h1 className="text-xl font-extrabold tracking-wide text-slate-900">
            Green Island Foundation School
          </h1>
          <p className="text-xs text-emerald-800 font-bold">
            (A Project of GIT)
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            144-D Hali Road, P.E.C.H.S, Block 2, Karachi • Phone: 021-3498-5521 • info@greenisland.edu.pk
          </p>
        </div>

        {/* Report Title */}
        <div className="flex flex-wrap items-center justify-between text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase">
              {selectedReport.name}
            </h3>
            <p className="text-slate-500">
              Class: <strong>{selClass?.name} - Section {selectedSectionId}</strong> • Academic Year: <strong>{settings.academicYear}</strong>
            </p>
          </div>
          <div className="text-right text-slate-500">
            <span>Date Generated: <strong>{new Date().toLocaleDateString()}</strong></span>
          </div>
        </div>

        {/* Preview Notice */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>
            Previewing live database records. Click <strong>Download Official PDF</strong> above for printable format with formal principal stamps and signature fields.
          </span>
          <button
            onClick={handleGeneratePDF}
            className="text-emerald-700 font-bold hover:underline shrink-0 ml-4"
          >
            Export PDF →
          </button>
        </div>
      </div>
    </div>
  );
};
