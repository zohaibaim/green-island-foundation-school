import React, { useState } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { SystemSettings } from '../../types';
import {
  Database,
  Settings,
  Save,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  Shield,
  FileCode,
  CheckCircle2,
  Globe,
  Link2,
  AlertTriangle,
  KeyRound,
  ExternalLink,
  Unlink,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../../db/supabaseClient';

export const SystemSettingsAndSQL: React.FC = () => {
  const { canAccessAdminSettings } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSettings());
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Supabase Cloud Sync State
  const initialConfig = getSupabaseConfig();
  const [cloudUrl, setCloudUrl] = useState(initialConfig.url);
  const [cloudKey, setCloudKey] = useState(initialConfig.anonKey);
  const [isCloudConnected, setIsCloudConnected] = useState(initialConfig.isConnected);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({
    type: initialConfig.isConnected ? 'success' : 'idle',
    message: initialConfig.isConnected
      ? 'Connected to Supabase Cloud Database. Multi-device sync is active.'
      : '',
  });

  const sqlScript = StorageService.generateSupabaseSchemaSQL();

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSQL = () => {
    const blob = new Blob([sqlScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'green_island_school_supabase_schema.sql';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(settings);
    setSaveMsg('System settings and alert engine thresholds updated successfully!');
    setTimeout(() => setSaveMsg(''), 4000);
  };

  const handleTestAndSaveCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudUrl.trim() || !cloudKey.trim()) {
      setCloudStatusMsg({ type: 'error', message: 'Please enter both Supabase Project URL and Public Anon Key.' });
      return;
    }
    setIsTestingCloud(true);
    setCloudStatusMsg({ type: 'idle', message: 'Testing connection to Supabase cloud...' });

    const result = await testSupabaseConnection(cloudUrl, cloudKey);
    setIsTestingCloud(false);

    if (result.success) {
      saveSupabaseConfig(cloudUrl, cloudKey);
      setIsCloudConnected(true);
      setCloudStatusMsg({
        type: 'success',
        message: result.message || 'Successfully connected to Supabase! Multi-device sync is now active.',
      });
    } else {
      setCloudStatusMsg({ type: 'error', message: result.message });
    }
  };

  const handleDisconnectCloud = () => {
    if (confirm('Are you sure you want to disconnect Supabase Cloud Database? System will fall back to local offline mode.')) {
      clearSupabaseConfig();
      setCloudUrl('');
      setCloudKey('');
      setIsCloudConnected(false);
      setCloudStatusMsg({ type: 'idle', message: 'Disconnected from cloud database.' });
    }
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to restore the initial sample dataset? Any unsaved edits will be refreshed.')) {
      StorageService.resetToDefault();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <Database className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                System Configuration & Supabase PostgreSQL Architecture
              </h2>
              <p className="text-xs text-slate-500">
                Early warning alert engine parameters • PostgreSQL schema & RLS policies • Free-tier deployment scripts (Sections 25, 27, 29)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                StorageService.downloadDatabaseBackupFile();
                setSaveMsg('Full Master Database backup downloaded (.json)');
                setTimeout(() => setSaveMsg(''), 4000);
              }}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Master JSON</span>
            </button>
            <label className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Restore Backup</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const res = StorageService.importDatabaseJSON(evt.target?.result as string);
                    if (res.success) {
                      setSaveMsg(res.message);
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      alert(res.message);
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
            <button
              onClick={handleResetData}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Database Connection (Multi-Device Online Sync) */}
      <div className="bg-white rounded-2xl border-2 border-emerald-500/40 shadow-md p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              isCloudConnected ? 'bg-emerald-600' : 'bg-slate-700'
            }`}>
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Supabase Cloud Database & Multi-User Synchronization
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  isCloudConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isCloudConnected ? 'Cloud Sync Connected' : 'Offline / Local Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Connect your free Supabase PostgreSQL cloud database so all teachers and admins on any mobile or PC see the same data in real time.
              </p>
            </div>
          </div>

          {isCloudConnected && (
            <button
              type="button"
              onClick={handleDisconnectCloud}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          )}
        </div>

        {/* Status Message */}
        {cloudStatusMsg.message && (
          <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            cloudStatusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : cloudStatusMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            {cloudStatusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : cloudStatusMsg.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
            )}
            <span className="font-medium">{cloudStatusMsg.message}</span>
          </div>
        )}

        {/* Connection Form */}
        <form onSubmit={handleTestAndSaveCloud} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">
                Supabase Project URL *
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="url"
                  required
                  placeholder="https://xyzabcdefg.supabase.co"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Found in Supabase Project Settings → API → Project URL</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">
                Supabase Anon / Public Key *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={cloudKey}
                  onChange={(e) => setCloudKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Paste the Publishable / Anon key here</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
              >
                <span>Open Supabase Dashboard (Free)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <button
              type="submit"
              disabled={isTestingCloud}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl text-xs shadow-md inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isTestingCloud ? 'Testing Connection...' : isCloudConnected ? 'Update Cloud Connection' : 'Connect & Test Database'}</span>
            </button>
          </div>
        </form>

        {/* 4-Step Quick Setup Guide */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
          <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <span>Free Supabase Cloud Database Banane Ka 2-Minute Guide:</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 leading-relaxed">
            <li><strong>supabase.com</strong> par jayein aur apne wahi GitHub account se login karein.</li>
            <li><strong>"New Project"</strong> banayein (Project name: <code className="font-mono bg-white px-1 border border-slate-200 rounded">green-island-school</code>, password set karein, aur region Singapore/Mumbai choose karein).</li>
            <li>Supabase ke dashboard me left menu se <strong>"SQL Editor"</strong> me jayein, neche diya gaya SQL script copy karke wahan paste karein aur <strong>"Run"</strong> dabayein.</li>
            <li>Supabase ke <strong>Project Settings → API Keys</strong> se <strong>Project URL</strong> aur <strong>Publishable key</strong> copy karke yahan upar paste karein aur Connect daba dein!</li>
          </ol>
        </div>
      </div>

      {/* Alert Thresholds Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
          <Settings className="w-4 h-4 text-emerald-600" />
          <span>Automatic Alert Engine Thresholds (Sections 9.1, 10.2, 11.1, 12.1)</span>
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <label className="block text-slate-700 font-bold mb-1">
                Low Marks Threshold (%)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Scores below this trigger automatic RED ALERTS.
              </p>
              <input
                type="number"
                min="33"
                max="80"
                value={settings.lowMarksThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, lowMarksThreshold: Number(e.target.value) })
                }
                className="w-full p-2 rounded-lg border border-slate-300 font-bold text-rose-600 bg-white"
              />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <label className="block text-slate-700 font-bold mb-1">
                Consecutive Absences (Days)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Consecutive unexplained absent working days.
              </p>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.consecutiveAbsenceThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, consecutiveAbsenceThreshold: Number(e.target.value) })
                }
                className="w-full p-2 rounded-lg border border-slate-300 font-bold text-amber-600 bg-white"
              />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <label className="block text-slate-700 font-bold mb-1">
                Missing Notebook Limit (Weekly)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Missing notebook count in same subject per week.
              </p>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.repeatedMissingNotebookThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, repeatedMissingNotebookThreshold: Number(e.target.value) })
                }
                className="w-full p-2 rounded-lg border border-slate-300 font-bold text-amber-600 bg-white"
              />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <label className="block text-slate-700 font-bold mb-1">
                Repeated Complaint Limit
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Complaints in same category for 3x RED ALERT.
              </p>
              <input
                type="number"
                min="2"
                max="5"
                value={settings.repeatedComplaintThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, repeatedComplaintThreshold: Number(e.target.value) })
                }
                className="w-full p-2 rounded-lg border border-slate-300 font-bold text-rose-600 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">School Official Name</label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Official Address</label>
              <input
                type="text"
                value={settings.schoolAddress}
                onChange={(e) => setSettings({ ...settings, schoolAddress: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveMsg ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {saveMsg}
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save System Thresholds</span>
            </button>
          </div>
        </form>
      </div>

      {/* 1-Click Project Source Code ZIP Download Card */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl shadow-md p-6 text-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-300" />
              <h3 className="text-base font-bold text-white">
                Download Complete Project Source Code (.ZIP)
              </h3>
            </div>
            <p className="text-xs text-purple-200 max-w-2xl leading-relaxed">
              Agar aap ko yeh pura software computer me chalana hay ya GitHub par dalna hay, to yahan se 1-Click me poori project ZIP file download karein (tamam components, pages, database schemas, aur styling included).
            </p>
          </div>
          <a
            href="/green_island_portal_source_code.zip"
            download="green_island_portal_source_code.zip"
            className="px-5 py-2.5 bg-white hover:bg-purple-50 text-purple-950 font-bold rounded-xl text-xs shadow-lg inline-flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-700" />
            <span>Download Source Code (ZIP)</span>
          </a>
        </div>
      </div>

      {/* Production Supabase Schema & SQL Deployment Scripts */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-600" />
              <span>Production Supabase PostgreSQL Schema & RLS Setup Script</span>
            </h3>
            <p className="text-xs text-slate-500">
              Run this complete SQL script in your Supabase SQL Editor to provision tables, indexes, triggers, and Row Level Security.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopySQL}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy SQL'}</span>
            </button>

            <button
              onClick={handleDownloadSQL}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .sql</span>
            </button>
          </div>
        </div>

        {/* SQL Viewer */}
        <div className="relative">
          <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed">
            {sqlScript}
          </pre>
        </div>
      </div>
    </div>
  );
};
