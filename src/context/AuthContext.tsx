import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Student } from '../types';
import { StorageService } from '../db/storage';
import {
  getSupabaseClient,
  startCloudRealtimeSync,
  CLOUD_SYNC_EVENT,
  PORTAL_STORAGE_KEYS,
} from '../db/supabaseClient';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole | 'visitor';
  isAuthenticated: boolean;
  isVisitor: boolean;
  allUsers: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (userId: string) => void;
  refreshUsers: () => void;
  isLoginModalOpen: boolean;
  targetTabAfterLogin: string | null;
  openLoginModal: (targetTab?: string) => void;
  closeLoginModal: () => void;
  canEditStudentDetails: (student?: Student) => boolean;
  canManageUsers: () => boolean;
  canCreateExams: () => boolean;
  canEnterMarksForSubject: (subjectName: string, classId: string, sectionId: string) => boolean;
  canMonitorSubject: (subjectName: string, classId: string, sectionId: string) => boolean;
  canMarkAttendance: (classId: string, sectionId: string) => boolean;
  canAccessAdminSettings: () => boolean;
  canSubmitComplaint: () => boolean;
  canScheduleParentMeeting: () => boolean;
  isClassAssignedToUser: (classId: string, sectionId?: string) => boolean;
  isSubjectAssignedToUser: (subjectName: string) => boolean;
  isReadOnly: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [targetTabAfterLogin, setTargetTabAfterLogin] = useState<string | null>(null);

  const refreshUsers = () => {
    const users = StorageService.getUsers();
    setAllUsers(users);
    const savedUserId = localStorage.getItem('gifs_active_user_id');
    const savedEmail = localStorage.getItem('gifs_active_user_email');
    if (savedUserId || savedEmail) {
      const matched = users.find(
        (u) =>
          (savedUserId && u.id === savedUserId) ||
          (savedEmail && u.email?.toLowerCase().trim() === savedEmail.toLowerCase().trim())
      );
      if (matched && matched.isActive !== false && matched.isApproved !== false) {
        setCurrentUser(matched);
        if (matched.id !== savedUserId) {
          localStorage.setItem('gifs_active_user_id', matched.id);
        }
      } else {
        localStorage.removeItem('gifs_active_user_id');
        localStorage.removeItem('gifs_active_user_email');
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null); // Default to visitor on clean start
    }
  };

  useEffect(() => {
    refreshUsers();

    // Listen for live profile updates pushed from cloud sync
    const handleCloudSync = (event: Event) => {
      const custom = event as CustomEvent<{ changedKeys?: string[] }>;
      const keys = custom?.detail?.changedKeys || [];
      if (keys.length === 0 || keys.includes(PORTAL_STORAGE_KEYS.USERS)) {
        refreshUsers();
      }
    };
    window.addEventListener(CLOUD_SYNC_EVENT, handleCloudSync);

    // Start live two-way Supabase Realtime + background polling engine across all tables
    const stopRealtimeSync = startCloudRealtimeSync();

    return () => {
      window.removeEventListener(CLOUD_SYNC_EVENT, handleCloudSync);
      stopRealtimeSync();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Try local storage first
    const res = StorageService.authenticateUser(email, password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      localStorage.setItem('gifs_active_user_id', res.user.id);
      localStorage.setItem('gifs_active_user_email', res.user.email.toLowerCase().trim());
      setIsLoginModalOpen(false);
      return { success: true };
    }

    // 2. Fallback to Supabase Cloud Database if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (data && !error) {
          const isTargetAdmin = cleanEmail === 'zohaib.aim@gmail.com';
          const expectedPassword =
            data.password ||
            (isTargetAdmin || data.role === 'admin' ? 'Malik@456' : data.role === 'principal' ? 'principal123' : 'teacher123');

          if (data.is_approved === false) {
            return {
              success: false,
              error: 'Your registration request is pending review and approval by the School Administrator. Once verified, you will be able to log in.',
            };
          }

          if (data.is_active === false) {
            return {
              success: false,
              error: 'This account has been deactivated by the Administrator. Please contact school admin.',
            };
          }

          if (expectedPassword !== password) {
            return { success: false, error: 'Incorrect password. Please verify your credentials.' };
          }

          // Verified from cloud Supabase
          const assignedCls: string[] = data.assigned_classes || [];
          const assignedSubjs = data.assigned_subjects || [];
          const selectedSubjNames: string[] = data.selected_subject_names || [];
          const cloudUser: User = {
            id: data.id || `u-${Date.now()}`,
            name: data.name,
            email: data.email,
            role: data.role,
            designation: data.designation || 'Staff Member',
            password: data.password || expectedPassword,
            phone: data.phone,
            isActive: data.is_active !== false,
            isApproved: data.is_approved !== false,
            assignedClasses: assignedCls,
            inChargeClass: data.role === 'class_teacher' ? assignedCls[0] : undefined,
            isDualTeacher:
              data.role === 'class_teacher' && (assignedSubjs.length > 0 || selectedSubjNames.length > 0),
            assignedSubjects: assignedSubjs,
            selectedSubjectNames: selectedSubjNames,
            registrationDate: data.created_at,
          };

          const currentUsers = StorageService.getUsers();
          const existingIdx = currentUsers.findIndex((u) => u.email.trim().toLowerCase() === cleanEmail);
          if (existingIdx >= 0) {
            currentUsers[existingIdx] = cloudUser;
          } else {
            currentUsers.push(cloudUser);
          }
          StorageService.saveUsers(currentUsers);
          setAllUsers(currentUsers);

          setCurrentUser(cloudUser);
          localStorage.setItem('gifs_active_user_id', cloudUser.id);
          localStorage.setItem('gifs_active_user_email', cloudUser.email.toLowerCase().trim());
          setIsLoginModalOpen(false);
          return { success: true };
        }
      } catch (cloudErr) {
        console.warn('Supabase cloud login error:', cloudErr);
      }
    }

    return { success: false, error: res.error || 'Authentication failed' };
  };

  const logout = () => {
    localStorage.removeItem('gifs_active_user_id');
    localStorage.removeItem('gifs_active_user_email');
    setCurrentUser(null);
  };

  const openLoginModal = (targetTab?: string) => {
    if (targetTab) {
      setTargetTabAfterLogin(targetTab);
    }
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setTargetTabAfterLogin(null);
  };

  const switchUser = (userId: string) => {
    const users = StorageService.getUsers();
    const matched = users.find((u) => u.id === userId);
    if (matched && matched.isActive !== false) {
      setCurrentUser(matched);
      localStorage.setItem('gifs_active_user_id', matched.id);
      localStorage.setItem('gifs_active_user_email', matched.email.toLowerCase().trim());
    }
  };

  const role: UserRole | 'visitor' = currentUser ? currentUser.role : 'visitor';
  const isAuthenticated = currentUser !== null;
  const isVisitor = !isAuthenticated;

  // Strict Permission Matrix (Admin, Principal, Class Teacher, Subject Teacher, General User)
  const canAccessAdminSettings = () => role === 'admin';
  const canManageUsers = () => role === 'admin';
  const canCreateExams = () => role === 'admin' || role === 'principal';

  const matchesClassToken = (token: string, classId: string, sectionId?: string): boolean => {
    const classes = StorageService.getClasses();
    const targetCls = classes.find((c) => c.id === classId);
    const cleanToken = token.trim();
    const lastDash = cleanToken.lastIndexOf('-');
    const clsPart = lastDash > -1 ? cleanToken.slice(0, lastDash).trim() : cleanToken;
    const secPart = lastDash > -1 ? cleanToken.slice(lastDash + 1).trim().toUpperCase().replace(/^SECTION\s+/i, '') : 'ALL';

    const classMatches =
      clsPart.toLowerCase() === classId.toLowerCase() ||
      (targetCls ? clsPart.toLowerCase() === targetCls.name.toLowerCase() : false);
    if (!classMatches) return false;
    if (!sectionId || secPart === 'ALL') return true;
    return secPart === sectionId.trim().toUpperCase();
  };

  const isClassAssignedToUser = (classId: string, sectionId?: string): boolean => {
    if (role === 'admin' || role === 'principal') return true;
    if (!currentUser) return false;
    const clsTokens = currentUser.assignedClasses || [];
    if (currentUser.inChargeClass && !clsTokens.includes(currentUser.inChargeClass)) {
      clsTokens.push(currentUser.inChargeClass);
    }
    if (clsTokens.some((t) => matchesClassToken(t, classId, sectionId))) return true;

    const subjs = currentUser.assignedSubjects || [];
    return subjs.some((as) => {
      if (!as.classId && !as.className) return false;
      const clsMatch =
        as.classId === 'ALL' ||
        as.classId === classId ||
        (as.className ? matchesClassToken(as.className, classId, sectionId) : false);
      if (!clsMatch) return false;
      if (!sectionId || !as.sectionId || as.sectionId === 'ALL') return true;
      return as.sectionId.toUpperCase() === sectionId.toUpperCase();
    });
  };

  const isSubjectAssignedToUser = (subjectName: string): boolean => {
    if (role === 'admin' || role === 'principal') return true;
    if (!currentUser) return false;
    const target = subjectName.trim().toLowerCase();
    const selectedNames = currentUser.selectedSubjectNames || [];
    if (selectedNames.some((s) => s.trim().toLowerCase() === target)) return true;
    const assignedSubjs = currentUser.assignedSubjects || [];
    return assignedSubjs.some((as) => as.subjectName.trim().toLowerCase() === target);
  };

  const canEditStudentDetails = (student?: Student) => {
    if (role === 'admin' || role === 'principal') return true;
    if (role === 'class_teacher' && currentUser) {
      if (!student) return true;
      return isClassAssignedToUser(student.classId, student.sectionId);
    }
    return false;
  };

  const canMarkAttendance = (classId: string, sectionId: string) => {
    if (role === 'admin' || role === 'principal') return true;
    if (role === 'class_teacher' && currentUser) {
      const homeroom = currentUser.inChargeClass || currentUser.assignedClasses?.[0];
      if (!homeroom && (!currentUser.assignedClasses || currentUser.assignedClasses.length === 0)) return true;
      return isClassAssignedToUser(classId, sectionId);
    }
    return false;
  };

  const canEnterMarksForSubject = (subjectName: string, classId: string, sectionId: string) => {
    if (role === 'admin' || role === 'principal') return true;
    if ((role === 'subject_teacher' || role === 'class_teacher') && currentUser) {
      const targetSubj = subjectName.trim().toLowerCase();
      const assignedSubjs = currentUser.assignedSubjects || [];
      const selectedSubjNames = currentUser.selectedSubjectNames || [];
      const assignedCls = currentUser.assignedClasses || [];

      // Check explicit (class, section, subject) bindings first
      const hasExplicitMatch = assignedSubjs.some((as) => {
        const subjMatch = as.subjectName.trim().toLowerCase() === targetSubj;
        if (!subjMatch) return false;
        const clsMatch =
          !as.classId || as.classId === 'ALL'
            ? assignedCls.some((t) => matchesClassToken(t, classId, sectionId))
            : as.classId === classId && (!as.sectionId || as.sectionId === 'ALL' || as.sectionId.toUpperCase() === sectionId.toUpperCase());
        return clsMatch;
      });
      if (hasExplicitMatch) return true;

      // Also check selectedSubjectNames paired with assignedClasses
      if (selectedSubjNames.some((s) => s.trim().toLowerCase() === targetSubj)) {
        if (assignedCls.some((t) => matchesClassToken(t, classId, sectionId))) return true;
      }

      return false;
    }
    return false;
  };

  const canMonitorSubject = (subjectName: string, classId: string, sectionId: string) => {
    if (role === 'admin' || role === 'principal') return true;
    if (role === 'class_teacher') {
      // Class teacher can monitor their assigned class across subjects, plus any extra assigned subjects/classes
      const homeroom = currentUser?.inChargeClass || currentUser?.assignedClasses?.[0];
      if (homeroom && matchesClassToken(homeroom, classId, sectionId)) return true;
      return canEnterMarksForSubject(subjectName, classId, sectionId);
    }
    if (role === 'subject_teacher') {
      return canEnterMarksForSubject(subjectName, classId, sectionId);
    }
    return false;
  };

  const canSubmitComplaint = () => {
    return role === 'admin' || role === 'principal' || role === 'class_teacher' || role === 'subject_teacher';
  };

  const canScheduleParentMeeting = () => {
    return role === 'admin' || role === 'principal' || role === 'class_teacher';
  };

  const isReadOnly = () => isVisitor || role === 'general_user';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: role,
        isAuthenticated,
        isVisitor,
        allUsers,
        login,
        logout,
        switchUser,
        refreshUsers,
        isLoginModalOpen,
        targetTabAfterLogin,
        openLoginModal,
        closeLoginModal,
        canEditStudentDetails,
        canManageUsers,
        canCreateExams,
        canEnterMarksForSubject,
        canMonitorSubject,
        canMarkAttendance,
        canAccessAdminSettings,
        canSubmitComplaint,
        canScheduleParentMeeting,
        isClassAssignedToUser,
        isSubjectAssignedToUser,
        isReadOnly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
