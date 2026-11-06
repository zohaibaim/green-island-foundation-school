import React, { useState, useMemo } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { StudentAlert, AlertSeverity, Student, ParentMeeting } from '../../types';
import {
  AlertTriangle,
  PhoneCall,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldAlert,
  User,
  ArrowRight,
  FileCheck,
} from 'lucide-react';

interface AlertsManagerProps {
  onSelectStudent: (studentId: string) => void;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({ onSelectStudent }) => {
  const { currentUser, canScheduleParentMeeting } = useAuth();
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'RED' | 'ORANGE'>('ALL');
  const [selectedItemForMeeting, setSelectedItemForMeeting] = useState<{
    student: Student;
    alert: StudentAlert;
  } | null>(null);

  // Meeting Form
  const [meetingForm, setMeetingForm] = useState({
    parentName: '',
    contactNumber: '',
    meetingDate: new Date().toISOString().split('T')[0],
    meetingReason: '',
    teacherAttending: currentUser?.name || 'Authorized Staff',
    parentFeedback: '',
    agreedActionPlan: '',
    followUpDate: '',
  });

  const studentsRequiringContact = useMemo(() => {
    const list = StorageService.getStudentsRequiringParentContact();
    if (severityFilter === 'ALL') return list;
    return list.filter((i) => i.highestSeverity === severityFilter);
  }, [severityFilter]);

  const allAlertsCount = useMemo(() => {
    const alertsMap = StorageService.computeAllStudentAlerts();
    let count = 0;
    alertsMap.forEach((alerts) => {
      count += alerts.length;
    });
    return count;
  }, []);

  const handleOpenMeetingModal = (student: Student, alert: StudentAlert) => {
    setSelectedItemForMeeting({ student, alert });
    setMeetingForm({
      parentName: student.fatherName,
      contactNumber: student.parentContact,
      meetingDate: new Date().toISOString().split('T')[0],
      meetingReason: alert.title + ' - ' + alert.description,
      teacherAttending: currentUser?.name || 'Authorized Staff',
      parentFeedback: 'Parent agreed to monitor student daily work and attend follow-up review.',
      agreedActionPlan: 'Sign daily diary; enroll in remedial clinic; 2-week progress check.',
      followUpDate: '',
    });
  };

  const handleSaveParentMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForMeeting) return;

    StorageService.addParentMeeting({
      studentId: selectedItemForMeeting.student.id,
      studentName: selectedItemForMeeting.student.name,
      rollNo: selectedItemForMeeting.student.rollNo,
      className: selectedItemForMeeting.student.className,
      sectionName: selectedItemForMeeting.student.sectionName,
      parentName: meetingForm.parentName,
      contactNumber: meetingForm.contactNumber,
      meetingDate: meetingForm.meetingDate,
      meetingReason: meetingForm.meetingReason,
      relatedAlertId: selectedItemForMeeting.alert.id,
      teacherAttending: meetingForm.teacherAttending,
      parentFeedback: meetingForm.parentFeedback,
      agreedActionPlan: meetingForm.agreedActionPlan,
      followUpDate: meetingForm.followUpDate || undefined,
      meetingStatus: 'Scheduled',
    });

    setSelectedItemForMeeting(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-200 border border-rose-500/40 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Section 13 & 19 Centralized Alert Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Students Requiring Parent Contact
            </h2>
            <p className="text-xs sm:text-sm text-rose-100/90 mt-1 max-w-2xl">
              Real-time early warning system synthesizing academic scores, consecutive absences, missing subject materials,
              and disciplinary frequency.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setSeverityFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                severityFilter === 'ALL' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              All Alerts ({studentsRequiringContact.length})
            </button>
            <button
              onClick={() => setSeverityFilter('RED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                severityFilter === 'RED' ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              RED Only
            </button>
            <button
              onClick={() => setSeverityFilter('ORANGE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                severityFilter === 'ORANGE' ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              ORANGE Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Alert List */}
      <div className="space-y-4">
        {studentsRequiringContact.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">Zero Active Warnings</h3>
            <p className="text-xs text-slate-500 mt-1">
              All students meet attendance, academic, notebook, and conduct standards.
            </p>
          </div>
        ) : (
          studentsRequiringContact.map(({ student, alerts, highestSeverity, parentMeeting }) => {
            const isRed = highestSeverity === 'RED';

            return (
              <div
                key={student.id}
                className={`bg-white rounded-2xl border-2 p-5 shadow-xs transition-all hover:shadow-md ${
                  isRed ? 'border-rose-300 bg-rose-50/10' : 'border-amber-300 bg-amber-50/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shrink-0 ${
                        isRed ? 'bg-rose-600' : 'bg-amber-500'
                      }`}
                    >
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className="font-extrabold text-base text-slate-900 cursor-pointer hover:text-emerald-700"
                          onClick={() => onSelectStudent(student.id)}
                        >
                          {student.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">
                          Roll #{student.rollNo}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isRed ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {highestSeverity} ALERT
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {student.className} • {student.sectionName} • Admission No: {student.admissionNo}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-xs font-mono text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Father: {student.fatherName}</span>
                      <strong className="flex items-center gap-1">
                        <PhoneCall className="w-3 h-3 text-emerald-600" />
                        {student.parentContact}
                      </strong>
                    </div>

                    <button
                      onClick={() => handleOpenMeetingModal(student, alerts[0])}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule Meeting</span>
                    </button>

                    <button
                      onClick={() => onSelectStudent(student.id)}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                    >
                      Open Portfolio →
                    </button>
                  </div>
                </div>

                {/* List of active alerts for this student */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border flex items-start space-x-2.5 ${
                        alert.severity === 'RED'
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                          : 'bg-amber-50/70 border-amber-200 text-amber-950'
                      }`}
                    >
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          alert.severity === 'RED' ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>{alert.title}</span>
                          <span className="text-[10px] font-normal opacity-75">{alert.triggerDate}</span>
                        </div>
                        <p className="text-[11px] mt-0.5 opacity-90">{alert.description}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold opacity-80">
                          <span>Responsible: {alert.responsibleTeacher}</span>
                          <span>•</span>
                          <span>Category: {alert.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* If parent meeting exists */}
                {parentMeeting && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold">Scheduled Parent Meeting:</span> {parentMeeting.meetingDate} ({parentMeeting.meetingReason})
                      <div className="text-[11px] text-emerald-800">
                        Action Plan: {parentMeeting.agreedActionPlan}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-700 text-white">
                      {parentMeeting.meetingStatus}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Parent Meeting Scheduling Modal */}
      {selectedItemForMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Schedule Parent Meeting & Follow-up
                </h3>
                <p className="text-xs text-slate-500">
                  Student: {selectedItemForMeeting.student.name} (Roll #{selectedItemForMeeting.student.rollNo})
                </p>
              </div>
              <button
                onClick={() => setSelectedItemForMeeting(null)}
                className="text-slate-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveParentMeeting} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Parent Name *</label>
                  <input
                    type="text"
                    required
                    value={meetingForm.parentName}
                    onChange={(e) => setMeetingForm({ ...meetingForm, parentName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={meetingForm.contactNumber}
                    onChange={(e) => setMeetingForm({ ...meetingForm, contactNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Meeting Date *</label>
                <input
                  type="date"
                  required
                  value={meetingForm.meetingDate}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meetingDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reason for Meeting *</label>
                <textarea
                  rows={2}
                  required
                  value={meetingForm.meetingReason}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meetingReason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Agreed Action Plan *</label>
                <textarea
                  rows={2}
                  required
                  value={meetingForm.agreedActionPlan}
                  onChange={(e) => setMeetingForm({ ...meetingForm, agreedActionPlan: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={meetingForm.followUpDate}
                  onChange={(e) => setMeetingForm({ ...meetingForm, followUpDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItemForMeeting(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl"
                >
                  Confirm Meeting Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
