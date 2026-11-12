import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../db/storage';
import {
  Bell,
  Search,
  UserCheck,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  School,
  LogOut,
  RefreshCw,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import { Student } from '../../types';

interface NavbarProps {
  onSelectStudent: (studentId: string) => void;
  onNavigateToTab: (tabId: string) => void;
  activeAlertsCount: number;
  onRefreshData: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectStudent,
  onNavigateToTab,
  activeAlertsCount,
  onRefreshData,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const { currentUser, allUsers, switchUser, isVisitor, openLoginModal, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleSearch = (q: string) => {
    setSearchTerm(q);
    if (!q.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const allStudents = StorageService.getStudents();
    const query = q.toLowerCase();
    const filtered = allStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.rollNo.includes(query) ||
        s.admissionNo.toLowerCase().includes(query) ||
        s.className.toLowerCase().includes(query)
    );
    setSearchResults(filtered.slice(0, 6));
    setIsSearching(true);
  };

  const roleBadgeColor = currentUser ? {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    principal: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    class_teacher: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    subject_teacher: 'bg-blue-100 text-blue-800 border-blue-200',
    general_user: 'bg-slate-100 text-slate-800 border-slate-200',
  }[currentUser.role] : 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-emerald-900/10 shadow-xs no-print">
      {/* Top Emerald Brand Banner */}
      <div className="bg-emerald-900 text-emerald-50 px-3 sm:px-4 py-1 text-xs flex flex-wrap items-center justify-between border-b border-emerald-800 gap-1">
        <div className="flex items-center space-x-1.5 sm:space-x-2 truncate">
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-emerald-700 text-emerald-100 shrink-0">
            OFFICIAL
          </span>
          <span className="font-semibold tracking-wide text-[11px] sm:text-xs truncate">
            GREEN ISLAND FOUNDATION SCHOOL
          </span>
          <span className="hidden md:inline text-emerald-300/80">|</span>
          <span className="hidden md:inline text-emerald-200 text-xs">
            Student Portfolio & Daily Monitoring
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[10px] sm:text-[11px] text-emerald-200 shrink-0">
          <span>Year: <strong className="text-white">2026-2027</strong></span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="px-3 sm:px-4 lg:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Hamburger & School Crest */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile Hamburger Button */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition-colors focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-emerald-700" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="flex items-center space-x-2.5">
            <img
              src="/gifs_logo.png"
              alt="Green Island Foundation School"
              className="h-9 sm:h-11 w-auto object-contain bg-white rounded-lg p-0.5 border border-slate-200/80 shadow-xs shrink-0"
            />
            <div className="overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight truncate">
                  Green Island Foundation School
                </h1>
              </div>
              <p className="text-[10px] text-emerald-700 font-semibold truncate hidden xs:block">
                (A Project of GIT) • 144-D Hali Road, P.E.C.H.S, Block 2
              </p>
            </div>
          </div>
        </div>

        {/* Center: Quick Student Search (Desktop) */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search student by name, roll #, admission #..."
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50 hover:bg-white transition-colors"
            />
          </div>

          {/* Search Dropdown */}
          {isSearching && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-2 text-xs font-semibold text-slate-400 bg-slate-50 border-b border-slate-100">
                Found {searchResults.length} student{searchResults.length > 1 ? 's' : ''}
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((std) => (
                  <button
                    key={std.id}
                    onClick={() => {
                      onSelectStudent(std.id);
                      setIsSearching(false);
                      setSearchTerm('');
                    }}
                    className="w-full p-2.5 text-left hover:bg-emerald-50/60 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {std.name}{' '}
                        <span className="text-slate-400 font-normal">
                          (Roll #{std.rollNo})
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {std.className} - {std.sectionName}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                      View →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Icons & Role Switcher */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            title="Search Students"
            className="md:hidden p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
          {/* Active Alerts Bell */}
          <button
            onClick={() => onNavigateToTab('alerts')}
            title="View Active Student Alerts"
            className="relative p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
          >
            <Bell className="w-5 h-5" />
            {activeAlertsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white animate-pulse">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Quick Refresh */}
          <button
            onClick={onRefreshData}
            title="Recalculate Alerts & Refresh Data"
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors hidden sm:flex items-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Role / User Section */}
          {isVisitor || !currentUser ? (
            <button
              onClick={() => openLoginModal()}
              className="flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs shadow-xs transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>Staff Login</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                  </div>
                  <div className="text-[10px] font-medium text-emerald-700 capitalize">
                    {currentUser.role.replace('_', ' ')}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Profile & Role Switch Menu */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      {currentUser.email}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {currentUser.role.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {currentUser.designation}
                      </span>
                    </div>
                  </div>

                  {/* Admin Fast Role Preview */}
                  {currentUser.role === 'admin' && (
                    <>
                      <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Admin Switch Preview:
                      </div>
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {allUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              switchUser(user.id);
                              setShowRoleMenu(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                              user.id === currentUser.id ? 'bg-emerald-50/80 font-bold' : ''
                            }`}
                          >
                            <span className="truncate">{user.name}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-500">
                              {user.role.replace('_', ' ')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="p-2 border-t border-slate-100 bg-slate-50">
                    <button
                      onClick={() => {
                        logout();
                        setShowRoleMenu(false);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out (Exit to Login Screen)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Expandable Bar */}
      {showMobileSearch && (
        <div className="md:hidden px-3 py-2 bg-slate-50 border-t border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search student by name, roll #, admission #..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                className="absolute right-2.5 top-2 text-slate-400 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
          {isSearching && searchResults.length > 0 && (
            <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {searchResults.map((std) => (
                <button
                  key={std.id}
                  onClick={() => {
                    onSelectStudent(std.id);
                    setIsSearching(false);
                    setSearchTerm('');
                    setShowMobileSearch(false);
                  }}
                  className="w-full p-2 text-left hover:bg-emerald-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{std.name} (Roll #{std.rollNo})</div>
                    <div className="text-[10px] text-slate-500">{std.className} - {std.sectionName}</div>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold">Open →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
