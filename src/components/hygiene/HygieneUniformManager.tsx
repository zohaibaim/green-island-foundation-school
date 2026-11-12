import React, { useState, useMemo, useEffect } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { HealthAndHygieneRecord, UniformRecord, HygieneStatus } from '../../types';
import { HeartPulse, CheckCircle2, AlertTriangle, Save, Check, Sparkles, Filter } from 'lucide-react';

export const HygieneUniformManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser } = useAuth();
  const students = StorageService.getStudents();
  const classes = StorageService.getClasses();

  // Determine initial class and section based on teacher assignment if available
  const initialClassId = useMemo(() => {
    if (currentUser?.assignedClasses && currentUser.assignedClasses.length > 0) {
      const match = currentUser.assignedClasses[0].split('-')[0];
      const found = classes.find((c) => c.name.toLowerCase() === match.toLowerCase() || c.id === match);
      if (found) return found.id;
    }
    return classes[0]?.id || 'c9';
  }, [currentUser, classes]);

  const [activeSubTab, setActiveSubTab] = useState<'hygiene' | 'uniform'>('hygiene');
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('A');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [saveMsg, setSaveMsg] = useState('');

  // Target students for selected class & section
  const targetStudents = useMemo(() => {
    return students.filter(
      (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId && s.status === 'Active'
    );
  }, [students, selectedClassId, selectedSectionId]);

  // Form states map studentId -> values
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

  // Initialize forms when class or date changes
  useEffect(() => {
    const existingHealth = StorageService.getHealthRecords().filter(
      (h) => h.date === selectedDate
    );
    const existingUniform = StorageService.getUniformRecords().filter(
      (u) => u.date === selectedDate
    );

    const initialHygiene: Record<string, any> = {};
    const initialUniform: Record<string, any> = {};

    targetStudents.forEach((std) => {
      const hMatch = existingHealth.find((h) => h.studentId === std.id);
      if (hMatch) {
        initialHygiene[std.id] = {
          nails: hMatch.nailsTrimmed || 'Satisfactory',
          hair: hMatch.hairMaintained || 'Satisfactory',
          cleanliness: hMatch.personalCleanliness || 'Satisfactory',
          remarks: hMatch.remarks || '',
        };
      } else {
        initialHygiene[std.id] = {
          nails: 'Satisfactory',
          hair: 'Satisfactory',
          cleanliness: 'Satisfactory',
          remarks: '',
        };
      }

      const uMatch = existingUniform.find((u) => u.studentId === std.id);
      if (uMatch) {
        initialUniform[std.id] = {
          properUniform: uMatch.properUniform || 'Satisfactory',
          shoes: uMatch.properShoes || 'Satisfactory',
          beltTie: uMatch.schoolBelt || 'Satisfactory',
          remarks: uMatch.remarks || '',
        };
      } else {
        initialUniform[std.id] = {
          properUniform: 'Satisfactory',
          shoes: 'Satisfactory',
          beltTie: 'Satisfactory',
          remarks: '',
        };
      }
    });

    setHygieneForm(initialHygiene);
    setUniformForm(initialUniform);
  }, [selectedClassId, selectedSectionId, selectedDate, targetStudents]);

  // Quick Action: Mark All Satisfactory
  const handleMarkAllSatisfactory = () => {
    if (activeSubTab === 'hygiene') {
      const updated: Record<string, any> = {};
      targetStudents.forEach((std) => {
        updated[std.id] = {
          ...hygieneForm[std.id],
          nails: 'Satisfactory',
          hair: 'Satisfactory',
          cleanliness: 'Satisfactory',
        };
      });
      setHygieneForm(updated);
    } else {
      const updated: Record<string, any> = {};
      targetStudents.forEach((std) => {
        updated[std.id] = {
          ...uniformForm[std.id],
          properUniform: 'Satisfactory',
          shoes: 'Satisfactory',
          beltTie: 'Satisfactory',
        };
      });
      setUniformForm(updated);
    }
  };

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
          teacherName: currentUser?.name || 'Class Teacher',
        });
      });
      setSaveMsg(`✓ Personal Hygiene inspection recorded successfully for ${targetStudents.length} students on ${selectedDate}!`);
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
          teacherName: currentUser?.name || 'Class Teacher',
        });
      });
      setSaveMsg(`✓ School Uniform & Grooming inspection recorded successfully for ${targetStudents.length} students on ${selectedDate}!`);
    }
    setTimeout(() => setSaveMsg(''), 4500);
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
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
                Morning physical inspection • Nails, hair grooming, cleanliness, uniform regulation, shoes, belt & badge (Section 14)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center">
              <button
                type="button"
                onClick={() => setActiveSubTab('hygiene')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSubTab === 'hygiene' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Personal Hygiene
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('uniform')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSubTab === 'uniform' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                School Uniform
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Record</span>
            </button>
          </div>
        </div>

        {/* Class, Section & Date Selectors */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Inspection Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Select Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800 min-w-[140px]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Select Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
            >
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div className="sm:ml-auto mt-2 sm:mt-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllSatisfactory}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Set All Satisfactory</span>
            </button>
          </div>
        </div>

        {saveMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveMsg}</span>
          </div>
        )}
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>
            {selectedClass?.name} - Section {selectedSectionId} ({targetStudents.length} Students) • {activeSubTab === 'hygiene' ? 'Personal Hygiene Inspection' : 'Uniform & Dress Code Inspection'}
          </span>
          <span className="text-slate-500 hidden sm:inline">
            Click status button to toggle Satisfactory / Needs Improvement
          </span>
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
                    <th className="py-2.5 px-3 text-center">Overall Cleanliness</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-3 text-center">Proper Uniform</th>
                    <th className="py-2.5 px-3 text-center">Proper Shoes & Socks</th>
                    <th className="py-2.5 px-3 text-center">Belt, Tie & Badge</th>
                  </>
                )}
                <th className="py-2.5 px-3">Observation Remarks</th>
                <th className="py-2.5 px-3 text-right">Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targetStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active students found in this class and section.
                  </td>
                </tr>
              ) : (
                targetStudents.map((std) => {
                  const hData = hygieneForm[std.id] || { nails: 'Satisfactory', hair: 'Satisfactory', cleanliness: 'Satisfactory', remarks: '' };
                  const uData = uniformForm[std.id] || { properUniform: 'Satisfactory', shoes: 'Satisfactory', beltTie: 'Satisfactory', remarks: '' };

                  return (
                    <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{std.rollNo}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{std.name}</td>

                      {activeSubTab === 'hygiene' ? (
                        <>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const next: HygieneStatus = hData.nails === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                                setHygieneForm((prev) => ({
                                  ...prev,
                                  [std.id]: { ...(prev[std.id] || hData), nails: next },
                                }));
                              }}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                                hData.nails === 'Satisfactory'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-600 text-white shadow-xs'
                              }`}
                            >
                              {hData.nails}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const next: HygieneStatus = hData.hair === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                                setHygieneForm((prev) => ({
                                  ...prev,
                                  [std.id]: { ...(prev[std.id] || hData), hair: next },
                                }));
                              }}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                                hData.hair === 'Satisfactory'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-600 text-white shadow-xs'
                              }`}
                            >
                              {hData.hair}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const next: HygieneStatus = hData.cleanliness === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                                setHygieneForm((prev) => ({
                                  ...prev,
                                  [std.id]: { ...(prev[std.id] || hData), cleanliness: next },
                                }));
                              }}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                                hData.cleanliness === 'Satisfactory'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-600 text-white shadow-xs'
                              }`}
                            >
                              {hData.cleanliness}
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const next: HygieneStatus = uData.properUniform === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                                setUniformForm((prev) => ({
                                  ...prev,
                                  [std.id]: { ...(prev[std.id] || uData), properUniform: next },
                                }));
                              }}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                                uData.properUniform === 'Satisfactory'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-600 text-white shadow-xs'
                              }`}
                            >
                              {uData.properUniform}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const next: HygieneStatus = uData.shoes === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                                setUniformForm((prev) => ({
                                  ...prev,
                                  [std.id]: { ...(prev[std.id] || uData), shoes: next },
                                }));
                              }}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                                uData.shoes === 'Satisfactory'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-600 text-white shadow-xs'
                              }`}
                            >
                              {uData.shoes}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const next: HygieneStatus = uData.beltTie === 'Satisfactory' ? 'Needs Improvement' : 'Satisfactory';
                                setUniformForm((prev) => ({
                                  ...prev,
                                  [std.id]: { ...(prev[std.id] || uData), beltTie: next },
                                }));
                              }}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                                uData.beltTie === 'Satisfactory'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-600 text-white shadow-xs'
                              }`}
                            >
                              {uData.beltTie}
                            </button>
                          </td>
                        </>
                      )}

                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Observation notes..."
                          value={activeSubTab === 'hygiene' ? hData.remarks : uData.remarks}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (activeSubTab === 'hygiene') {
                              setHygieneForm((prev) => ({
                                ...prev,
                                [std.id]: { ...(prev[std.id] || hData), remarks: val },
                              }));
                            } else {
                              setUniformForm((prev) => ({
                                ...prev,
                                [std.id]: { ...(prev[std.id] || uData), remarks: val },
                              }));
                            }
                          }}
                          className="w-full p-1.5 px-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none"
                        />
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectStudent(std.id)}
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
