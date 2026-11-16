import React, { useState, useMemo, useEffect } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { HygieneStatus, Student } from '../../types';
import { HeartPulse, CheckCircle2, Save, Check, Lock } from 'lucide-react';

type HygieneEntry = {
  nails: HygieneStatus;
  hair: HygieneStatus;
  cleanliness: HygieneStatus;
  remarks: string;
};

type UniformEntry = {
  properUniform: HygieneStatus;
  shoes: HygieneStatus;
  beltTie: HygieneStatus;
  remarks: string;
};

const DEFAULT_HYGIENE: HygieneEntry = {
  nails: 'Satisfactory',
  hair: 'Satisfactory',
  cleanliness: 'Satisfactory',
  remarks: '',
};

const DEFAULT_UNIFORM: UniformEntry = {
  properUniform: 'Satisfactory',
  shoes: 'Satisfactory',
  beltTie: 'Satisfactory',
  remarks: '',
};

export const HygieneUniformManager: React.FC<{ onSelectStudent: (id: string) => void }> = ({
  onSelectStudent,
}) => {
  const { currentUser, canMarkAttendance } = useAuth();
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const classes = StorageService.getClasses();

  useEffect(() => {
    setStudents(StorageService.getStudents());
  }, []);

  const initialToken = currentUser?.inChargeClass || currentUser?.assignedClasses?.[0] || '';

  const initialClassId = useMemo(() => {
    if (initialToken) {
      const lastDash = initialToken.lastIndexOf('-');
      const match = lastDash > -1 ? initialToken.slice(0, lastDash).trim() : initialToken;
      const found = classes.find((c) => c.name.toLowerCase() === match.toLowerCase() || c.id === match);
      if (found) return found.id;
    }
    return classes[0]?.id || 'c9';
  }, [initialToken, classes]);

  const initialSectionId = useMemo(() => {
    if (initialToken) {
      const lastDash = initialToken.lastIndexOf('-');
      if (lastDash > -1) {
        const sec = initialToken.slice(lastDash + 1).trim().toUpperCase().replace(/^SECTION\s+/i, '');
        if (sec !== 'ALL') return sec;
      }
    }
    return classes[0]?.sections[0] || 'A';
  }, [initialToken, classes]);

  const [activeSubTab, setActiveSubTab] = useState<'hygiene' | 'uniform'>('hygiene');
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSectionId);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [saveMsg, setSaveMsg] = useState('');
  const [bulkStatusValue, setBulkStatusValue] = useState<HygieneStatus>('Satisfactory');

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const availableSections = selectedClass?.sections || ['A', 'B', 'C', 'D'];

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.id === newClassId);
    if (cls && cls.sections.length > 0 && !cls.sections.includes(selectedSectionId)) {
      setSelectedSectionId(cls.sections[0]);
    }
  };

  const isEditable = canMarkAttendance(selectedClassId, selectedSectionId);

  // Target students for selected class & section
  const targetStudents = useMemo(() => {
    return students.filter(
      (s) => s.classId === selectedClassId && s.sectionId === selectedSectionId && s.status === 'Active'
    );
  }, [students, selectedClassId, selectedSectionId]);

  const targetStudentsKey = useMemo(() => targetStudents.map((s) => s.id).join(','), [targetStudents]);

  // Form states map studentId -> values
  const [hygieneForm, setHygieneForm] = useState<Record<string, HygieneEntry>>({});
  const [uniformForm, setUniformForm] = useState<Record<string, UniformEntry>>({});

  // Initialize forms when class, section, date, or roster changes
  useEffect(() => {
    const existingHealth = StorageService.getHealthRecords().filter(
      (h) => h.date === selectedDate
    );
    const existingUniform = StorageService.getUniformRecords().filter(
      (u) => u.date === selectedDate
    );

    const initialHygiene: Record<string, HygieneEntry> = {};
    const initialUniform: Record<string, UniformEntry> = {};

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
        initialHygiene[std.id] = { ...DEFAULT_HYGIENE };
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
        initialUniform[std.id] = { ...DEFAULT_UNIFORM };
      }
    });

    setHygieneForm(initialHygiene);
    setUniformForm(initialUniform);
  }, [selectedClassId, selectedSectionId, selectedDate, targetStudentsKey]);

  const updateHygieneField = (
    studentId: string,
    field: 'nails' | 'hair' | 'cleanliness',
    val: HygieneStatus
  ) => {
    if (!isEditable) return;
    setHygieneForm((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || DEFAULT_HYGIENE), [field]: val },
    }));
  };

  const updateUniformField = (
    studentId: string,
    field: 'properUniform' | 'shoes' | 'beltTie',
    val: HygieneStatus
  ) => {
    if (!isEditable) return;
    setUniformForm((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || DEFAULT_UNIFORM), [field]: val },
    }));
  };

  // Quick Action: Apply status to all students
  const handleBulkSetStatus = (statusVal: HygieneStatus) => {
    if (!isEditable) return;
    if (activeSubTab === 'hygiene') {
      setHygieneForm((prev) => {
        const updated: Record<string, HygieneEntry> = {};
        targetStudents.forEach((std) => {
          updated[std.id] = {
            ...(prev[std.id] || DEFAULT_HYGIENE),
            nails: statusVal,
            hair: statusVal,
            cleanliness: statusVal,
          };
        });
        return updated;
      });
    } else {
      setUniformForm((prev) => {
        const updated: Record<string, UniformEntry> = {};
        targetStudents.forEach((std) => {
          updated[std.id] = {
            ...(prev[std.id] || DEFAULT_UNIFORM),
            properUniform: statusVal,
            shoes: statusVal,
            beltTie: statusVal,
          };
        });
        return updated;
      });
    }
  };

  const handleSave = () => {
    if (!isEditable) return;
    if (activeSubTab === 'hygiene') {
      targetStudents.forEach((std) => {
        const item = hygieneForm[std.id] || DEFAULT_HYGIENE;
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
        const item = uniformForm[std.id] || DEFAULT_UNIFORM;
        StorageService.saveUniformRecord({
          studentId: std.id,
          date: selectedDate,
          properUniform: item.properUniform,
          cleanUniform: item.properUniform,
          properShoes: item.shoes,
          properSocks: item.shoes,
          schoolBelt: item.beltTie,
          schoolTie: item.beltTie,
          schoolBadge: item.beltTie,
          overallAppearance: item.properUniform,
          remarks: item.remarks,
          teacherName: currentUser?.name || 'Class Teacher',
        });
      });
      setSaveMsg(`✓ School Uniform & Grooming inspection recorded successfully for ${targetStudents.length} students on ${selectedDate}!`);
    }
    setTimeout(() => setSaveMsg(''), 4500);
  };

  const getStatusSelectStyle = (status: HygieneStatus) => {
    switch (status) {
      case 'Satisfactory':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Needs Improvement':
        return 'bg-rose-50 text-rose-800 border-rose-400';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

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
                Select inspection status from the dropdown list for Personal Hygiene & School Uniform tabs
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
              disabled={!isEditable || targetStudents.length === 0}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Record</span>
            </button>
          </div>
        </div>

        {/* Class, Section & Date Selectors */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end gap-3 text-xs">
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
              onChange={(e) => handleClassChange(e.target.value)}
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
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {isEditable && targetStudents.length > 0 && (
            <div className="sm:ml-auto mt-2 sm:mt-0 flex items-center gap-2">
              <label className="text-slate-500 font-semibold">Bulk Set All:</label>
              <select
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value as HygieneStatus)}
                className="p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
              >
                <option value="Satisfactory">Satisfactory</option>
                <option value="Needs Improvement">Needs Improvement</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
              <button
                type="button"
                onClick={() => handleBulkSetStatus(bulkStatusValue)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          )}
        </div>

        {!isEditable && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Read-Only View:</strong> You can only edit Hygiene & Uniform records for your assigned Class Teacher homeroom class ({currentUser?.inChargeClass || currentUser?.assignedClasses?.join(', ') || 'None'}).
            </span>
          </div>
        )}

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
            {selectedClass?.name} - Section {selectedSectionId} ({targetStudents.length} Students) •{' '}
            {activeSubTab === 'hygiene' ? 'Personal Hygiene Inspection' : 'Uniform & Dress Code Inspection'}
          </span>
          <span className="text-slate-500 hidden sm:inline">
            Select Satisfactory / Needs Improvement / Not Applicable from each dropdown list
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
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No active students found in {selectedClass?.name} - Section {selectedSectionId}.
                  </td>
                </tr>
              ) : (
                targetStudents.map((std) => {
                  const hData = hygieneForm[std.id] || DEFAULT_HYGIENE;
                  const uData = uniformForm[std.id] || DEFAULT_UNIFORM;

                  return (
                    <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{std.rollNo}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{std.name}</td>

                      {activeSubTab === 'hygiene' ? (
                        <>
                          <td className="py-3 px-3 text-center">
                            <select
                              disabled={!isEditable}
                              value={hData.nails}
                              onChange={(e) =>
                                updateHygieneField(std.id, 'nails', e.target.value as HygieneStatus)
                              }
                              className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getStatusSelectStyle(
                                hData.nails
                              )}`}
                            >
                              <option value="Satisfactory">Satisfactory</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                              <option value="Not Applicable">Not Applicable</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <select
                              disabled={!isEditable}
                              value={hData.hair}
                              onChange={(e) =>
                                updateHygieneField(std.id, 'hair', e.target.value as HygieneStatus)
                              }
                              className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getStatusSelectStyle(
                                hData.hair
                              )}`}
                            >
                              <option value="Satisfactory">Satisfactory</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                              <option value="Not Applicable">Not Applicable</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <select
                              disabled={!isEditable}
                              value={hData.cleanliness}
                              onChange={(e) =>
                                updateHygieneField(std.id, 'cleanliness', e.target.value as HygieneStatus)
                              }
                              className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getStatusSelectStyle(
                                hData.cleanliness
                              )}`}
                            >
                              <option value="Satisfactory">Satisfactory</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                              <option value="Not Applicable">Not Applicable</option>
                            </select>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3 text-center">
                            <select
                              disabled={!isEditable}
                              value={uData.properUniform}
                              onChange={(e) =>
                                updateUniformField(std.id, 'properUniform', e.target.value as HygieneStatus)
                              }
                              className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getStatusSelectStyle(
                                uData.properUniform
                              )}`}
                            >
                              <option value="Satisfactory">Satisfactory</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                              <option value="Not Applicable">Not Applicable</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <select
                              disabled={!isEditable}
                              value={uData.shoes}
                              onChange={(e) =>
                                updateUniformField(std.id, 'shoes', e.target.value as HygieneStatus)
                              }
                              className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getStatusSelectStyle(
                                uData.shoes
                              )}`}
                            >
                              <option value="Satisfactory">Satisfactory</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                              <option value="Not Applicable">Not Applicable</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <select
                              disabled={!isEditable}
                              value={uData.beltTie}
                              onChange={(e) =>
                                updateUniformField(std.id, 'beltTie', e.target.value as HygieneStatus)
                              }
                              className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${getStatusSelectStyle(
                                uData.beltTie
                              )}`}
                            >
                              <option value="Satisfactory">Satisfactory</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                              <option value="Not Applicable">Not Applicable</option>
                            </select>
                          </td>
                        </>
                      )}

                      <td className="py-3 px-3">
                        <input
                          type="text"
                          disabled={!isEditable}
                          placeholder="Observation notes..."
                          value={activeSubTab === 'hygiene' ? hData.remarks : uData.remarks}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (activeSubTab === 'hygiene') {
                              setHygieneForm((prev) => ({
                                ...prev,
                                [std.id]: { ...(prev[std.id] || DEFAULT_HYGIENE), remarks: val },
                              }));
                            } else {
                              setUniformForm((prev) => ({
                                ...prev,
                                [std.id]: { ...(prev[std.id] || DEFAULT_UNIFORM), remarks: val },
                              }));
                            }
                          }}
                          className="w-full min-w-[140px] p-1.5 px-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none disabled:opacity-60"
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
