import React, { useState } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { TeacherObservation, DailyActivity } from '../../types';
import { Award, Plus, Calendar, User, Sparkles } from 'lucide-react';

export const ObservationsManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser } = useAuth();
  const students = StorageService.getStudents();
  const [observations, setObservations] = useState<TeacherObservation[]>(() =>
    StorageService.getObservations()
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newObs, setNewObs] = useState({
    studentId: students[0]?.id || '',
    category: 'Academic' as 'Academic' | 'Behavioural' | 'Social' | 'Leadership' | 'General',
    positiveRemarks: '',
    improvementSuggestions: '',
    teacherObservations: '',
    recommendedAction: '',
  });

  const handleCreateObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const std = students.find((s) => s.id === newObs.studentId);
    if (!std) return;

    StorageService.addObservation({
      studentId: std.id,
      studentName: std.name,
      date: new Date().toISOString().split('T')[0],
      teacherName: currentUser?.name || 'Authorized Staff',
      category: newObs.category,
      positiveRemarks: newObs.positiveRemarks,
      improvementSuggestions: newObs.improvementSuggestions,
      teacherObservations: newObs.teacherObservations,
      recommendedAction: newObs.recommendedAction,
    });

    setObservations(StorageService.getObservations());
    setIsModalOpen(false);
    setNewObs({
      studentId: students[0]?.id || '',
      category: 'Academic',
      positiveRemarks: '',
      improvementSuggestions: '',
      teacherObservations: '',
      recommendedAction: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <Award className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daily Teacher Observations & Suggestions
              </h2>
              <p className="text-xs text-slate-500">
                Positive reinforcement, growth suggestions, classroom participation, and co-curricular achievements (Section 15 & 16)
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors text-xs self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Observation</span>
          </button>
        </div>
      </div>

      {/* Observation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {observations.map((obs) => (
          <div
            key={obs.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span
                  className="font-bold text-slate-900 cursor-pointer hover:text-emerald-700"
                  onClick={() => onSelectStudent(obs.studentId)}
                >
                  {obs.studentName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {obs.category || 'General'}
                </span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">{obs.date}</span>
            </div>

            {obs.positiveRemarks && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-emerald-950">
                <strong className="block text-[11px] uppercase tracking-wider text-emerald-800 mb-0.5">
                  Positive Remarks:
                </strong>
                <p>{obs.positiveRemarks}</p>
              </div>
            )}

            {obs.improvementSuggestions && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-amber-950">
                <strong className="block text-[11px] uppercase tracking-wider text-amber-800 mb-0.5">
                  Improvement Suggestions:
                </strong>
                <p>{obs.improvementSuggestions}</p>
              </div>
            )}

            {obs.recommendedAction && (
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-800">
                <strong className="block text-[11px] uppercase tracking-wider text-slate-600 mb-0.5">
                  Recommended Action:
                </strong>
                <p>{obs.recommendedAction}</p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Logged by: {obs.teacherName}</span>
              <button
                onClick={() => onSelectStudent(obs.studentId)}
                className="text-emerald-700 font-bold hover:underline"
              >
                Open Portfolio →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Observation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Record Teacher Observation
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateObservation} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Student *</label>
                  <select
                    value={newObs.studentId}
                    onChange={(e) => setNewObs({ ...newObs, studentId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Roll #{s.rollNo} - {s.className})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Category *</label>
                  <select
                    value={newObs.category}
                    onChange={(e) => setNewObs({ ...newObs, category: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Behavioural">Behavioural</option>
                    <option value="Social">Social</option>
                    <option value="Leadership">Leadership</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">1. Positive Remarks *</label>
                <textarea
                  rows={2}
                  required
                  value={newObs.positiveRemarks}
                  onChange={(e) => setNewObs({ ...newObs, positiveRemarks: e.target.value })}
                  placeholder="Highlights, achievements, commendable conduct..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">2. Improvement Suggestions *</label>
                <textarea
                  rows={2}
                  required
                  value={newObs.improvementSuggestions}
                  onChange={(e) => setNewObs({ ...newObs, improvementSuggestions: e.target.value })}
                  placeholder="Specific areas to focus on..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">3. Recommended Action Plan</label>
                <input
                  type="text"
                  value={newObs.recommendedAction}
                  onChange={(e) => setNewObs({ ...newObs, recommendedAction: e.target.value })}
                  placeholder="e.g. Remedial clinic enrollment, House Prefect nomination..."
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
                  Save Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
