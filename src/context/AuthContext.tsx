import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Student } from '../types';
import { StorageService } from '../db/storage';
import { getSupabaseClient, fetchAllProfilesFromSupabase } from '../db/supabaseClient';

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
  canEnterMarksForSubject: (subjectName: string, classId: string, sectionId: string) => boolean;
  canMarkAttendance: (classId: string, sectionId: string) => boolean;
  canAccessAdminSettings: () => boolean;
  canSubmitComplaint: () => boolean;
  canScheduleParentMeeting: () => boolean;
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
    if (savedUserId) {
      const matched = users.find((u) => u.id === savedUserId);
      if (matched && matched.isActive !== false) {
        setCurrentUser(matched);
      } else {
        localStorage.removeItem('gifs_active_user_id');
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null); // Default to visitor on clean start
    }
  };

  useEffect(() => {
    refreshUsers();

    // Async sync with Supabase cloud profiles
    const syncFromCloud = async () => {
      try {
        const cloudProfiles = await fetchAllProfilesFromSupabase();
        if (cloudProfiles && cloudProfiles.length > 0) {
          const cloudEmails = new Set(cloudProfiles.map((cp) => cp.email.toLowerCase().trim()));
          const localUsers = StorageService.getUsers();

          // Cloud profiles are authoritative source of truth
          const updated: User[] = [...cloudProfiles];

          // Retain primary admin if not in cloud list
          localUsers.forEach((lu) => {
            const clean = lu.email.toLowerCase().trim();
            if (!cloudEmails.has(clean) && clean === 'zohaib.aim@gmail.com') {
              updated.push(lu);
            }
          });

          StorageService.saveUsers(updated);
          setAllUsers(updated);

          const activeId = localStorage.getItem('gifs_active_user_id');
          if (activeId) {
            const matchedActive = updated.find(
              (u) => u.id === activeId || u.email.toLowerCase().trim() === activeId.toLowerCase().trim()
            );
            if (matchedActive && matchedActive.isActive !== false) {
              setCurrentUser(matchedActive);
            } else {
              localStorage.removeItem('gifs_active_user_id');
              setCurrentUser(null);
            }
          }
        }
      } catch (err) {
        console.warn('Initial cloud sync warning:', err);
      }
    };

    syncFromCloud();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Try local storage first
    const res = StorageService.authenticateUser(email, password);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      localStorage.setItem('gifs_active_user_id', res.user.id);
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
            assignedClasses: data.assigned_classes || [],
            assignedSubjects: data.assigned_subjects || [],
            selectedSubjectNames: data.selected_subject_names || [],
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
    }
  };

  const role: UserRole | 'visitor' = currentUser ? currentUser.role : 'visitor';
  const isAuthenticated = currentUser !== null;
  const isVisitor = !isAuthenticated;

  // Strict Permission Matrix (Admin, Principal, Teacher, Visitor)
  const canAccessAdminSettings = () => role === 'admin';
  const canManageUsers = () => role === 'admin';

  const canEditStudentDetails = (student?: Student) => {
    if (role === 'admin') return true;
    if (role === 'class_teacher' && currentUser) {
      if (!student) return true;
      return currentUser.assignedClasses?.includes(`${student.className}-${student.sectionName.replace('Section ', '')}`) ?? true;
    }
    return false;
  };

  const canMarkAttendance = (classId: string, sectionId: string) => {
    if (role === 'admin' || role === 'principal') return true;
    if (role === 'class_teacher') return true;
    return false;
  };

  const canEnterMarksForSubject = (subjectName: string, classId: string, sectionId: string) => {
    if (role === 'admin') return true;
    if (role === 'class_teacher') return true;
    if (role === 'subject_teacher' && currentUser) {
      if (!currentUser.assignedSubjects || currentUser.assignedSubjects.length === 0) return true;
      return currentUser.assignedSubjects.some(
        (as) => as.subjectName.toLowerCase().includes(subjectName.toLowerCase()) || subjectName.toLowerCase().includes(as.subjectName.toLowerCase())
      );
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
        canEnterMarksForSubject,
        canMarkAttendance,
        canAccessAdminSettings,
        canSubmitComplaint,
        canScheduleParentMeeting,
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
