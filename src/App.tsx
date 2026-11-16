import React, { useState, useMemo, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorageService } from './db/storage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MainDashboard } from './components/dashboard/MainDashboard';
import { StudentPortfolio } from './components/portfolio/StudentPortfolio';
import { StudentList } from './components/students/StudentList';
import { AttendanceManager } from './components/attendance/AttendanceManager';
import { ExaminationsManager } from './components/academics/ExaminationsManager';
import { DailyMonitoringManager } from './components/monitoring/DailyMonitoringManager';
import { DisciplineManager } from './components/discipline/DisciplineManager';
import { AlertsManager } from './components/alerts/AlertsManager';
import { HygieneUniformManager } from './components/hygiene/HygieneUniformManager';
import { ObservationsManager } from './components/observations/ObservationsManager';
import { ParentMeetingsManager } from './components/communication/ParentMeetingsManager';
import { ExcelImportExport } from './components/excel/ExcelImportExport';
import { ReportsCenter } from './components/reports/ReportsCenter';
import { ClassesAndTeachersManager } from './components/admin/ClassesAndTeachersManager';
import { SystemSettingsAndSQL } from './components/admin/SystemSettingsAndSQL';
import { LoginModal } from './components/auth/LoginModal';

import { LayoutDashboard, AlertTriangle, Users, CalendarCheck, Menu, Lock, GraduationCap, BookOpen, ShieldAlert } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, currentUser, currentRole, targetTabAfterLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('std-1');
  const [dataVersion, setDataVersion] = useState<number>(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // When user successfully logs in and there was a pending target tab, switch to it
  useEffect(() => {
    if (isAuthenticated && currentUser && targetTabAfterLogin) {
      setActiveTab(targetTabAfterLogin);
    }
  }, [isAuthenticated, currentUser, targetTabAfterLogin]);

  // Compute total active alerts
  const activeAlertsCount = useMemo(() => {
    const list = StorageService.getStudentsRequiringParentContact();
    return list.length;
  }, [dataVersion, activeTab]);

  const isTabAllowedForRole = (tab: string): boolean => {
    if (currentRole === 'admin') return true;
    if (currentRole === 'principal') return tab !== 'system_settings';
    if (currentRole === 'class_teacher') {
      return !['system_settings', 'classes_teachers', 'excel_import'].includes(tab);
    }
    if (currentRole === 'subject_teacher') {
      return ['dashboard', 'academics', 'monitoring', 'complaints'].includes(tab);
    }
    return tab === 'dashboard';
  };

  useEffect(() => {
    if (isAuthenticated && currentUser && !isTabAllowedForRole(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [isAuthenticated, currentUser, currentRole, activeTab]);

  // Strict Security Gate: If user is not authenticated, DO NOT show the dashboard or any data!
  // Immediately render the dedicated full-screen Login & Staff Registration portal.
  if (!isAuthenticated || !currentUser) {
    return <LoginModal isStandalone />;
  }

  const handleSelectStudent = (id: string) => {
    if (currentRole === 'subject_teacher') return;
    setSelectedStudentId(id);
    setActiveTab('portfolio');
    setIsMobileMenuOpen(false);
  };

  const handleRefreshData = () => {
    setDataVersion((v) => v + 1);
  };

  const handleTabChange = (tab: string) => {
    if (!isTabAllowedForRole(tab)) return;
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans antialiased text-slate-800 w-full overflow-x-hidden">
      {/* Top Navbar with Branding, Quick Search, Mobile Menu Toggle & Role Switcher */}
      <Navbar
        onSelectStudent={handleSelectStudent}
        onNavigateToTab={handleTabChange}
        activeAlertsCount={activeAlertsCount}
        onRefreshData={handleRefreshData}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Body with Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar (Desktop persistent, Mobile off-canvas drawer) */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          activeAlertCount={activeAlertsCount}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto w-full min-w-0 p-3 sm:p-5 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            {activeTab === 'dashboard' && (
              <MainDashboard
                onSelectStudent={handleSelectStudent}
                onNavigateToTab={setActiveTab}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsManager onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'students' && (
              <StudentList onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'portfolio' && (
              <StudentPortfolio
                studentId={selectedStudentId}
                onBack={() => setActiveTab('students')}
                onNavigateToTab={setActiveTab}
                onSelectStudent={setSelectedStudentId}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceManager onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'academics' && (
              <ExaminationsManager onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'monitoring' && (
              <DailyMonitoringManager onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'complaints' && (
              <DisciplineManager onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'hygiene' && (
              <HygieneUniformManager onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'observations' && (
              <ObservationsManager onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'parent_meetings' && (
              <ParentMeetingsManager onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'excel_import' && (
              <ExcelImportExport
                onNavigateToStudent={(id) => {
                  if (id) handleSelectStudent(id);
                  else setActiveTab('students');
                }}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsCenter onSelectStudent={handleSelectStudent} />
            )}

            {activeTab === 'classes_teachers' && (
              currentRole === 'admin' || currentRole === 'principal' ? (
                <ClassesAndTeachersManager />
              ) : (
                <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                  <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Access Restricted to Administration</h3>
                  <p className="text-xs text-slate-500 mt-1">Only School Administrators and Principals have authorization to manage classes and staff assignments.</p>
                </div>
              )
            )}

            {activeTab === 'system_settings' && (
              currentRole === 'admin' ? (
                <SystemSettingsAndSQL />
              ) : (
                <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                  <div className="w-12 h-12 bg-rose-100 text-rose-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Super Administrator Restricted</h3>
                  <p className="text-xs text-slate-500 mt-1">Database schemas, credentials, and system settings are strictly restricted to the Super Administrator (zohaib.aim@gmail.com).</p>
                </div>
              )
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar (Role-aware thumb-friendly access for phones) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg select-none">
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            activeTab === 'dashboard' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'text-emerald-700 stroke-[2.5]' : ''}`} />
          <span>Home</span>
        </button>

        {currentRole === 'subject_teacher' ? (
          <>
            <button
              onClick={() => handleTabChange('academics')}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                activeTab === 'academics' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <GraduationCap className={`w-5 h-5 mb-0.5 ${activeTab === 'academics' ? 'text-emerald-700 stroke-[2.5]' : ''}`} />
              <span>Marks</span>
            </button>

            <button
              onClick={() => handleTabChange('monitoring')}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                activeTab === 'monitoring' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className={`w-5 h-5 mb-0.5 ${activeTab === 'monitoring' ? 'text-emerald-700 stroke-[2.5]' : ''}`} />
              <span>Books/HW</span>
            </button>

            <button
              onClick={() => handleTabChange('complaints')}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                activeTab === 'complaints' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className={`w-5 h-5 mb-0.5 ${activeTab === 'complaints' ? 'text-emerald-700 stroke-[2.5]' : ''}`} />
              <span>Complaints</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleTabChange('alerts')}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                activeTab === 'alerts' ? 'text-rose-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <AlertTriangle className={`w-5 h-5 mb-0.5 ${activeTab === 'alerts' ? 'text-rose-700 stroke-[2.5]' : ''}`} />
                {activeAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[9px] font-bold px-1 rounded-full animate-pulse min-w-[14px] text-center">
                    {activeAlertsCount}
                  </span>
                )}
              </div>
              <span>Alerts</span>
            </button>

            <button
              onClick={() => handleTabChange('students')}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                activeTab === 'students' || activeTab === 'portfolio' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className={`w-5 h-5 mb-0.5 ${activeTab === 'students' || activeTab === 'portfolio' ? 'text-emerald-700 stroke-[2.5]' : ''}`} />
              <span>Students</span>
            </button>

            <button
              onClick={() => handleTabChange('attendance')}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                activeTab === 'attendance' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className={`w-5 h-5 mb-0.5 ${activeTab === 'attendance' ? 'text-emerald-700 stroke-[2.5]' : ''}`} />
              <span>Attendance</span>
            </button>
          </>
        )}

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            isMobileMenuOpen ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Menu className={`w-5 h-5 mb-0.5 ${isMobileMenuOpen ? 'text-emerald-700 stroke-[2.5]' : ''}`} />
          <span>Menu</span>
        </button>
      </nav>

      {/* Staff Authentication Modal */}
      <LoginModal />
    </div>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto font-bold text-lg">
              !
            </div>
            <h2 className="text-lg font-bold text-slate-900">Portal Display Interrupted</h2>
            <p className="text-xs text-slate-600">{this.state.errorMsg}</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl"
              >
                Reload Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('gifs_active_user_id');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Reset Session & Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
