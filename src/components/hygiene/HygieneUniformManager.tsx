import React, { useState } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { HealthAndHygieneRecord, UniformRecord, HygieneStatus } from '../../types';
import { HeartPulse, CheckCircle2, AlertTriangle, Save } from 'lucide-react';

export const HygieneUniformManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser } = useAuth();
  const students = StorageService.getStudents();
  const classes = StorageService.getClasses();

  const [activeSubTab, setActiveSubTab] = useState<'hygiene' | 'uniform'>('hygiene');
  const [selectedClassId, setSelectedClassId] = useState<string>('c9');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('A');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [saveMsg, setSaveMsg] = useState('');

  const targetStudents = students.filter(
    (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId
  );

  // Form states
  const [hygieneForm, setHygieneForm] = useState<Record<string, {
    nails: HygieneStatus;
    hair: HygieneStatus;
    cleanliness: HygieneStatus;
    remarks: string;
  }>>({});

  const [uniformForm, setUniformForm] = useState<Record<string, {
    properUniform: HygieneStatus;
    shoes: HygieneStatus;
    beltTie: HygieneStatus;
    remarks: string;
  }>>({});

  const handleSave = () => {
    if (activeSubTab === 'hygiene') {
      targetStudents.forEach((std) => {
        const item = hygieneForm[std.id] || { nails: 'Satisfactory', hair: 'Satisfactory', cleanliness: 'Satisfactory', remarks: '' };
        StorageService.saveHealthRecord({
          studentId: std.id,
          date: selectedDate,
          nailsTrimmed: item.nails,
          hairMaintained: item.hair,
          haircutStandard: item.hair,
          personalCleanliness: item.cleanliness,
          generalHygiene: item.cleanliness,
          remarks: item.remarks,
          teacherName: currentUser?.name || 'Authorized Staff',
        });
      });
      setSaveMsg(`Hygiene inspection saved for ${targetStudents.length} students.`);
    } else {
      targetStudents.forEach((std) => {
        const item = uniformForm[std.id] || { properUniform: 'Satisfactory', shoes: 'Satisfactory', beltTie: 'Satisfactory', remarks: '' };
        StorageService.saveUniformRecord({
          studentId: std.id,
          date: selectedDate,
          properUniform: item.properUniform,
          cleanUniform: item.properUniform,
          properShoes: item.shoes,
          properSocks: 'Satisfactory',
          schoolBelt: item.beltTie,
          schoolTie: item.beltTie,
          schoolBadge: 'Satisfactory',
          overallAppearance: item.properUniform,
          remarks: item.remarks,
          teacherName: currentUser?.name || 'Authorized Staff',
        });
      });
      setSaveMsg(`Uniform inspection saved for ${targetStudents.length} students.`);
    }
    setTimeout(() => setSaveMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <HeartPulse className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daily Health, Hygiene & School Uniform Monitoring
              </h2>
              <p className="text-xs text-slate-500">
                Checklist for nails, hair grooming, cleanliness, regulation uniform, shoes, tie, and badge (Section 14)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveSubTab('hygiene')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'hygiene' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Personal Hygiene
            </button>
            <button
              onClick={() => setActiveSubTab('uniform')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'uniform' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              School Uniform
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Record</span>
            </button>
          </div>
        </div>

        {saveMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveMsg}</span>
          </div>
        )}
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>{activeSubTab === 'hygiene' ? 'Hygiene Checklist' : 'Uniform Checklist'} Roster</span>
          <span className="text-slate-500">Click button to toggle status</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-16">Roll #</th>
                <th className="py-2.5 px-3">Student Name</th>
                {activeSubTab === 'hygiene' ? (
                  <>
                    <th className="py-2.5 px-3 text-center">Nails Trimmed</th>
                    <th className="py-2.5 px-3 text-center">Hair Groomed</th>
                    <th className="py-2.5 px-3 text-center">Cleanliness</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3 text-center">Proper Uniform</th>
                    <th className="py-2.5 px-3 text-center">Proper Shoes</th>
                    <th className="py-2.5 px-3 text-center">Belt & Badge</th>
                  </>
                )}
                <th className="py-2.5 px-3">Teacher Remarks</th>
                <th className="py-2.5 px-3 text-right">Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targetStudents.map((std) => (
                <tr key={std.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold">{std.rollNo}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{std.name}</td>

                  {activeSubTab === 'hygiene' ? (
                    <>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            const cur = hygieneForm[std.id]?.nails || 'Satisfactory';
                            const next = cur === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                            setHygieneForm({ ...hygieneForm, [std.id]: { ...hygieneForm[std.id], nails: next } });
                          }}
                          className={`px-2 py-0.5 rounded font-bold text-xs ${
                            (hygieneForm[std.id]?.nails || 'Satisfactory') === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {hygieneForm[std.id]?.nails || 'Satisfactory'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            const cur = hygieneForm[std.id]?.hair || 'Satisfactory';
                            const next = cur === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                            setHygieneForm({ ...hygieneForm, [std.id]: { ...hygieneForm[std.id], hair: next } });
                          }}
                          className={`px-2 py-0.5 rounded font-bold text-xs ${
                            (hygieneForm[std.id]?.hair || 'Satisfactory') === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {hygieneForm[std.id]?.hair || 'Satisfactory'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            const cur = hygieneForm[std.id]?.cleanliness || 'Satisfactory';
                            const next = cur === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                            setHygieneForm({ ...hygieneForm, [std.id]: { ...hygieneForm[std.id], cleanliness: next } });
                          }}
                          className={`px-2 py-0.5 rounded font-bold text-xs ${
                            (hygieneForm[std.id]?.cleanliness || 'Satisfactory') === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {hygieneForm[std.id]?.cleanliness || 'Satisfactory'}
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            const cur = uniformForm[std.id]?.properUniform || 'Satisfactory';
                            const next = cur === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                            setUniformForm({ ...uniformForm, [std.id]: { ...uniformForm[std.id], properUniform: next } });
                          }}
                          className={`px-2 py-0.5 rounded font-bold text-xs ${
                            (uniformForm[std.id]?.properUniform || 'Satisfactory') === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {uniformForm[std.id]?.properUniform || 'Satisfactory'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            const cur = uniformForm[std.id]?.shoes || 'Satisfactory';
                            const next = cur === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                            setUniformForm({ ...uniformForm, [std.id]: { ...uniformForm[std.id], shoes: next } });
                          }}
                          className={`px-2 py-0.5 rounded font-bold text-xs ${
                            (uniformForm[std.id]?.shoes || 'Satisfactory') === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {uniformForm[std.id]?.shoes || 'Satisfactory'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            const cur = uniformForm[std.id]?.beltTie || 'Satisfactory';
                            const next = cur === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                            setUniformForm({ ...uniformForm, [std.id]: { ...uniformForm[std.id], beltTie: next } });
                          }}
                          className={`px-2 py-0.5 rounded font-bold text-xs ${
                            (uniformForm[std.id]?.beltTie || 'Satisfactory') === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {uniformForm[std.id]?.beltTie || 'Satisfactory'}
                        </button>
                      </td>
                    </>
                  )}

                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      placeholder="Observation notes..."
                      className="w-full p-1 px-2 rounded border border-slate-200 text-xs bg-slate-50"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onSelectStudent(std.id)}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
