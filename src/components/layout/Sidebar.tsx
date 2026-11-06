import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../db/storage';
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  CalendarCheck,
  GraduationCap,
  BookOpen,
  ShieldAlert,
  Sparkles,
  MessageSquare,
  FileSpreadsheet,
  FileText,
  Settings,
  UserPlus,
  HeartPulse,
  Award,
  Layers,
  Database,
  X,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  activeAlertCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeAlertCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentRole, isVisitor, openLoginModal } = useAuth();
  const pendingStaffCount = currentRole === 'admin' ? StorageService.getPendingUsers().length : 0;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Main Dashboard',
      icon: LayoutDashboard,
      badge: null,
      section: 'Core',
    },
    {
      id: 'alerts',
      label: 'Parent Contact Desk',
      icon: AlertTriangle,
      badge: activeAlertCount > 0 ? activeAlertCount : null,
      badgeColor: 'bg-rose-500 text-white',
      section: 'Core',
    },
    {
      id: 'students',
      label: 'Students & Portfolios',
      icon: Users,
      badge: null,
      section: 'Academic & Records',
    },
    {
      id: 'attendance',
      label: 'Daily Attendance',
      icon: CalendarCheck,
      badge: null,
      section: 'Academic & Records',
    },
    {
      id: 'academics',
      label: 'Examinations & Marks',
      icon: GraduationCap,
      badge: null,
      section: 'Academic & Records',
    },
    {
      id: 'monitoring',
      label: 'Books & Homework Tracker',
      icon: BookOpen,
      badge: null,
      section: 'Daily Monitoring',
    },
    {
      id: 'complaints',
      label: 'Discipline & Complaints',
      icon: ShieldAlert,
      badge: null,
      section: 'Daily Monitoring',
    },
    {
      id: 'hygiene',
      label: 'Hygiene & Uniform',
      icon: HeartPulse,
      badge: null,
      section: 'Daily Monitoring',
    },
    {
      id: 'observations',
      label: 'Teacher Observations',
      icon: Award,
      badge: null,
      section: 'Daily Monitoring',
    },
    {
      id: 'parent_meetings',
      label: 'Parent Meetings & Log',
      icon: MessageSquare,
      badge: null,
      section: 'Communication',
    },
    {
      id: 'excel_import',
      label: 'Bulk Excel Registration',
      icon: FileSpreadsheet,
      badge: 'Excel',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      section: 'Tools & Reports',
    },
    {
      id: 'reports',
      label: 'Reports & PDF Center',
      icon: FileText,
      badge: '23 Types',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      section: 'Tools & Reports',
    },
    {
      id: 'classes_teachers',
      label: 'Classes & Teachers',
      icon: Layers,
      badge: currentRole === 'admin' && pendingStaffCount > 0 ? `${pendingStaffCount} Req` : null,
      badgeColor: 'bg-amber-500 text-white animate-pulse',
      section: 'Administration',
    },
    {
      id: 'system_settings',
      label: 'Settings & Supabase SQL',
      icon: Database,
      badge: 'SQL',
      badgeColor: 'bg-amber-100 text-amber-900',
      section: 'Administration',
    },
  ];

  // Group items by section
  const sections = ['Core', 'Academic & Records', 'Daily Monitoring', 'Communication', 'Tools & Reports', 'Administration'];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 no-print select-none transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* School Crest Badge */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shadow-xs">
              GIFS
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white tracking-wider truncate">
                GREEN ISLAND
              </p>
              <p className="text-[10px] text-emerald-400 font-medium truncate">
                Foundation School
              </p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none transition-colors"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {sections.map((sectionName) => {
            const items = navItems.filter((item) => item.section === sectionName);
            if (items.length === 0) return null;

            return (
              <div key={sectionName} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {sectionName}
                </div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isLocked = isVisitor && item.id !== 'dashboard';

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        onCloseMobile?.();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-900/30'
                          : isLocked
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        {isLocked && (
                          <span
                            title="Staff Login Required"
                            className="p-1 rounded bg-slate-800/80 text-amber-400/90 border border-slate-700/60"
                          >
                            <Lock className="w-3 h-3" />
                          </span>
                        )}

                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              item.badgeColor || 'bg-emerald-500 text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer User Info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
          {isVisitor ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Mode</span>
                <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Public Visitor
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  openLoginModal();
                  onCloseMobile?.();
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Staff Login</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Security Access</span>
                <span className="text-[10px] uppercase font-bold text-emerald-400">
                  {currentRole.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 truncate">
                Encrypted RLS & Audit Active
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
