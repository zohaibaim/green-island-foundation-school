import React, { useState } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { ParentMeeting } from '../../types';
import { MessageSquare, Plus, Calendar, Phone, CheckCircle2, Clock } from 'lucide-react';

export const ParentMeetingsManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser, canScheduleParentMeeting } = useAuth();
  const students = StorageService.getStudents();
  const [meetings, setMeetings] = useState<ParentMeeting[]>(() =>
    StorageService.getParentMeetings()
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    studentId: students[0]?.id || '',
    meetingDate: new Date().toISOString().split('T')[0],
    meetingReason: '',
    parentFeedback: '',
    agreedActionPlan: '',
    followUpDate: '',
    meetingStatus: 'Scheduled' as 'Scheduled' | 'Completed' | 'Follow-up Needed' | 'Cancelled',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const std = students.find((s) => s.id === form.studentId);
    if (!std) return;

    StorageService.addParentMeeting({
      studentId: std.id,
      studentName: std.name,
      rollNo: std.rollNo,
      className: std.className,
      sectionName: std.sectionName,
      parentName: std.fatherName,
      contactNumber: std.parentContact,
      meetingDate: form.meetingDate,
      meetingReason: form.meetingReason,
      teacherAttending: currentUser?.name || 'Authorized Staff',
      parentFeedback: form.parentFeedback,
      agreedActionPlan: form.agreedActionPlan,
      followUpDate: form.followUpDate || undefined,
      meetingStatus: form.meetingStatus,
    });

    setMeetings(StorageService.getParentMeetings());
    setIsModalOpen(false);
  };

  const updateStatus = (id: string, status: any) => {
    StorageService.updateParentMeeting(id, { meetingStatus: status });
    setMeetings(StorageService.getParentMeetings());
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Parent Meeting Records & Follow-Up Management
              </h2>
              <p className="text-xs text-slate-500">
                Direct parent communication log, agreed action plans, meeting notes, and follow-up schedules (Section 19)
              </p>
            </div>
          </div>

          {canScheduleParentMeeting() && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors text-xs self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Parent Conference</span>
            </button>
          )}
        </div>
      </div>

      {/* Meetings List */}
      <div className="space-y-3">
        {meetings.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500">No parent meetings recorded yet.</p>
          </div>
        ) : (
          meetings.map((m) => (
            <div
              key={m.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span
                    className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-emerald-700"
                    onClick={() => onSelectStudent(m.studentId)}
                  >
                    {m.studentName}
                  </span>{' '}
                  <span className="text-slate-400">
                    (Roll #{m.rollNo} • {m.className}-{m.sectionName})
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Parent: <strong>{m.parentName}</strong> ({m.contactNumber})
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={m.meetingStatus}
                    onChange={(e) => updateStatus(m.id, e.target.value)}
                    className="p-1 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Follow-up Needed">Follow-up Needed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={() => onSelectStudent(m.studentId)}
                    className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold"
                  >
                    Portfolio →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Meeting Context & Reason
                  </span>
                  <p className="font-semibold text-slate-800">{m.meetingReason}</p>
                  <div className="text-[11px] text-slate-500 pt-1">
                    Conference Date: <strong>{m.meetingDate}</strong> • Staff: {m.teacherAttending}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-1 text-emerald-950">
                  <span className="text-emerald-800 block text-[10px] uppercase font-bold">
                    Agreed Action Plan & Parent Feedback
                  </span>
                  <p><strong>Action Plan:</strong> {m.agreedActionPlan}</p>
                  {m.parentFeedback && (
                    <p className="italic text-[11px] pt-1">"{m.parentFeedback}"</p>
                  )}
                  {m.followUpDate && (
                    <div className="text-[11px] font-bold text-emerald-900 pt-1">
                      Follow-up Review Date: {m.followUpDate}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Log Parent Meeting
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Student *</label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Roll #{s.rollNo} - {s.className})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Meeting Date *</label>
                <input
                  type="date"
                  required
                  value={form.meetingDate}
                  onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Meeting Reason *</label>
                <input
                  type="text"
                  required
                  value={form.meetingReason}
                  onChange={(e) => setForm({ ...form, meetingReason: e.target.value })}
                  placeholder="e.g. Mid-term review, consecutive absences..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Agreed Action Plan *</label>
                <textarea
                  rows={2}
                  required
                  value={form.agreedActionPlan}
                  onChange={(e) => setForm({ ...form, agreedActionPlan: e.target.value })}
                  placeholder="Target goals, daily diary check..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={form.followUpDate}
                  onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
