import React, { useState, useMemo } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { Student, AlertSeverity } from '../../types';
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Phone,
  Trash2,
  Edit,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface StudentListProps {
  onSelectStudent: (studentId: string) => void;
}

export const StudentList: React.FC<StudentListProps> = ({ onSelectStudent }) => {
  const { canEditStudentDetails, canManageUsers } = useAuth();
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const classes = StorageService.getClasses();

  // Quick Navigation State (Section 7: Select Class → Select Section → Enter Roll Number → Open)
  const [quickClassId, setQuickClassId] = useState<string>('c9');
  const [quickSectionId, setQuickSectionId] = useState<string>('A');
  const [quickRollNo, setQuickRollNo] = useState<string>('');

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [selectedAlertFilter, setSelectedAlertFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for New Student
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    admissionNo: '',
    rollNo: '',
    fatherName: '',
    motherName: '',
    dob: '2012-01-01',
    gender: 'Male' as 'Male' | 'Female',
    admissionDate: new Date().toISOString().split('T')[0],
    academicYear: '2026-2027',
    classId: 'c9',
    sectionId: 'A',
    parentContact: '',
    emergencyContact: '',
    address: 'Karachi',
    medicalInfo: '',
    remarks: '',
  });

  const alertsMap = useMemo(() => StorageService.computeAllStudentAlerts(), [students]);

  // Handle Quick Navigation Open
  const handleQuickNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRollNo.trim()) return;
    const selectedClass = classes.find((c) => c.id === quickClassId);
    const target = students.find(
      (s) =>
        s.classId === quickClassId &&
        s.sectionId === quickSectionId &&
        s.rollNo.padStart(2, '0') === quickRollNo.trim().padStart(2, '0')
    );
    if (target) {
      onSelectStudent(target.id);
    } else {
      alert(`No student found with Roll #${quickRollNo} in ${selectedClass?.name || 'selected class'} Section ${quickSectionId}`);
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClassFilter !== 'ALL' && s.classId !== selectedClassFilter) return false;
      if (selectedSectionFilter !== 'ALL' && s.sectionId !== selectedSectionFilter) return false;

      const studentAlerts = alertsMap.get(s.id) || [];
      const hasRed = studentAlerts.some((a) => a.severity === 'RED');
      const hasOrange = studentAlerts.some((a) => a.severity === 'ORANGE');

      if (selectedAlertFilter === 'RED' && !hasRed) return false;
      if (selectedAlertFilter === 'ORANGE' && (!hasOrange || hasRed)) return false;
      if (selectedAlertFilter === 'GREEN' && (hasRed || hasOrange)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          s.name.toLowerCase().includes(q) ||
          s.rollNo.includes(q) ||
          s.admissionNo.toLowerCase().includes(q) ||
          s.fatherName.toLowerCase().includes(q) ||
          s.parentContact.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [students, selectedClassFilter, selectedSectionFilter, selectedAlertFilter, searchQuery, alertsMap]);

  // Export to Excel using SheetJS
  const handleExportExcel = () => {
    const exportData = filteredStudents.map((s) => {
      const studentAlerts = alertsMap.get(s.id) || [];
      const highestAlert = studentAlerts.some((a) => a.severity === 'RED')
        ? 'RED ALERT'
        : studentAlerts.some((a) => a.severity === 'ORANGE')
        ? 'ORANGE ALERT'
        : 'GREEN';

      return {
        'Admission No': s.admissionNo,
        'Roll No': s.rollNo,
        'Student Name': s.name,
        'Father Name': s.fatherName,
        'Class': s.className,
        'Section': s.sectionName,
        'Date of Birth': s.dob,
        'Gender': s.gender,
        'Parent Contact': s.parentContact,
        'Address': s.address,
        'Alert Status': highestAlert,
        'Active Alerts': studentAlerts.map((a) => a.title).join('; '),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `Green_Island_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Add Student Handler
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const selClass = classes.find((c) => c.id === newStudentData.classId);
    const created = StorageService.addStudent({
      ...newStudentData,
      className: selClass?.name || 'Class IX',
      sectionName: `Section ${newStudentData.sectionId}`,
      status: 'Active',
    });
    setStudents(StorageService.getStudents());
    setIsAddModalOpen(false);
    onSelectStudent(created.id);
  };

  // Delete Student Handler (Admin)
  const handleDeleteStudent = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete student ${name}?`)) {
      StorageService.deleteStudent(id);
      setStudents(StorageService.getStudents());
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Navigation Process (Section 7 requirement) */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700/80 px-2 py-0.5 rounded text-emerald-100">
              Quick Navigation Process
            </span>
            <h3 className="text-base sm:text-lg font-bold mt-1">
              Select Class → Select Section → Enter Roll No → Open Portfolio
            </h3>
            <p className="text-xs text-emerald-200 mt-0.5">
              Instantly jump directly to any student's complete 22-tab digital record.
            </p>
          </div>

          <form onSubmit={handleQuickNavigate} className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={quickClassId}
              onChange={(e) => setQuickClassId(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white text-slate-800 text-xs font-semibold focus:outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={quickSectionId}
              onChange={(e) => setQuickSectionId(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white text-slate-800 text-xs font-semibold focus:outline-none"
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>

            <input
              type="text"
              placeholder="Roll # (e.g. 01)"
              value={quickRollNo}
              onChange={(e) => setQuickRollNo(e.target.value)}
              className="w-28 sm:w-28 px-3 py-2 rounded-xl bg-white text-slate-800 text-xs font-semibold placeholder:text-slate-400 focus:outline-none"
            />

            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs text-center"
            >
              Open Profile →
            </button>
          </form>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Export, Register */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll #, admission #, phone..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel ({filteredStudents.length})</span>
            </button>

            {canEditStudentDetails() && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Register Student</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="p-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium text-xs"
          >
            <option value="ALL">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSectionFilter}
            onChange={(e) => setSelectedSectionFilter(e.target.value)}
            className="p-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium text-xs"
          >
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>

          <select
            value={selectedAlertFilter}
            onChange={(e) => setSelectedAlertFilter(e.target.value)}
            className="p-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium text-xs"
          >
            <option value="ALL">All Alert Statuses</option>
            <option value="RED">RED Alerts Only (&lt;60% or 3x Complaints)</option>
            <option value="ORANGE">ORANGE Alerts Only (Consecutive Absent / 3x Notebook)</option>
            <option value="GREEN">GREEN Only (Good Standing)</option>
          </select>

          <span className="ml-auto text-slate-400 text-[11px]">
            Showing <strong>{filteredStudents.length}</strong> of {students.length} students
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Student Name & Roll No</th>
                <th className="py-3 px-3">Class & Section</th>
                <th className="py-3 px-3">Admission No</th>
                <th className="py-3 px-3">Father / Guardian</th>
                <th className="py-3 px-3">Parent Phone</th>
                <th className="py-3 px-3">Alert Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No students match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const studentAlerts = alertsMap.get(std.id) || [];
                  const isRed = studentAlerts.some((a) => a.severity === 'RED');
                  const isOrange = studentAlerts.some((a) => a.severity === 'ORANGE');

                  return (
                    <tr
                      key={std.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectStudent(std.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {std.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {std.name}
                            </span>
                            <div className="text-[11px] text-slate-400 font-normal">
                              Roll #{std.rollNo} • {std.gender}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">{std.className}</span>
                        <span className="text-slate-400 block text-[11px]">{std.sectionName}</span>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 font-medium">
                        {std.admissionNo}
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {std.fatherName}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-700 text-[11px]">
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{std.parentContact}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {isRed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-300">
                            RED ALERT ({studentAlerts.length})
                          </span>
                        ) : isOrange ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            ORANGE ALERT ({studentAlerts.length})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            GREEN PASS
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onSelectStudent(std.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors border border-emerald-200"
                          >
                            Open Portfolio →
                          </button>

                          {canManageUsers() && (
                            <button
                              onClick={() => handleDeleteStudent(std.id, std.name)}
                              title="Delete Student (Admin)"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Register New Student Portfolio
                </h3>
                <p className="text-xs text-slate-500">
                  GREEN ISLAND FOUNDATION SCHOOL • Academic Year 2026-2027
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudentData.name}
                    onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                    placeholder="e.g. Danish Khan"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Admission Number *</label>
                  <input
                    type="text"
                    required
                    value={newStudentData.admissionNo}
                    onChange={(e) => setNewStudentData({ ...newStudentData, admissionNo: e.target.value })}
                    placeholder="e.g. GIFS-2026-0501"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Class *</label>
                  <select
                    value={newStudentData.classId}
                    onChange={(e) => setNewStudentData({ ...newStudentData, classId: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 font-medium"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Section *</label>
                  <select
                    value={newStudentData.sectionId}
                    onChange={(e) => setNewStudentData({ ...newStudentData, sectionId: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 font-medium"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={newStudentData.rollNo}
                    onChange={(e) => setNewStudentData({ ...newStudentData, rollNo: e.target.value })}
                    placeholder="e.g. 12"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Gender *</label>
                  <select
                    value={newStudentData.gender}
                    onChange={(e) => setNewStudentData({ ...newStudentData, gender: e.target.value as any })}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={newStudentData.dob}
                    onChange={(e) => setNewStudentData({ ...newStudentData, dob: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Father's Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudentData.fatherName}
                    onChange={(e) => setNewStudentData({ ...newStudentData, fatherName: e.target.value })}
                    placeholder="e.g. Mansoor Khan"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Parent Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={newStudentData.parentContact}
                    onChange={(e) => setNewStudentData({ ...newStudentData, parentContact: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Residential Address *</label>
                  <input
                    type="text"
                    required
                    value={newStudentData.address}
                    onChange={(e) => setNewStudentData({ ...newStudentData, address: e.target.value })}
                    placeholder="e.g. Gulshan-e-Iqbal, Karachi"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Medical Care & Allergies</label>
                <input
                  type="text"
                  value={newStudentData.medicalInfo}
                  onChange={(e) => setNewStudentData({ ...newStudentData, medicalInfo: e.target.value })}
                  placeholder="Optional medical alert for school clinic..."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                >
                  Create Student Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
