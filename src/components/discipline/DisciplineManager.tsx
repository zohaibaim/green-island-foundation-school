import React, { useState, useMemo } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import {
  StudentComplaint,
  ComplaintCategory,
  ComplaintStatus,
  Student,
} from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  Phone,
  CheckCircle2,
  Calendar,
  Filter,
  Search,
  MessageSquare,
} from 'lucide-react';

export const DisciplineManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser, canSubmitComplaint } = useAuth();
  const allStudents = StorageService.getStudents();
  const [complaints, setComplaints] = useState<StudentComplaint[]>(() => StorageService.getComplaints());

  // Filters & State
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalClassFilter, setModalClassFilter] = useState<string>('ALL');

  // New Complaint Form State
  const [newComplaint, setNewComplaint] = useState({
    studentId: allStudents[0]?.id || '',
    category: 'Disrespectful behaviour' as ComplaintCategory,
    subject: 'General Conduct',
    description: '',
    actionTaken: 'Verbal reprimand and diary notice issued.',
    followUpDate: '',
  });

  const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
    'Misbehaviour',
    'Fighting',
    'Bullying',
    'Disrespectful behaviour',
    'Classroom disturbance',
    'Homework not completed',
    'Notebook not brought',
    'Textbook not brought',
    'Uniform violation',
    'Late coming',
    'Mobile phone misuse',
    'Inappropriate language',
    'Academic negligence',
    'Other complaints',
  ];

  // SECTION 12.1: Repeated Complaint Tracker (Same student + Same Category)
  const repeatedComplaintAlerts = useMemo(() => {
    const map: Record<string, { student: Student; category: ComplaintCategory; count: number; items: StudentComplaint[] }> = {};

    complaints.forEach((c) => {
      const key = `${c.studentId}_${c.category}`;
      const std = allStudents.find((s) => s.id === c.studentId);
      if (!std) return;

      if (!map[key]) {
        map[key] = { student: std, category: c.category, count: 0, items: [] };
      }
      map[key].count++;
      map[key].items.push(c);
    });

    return Object.values(map).filter((item) => item.count >= 2);
  }, [complaints, allStudents]);

  // Filtered List
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.studentName.toLowerCase().includes(q) ||
          c.rollNo.includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [complaints, categoryFilter, statusFilter, searchQuery]);

  // Submit Complaint Handler
  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudent = allStudents.find((s) => s.id === newComplaint.studentId);
    if (!targetStudent) return;

    StorageService.addComplaint({
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      rollNo: targetStudent.rollNo,
      classId: targetStudent.classId,
      sectionId: targetStudent.sectionId,
      date: new Date().toISOString().split('T')[0],
      reportingTeacherId: currentUser?.id || 'staff',
      reportingTeacherName: currentUser?.name || 'Authorized Staff',
      subject: newComplaint.subject,
      category: newComplaint.category,
      description: newComplaint.description,
      actionTaken: newComplaint.actionTaken,
      followUpDate: newComplaint.followUpDate || undefined,
      status: 'Pending',
      parentContacted: false,
    });

    setComplaints(StorageService.getComplaints());
    setIsSubmitModalOpen(false);
    setNewComplaint({
      studentId: allStudents[0]?.id || '',
      category: 'Disrespectful behaviour',
      subject: 'General Conduct',
      description: '',
      actionTaken: 'Verbal reprimand and diary notice issued.',
      followUpDate: '',
    });
  };

  // Quick Status Updater
  const handleUpdateStatus = (id: string, status: ComplaintStatus) => {
    StorageService.updateComplaint(id, { status });
    setComplaints(StorageService.getComplaints());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-rose-100 text-rose-800 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Student Complaint & Discipline Management
              </h2>
              <p className="text-xs text-slate-500">
                14 Defined categories • 2nd incident warning • 3rd incident triggers RED ALERT & Parent Meeting (Section 12.1)
              </p>
            </div>
          </div>

          {canSubmitComplaint() && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors text-xs self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Log Discipline Incident</span>
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student, roll #, description..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 font-medium"
            >
              <option value="ALL">All Categories ({COMPLAINT_CATEGORIES.length})</option>
              {COMPLAINT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Under Review">Under Review</option>
              <option value="Parent Contacted">Parent Contacted</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 12.1: AUTOMATIC REPEATED COMPLAINTS HIGHLIGHT (RED ALERT) */}
      {repeatedComplaintAlerts.length > 0 && (
        <div className="bg-rose-50 rounded-2xl border-2 border-rose-300 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-rose-950 uppercase tracking-wide">
                  AUTOMATIC REPEATED COMPLAINT ALERTS – PARENT MEETING RECOMMENDED
                </h3>
                <p className="text-xs text-rose-900">
                  Triggered when a student accumulates multiple complaints in the EXACT SAME disciplinary category.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">
              {repeatedComplaintAlerts.length} Flagged Categories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {repeatedComplaintAlerts.map((rc, idx) => {
              const isRed = rc.count >= 3;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs shadow-xs space-y-2 ${
                    isRed ? 'bg-white border-rose-300' : 'bg-amber-50/80 border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{rc.student.name}</span>{' '}
                      <span className="text-slate-400">
                        (Roll #{rc.student.rollNo} • {rc.student.className}-{rc.student.sectionName})
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isRed ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {rc.count >= 3 ? '3x RED ALERT' : '2nd WARNING'}
                    </span>
                  </div>

                  <div className="font-semibold text-rose-900">
                    Category: <u>{rc.category}</u> ({rc.count} repeated occurrences)
                  </div>

                  <div className="text-[11px] text-slate-600">
                    Logged Incident Dates: <strong>{rc.items.map((i) => i.date).join(', ')}</strong>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-mono text-[11px]">
                      Parent: {rc.student.parentContact}
                    </span>
                    <button
                      onClick={() => onSelectStudent(rc.student.id)}
                      className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700"
                    >
                      Discipline File →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Complaints Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Complaints & Disciplinary Dossier ({filteredComplaints.length} Records)</span>
          <span className="text-slate-500">Historical records are never erased</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Student & Roll #</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Reported By</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComplaints.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{c.date}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    <span className="cursor-pointer hover:underline" onClick={() => onSelectStudent(c.studentId)}>
                      {c.studentName}
                    </span>
                    <span className="text-slate-400 font-normal block text-[11px]">
                      Roll #{c.rollNo}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-rose-900">{c.category}</td>
                  <td className="py-2.5 px-3 text-slate-700 max-w-sm">{c.description}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.reportingTeacherName}</td>
                  <td className="py-2.5 px-3">
                    <select
                      value={c.status}
                      onChange={(e) => handleUpdateStatus(c.id, e.target.value as ComplaintStatus)}
                      className="p-1 px-2 border border-slate-200 rounded text-xs font-semibold bg-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Parent Contacted">Parent Contacted</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => onSelectStudent(c.studentId)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                    >
                      Student File →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Complaint Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Log Student Discipline Incident
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-3">
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] leading-relaxed">
                <strong>School-Wide Incident Reporting:</strong> Both Class Teachers and Subject Teachers have authority to report discipline incidents for ANY student across all classes & grades.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Filter by Class (Optional)</label>
                  <select
                    value={modalClassFilter}
                    onChange={(e) => setModalClassFilter(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium text-xs bg-slate-50"
                  >
                    <option value="ALL">All Classes ({allStudents.length} Students)</option>
                    {Array.from(new Set(allStudents.map((s) => s.className))).map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Student *</label>
                  <select
                    required
                    value={newComplaint.studentId}
                    onChange={(e) => setNewComplaint({ ...newComplaint, studentId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium text-xs"
                  >
                    <option value="">-- Choose Student --</option>
                    {(modalClassFilter === 'ALL'
                      ? allStudents
                      : allStudents.filter((s) => s.className === modalClassFilter)
                    ).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Roll #{s.rollNo} - {s.className} {s.sectionName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Complaint Category *</label>
                  <select
                    required
                    value={newComplaint.category}
                    onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-rose-900 text-xs"
                  >
                    {COMPLAINT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Incident Subject / Period</label>
                  <input
                    type="text"
                    value={newComplaint.subject}
                    onChange={(e) => setNewComplaint({ ...newComplaint, subject: e.target.value })}
                    placeholder="e.g. Mathematics, English, Recess..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={3}
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                  placeholder="Describe the incident objectively with time and location..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Action Taken *</label>
                <input
                  type="text"
                  required
                  value={newComplaint.actionTaken}
                  onChange={(e) => setNewComplaint({ ...newComplaint, actionTaken: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl"
                >
                  Submit Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
