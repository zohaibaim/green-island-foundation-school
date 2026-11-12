import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../db/storage';
import { syncProfileToSupabase, getSupabaseClient } from '../../db/supabaseClient';
import { UserRole } from '../../types';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  School,
  X,
  AlertCircle,
  KeyRound,
  UserPlus,
  CheckCircle2,
  BookOpen,
  Users,
  Check,
} from 'lucide-react';

interface LoginModalProps {
  isStandalone?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isStandalone = false }) => {
  const { isLoginModalOpen, closeLoginModal, login, targetTabAfterLogin } = useAuth();

  // Mode: 'login' | 'signup' | 'success_pending'
  const [modalMode, setModalMode] = useState<'login' | 'signup' | 'success_pending'>('login');

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Self-Registration (Sign Up) State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupDesignation, setSignupDesignation] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('subject_teacher');
  const [signupClass, setSignupClass] = useState('Class IX-A');
  const [signupSubjects, setSignupSubjects] = useState<string[]>(['Mathematics']);
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [registeredEmailNotice, setRegisteredEmailNotice] = useState('');

  // School Curriculum Classes & Subjects
  const classes = StorageService.getClasses();
  const allSubjects = StorageService.getSubjects();

  if (!isStandalone && !isLoginModalOpen) return null;

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      setIsSubmitting(false);

      if (!result.success) {
        setErrorMsg(result.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Login failed. Please check your network connection.');
    }
  };

  // Toggle subject selection for Subject Teachers
  const toggleSubject = (subjectName: string) => {
    setSignupSubjects((prev) =>
      prev.includes(subjectName)
        ? prev.filter((s) => s !== subjectName)
        : [...prev, subjectName]
    );
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Sign Up Submission
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const cleanName = signupName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanPhone = signupPhone.trim();
    const cleanDesignation = signupDesignation.trim();

    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      scrollToTop();
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      scrollToTop();
      return;
    }

    if (signupPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      scrollToTop();
      return;
    }

    if (signupPassword.length < 4) {
      setErrorMsg('Password should be at least 4 characters long.');
      scrollToTop();
      return;
    }

    if (signupRole === 'subject_teacher' && signupSubjects.length === 0) {
      setErrorMsg('Please select at least one subject you teach.');
      scrollToTop();
      return;
    }

    setIsSubmitting(true);

    try {
      // Check cloud Supabase if already exists
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: cloudExisting, error: cloudCheckErr } = await supabase
          .from('profiles')
          .select('id, email, is_approved')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (cloudExisting && !cloudCheckErr) {
          setIsSubmitting(false);
          if (cloudExisting.is_approved === false) {
            setErrorMsg('A registration request for this email is already submitted and pending Administrator approval.');
          } else {
            setErrorMsg('This email address is already registered. Please sign in with your password.');
          }
          scrollToTop();
          return;
        }
      }

      // Build user object
      const assignedClasses = signupRole === 'class_teacher' ? [signupClass] : undefined;
      const assignedSubjects =
        signupRole === 'subject_teacher'
          ? signupSubjects.map((s) => ({
              classId: 'c9',
              sectionId: 'A',
              subjectName: s,
            }))
          : undefined;

      const res = StorageService.registerPendingUser({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        designation: cleanDesignation || (signupRole === 'class_teacher' ? 'Class Teacher' : 'Subject Teacher'),
        role: signupRole,
        password: signupPassword,
        isActive: true,
        assignedClasses,
        assignedSubjects,
        selectedSubjectNames: signupRole === 'subject_teacher' ? signupSubjects : undefined,
      });

      if (!res.success) {
        setIsSubmitting(false);
        setErrorMsg(res.error || 'Registration failed.');
        scrollToTop();
        return;
      }

      if (res.user) {
        await syncProfileToSupabase(res.user);
      }

      setIsSubmitting(false);
      setRegisteredEmailNotice(cleanEmail);
      setModalMode('success_pending');
      scrollToTop();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Registration failed. Please check network.');
      scrollToTop();
    }
  };

  const handleResetToLogin = () => {
    setModalMode('login');
    setErrorMsg(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div
      className={
        isStandalone
          ? 'min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-3 sm:p-6 overflow-y-auto'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto'
      }
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden select-none my-6">
        {/* Header with School Crest */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 sm:p-6 text-white text-center relative">
          {!isStandalone && (
            <button
              onClick={closeLoginModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-900/60 transition-colors"
              title="Close and return to Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="mx-auto mb-2 flex items-center justify-center">
            <img
              src="/gifs_logo.png"
              alt="Green Island Foundation School"
              className="h-14 sm:h-16 w-auto object-contain bg-white rounded-xl p-1.5 shadow-md border border-white/40"
            />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">Green Island Foundation School</h2>
          <p className="text-xs text-emerald-100 font-semibold">(A Project of GIT) • 144-D Hali Road, P.E.C.H.S, Block 2</p>
          <p className="text-[11px] text-emerald-200 mt-0.5">Staff Security & Academic Management Portal</p>

          {/* Mode Switch Tabs */}
          <div className="mt-4 flex items-center justify-center bg-emerald-950/40 p-1 rounded-xl max-w-xs mx-auto border border-emerald-600/30">
            <button
              type="button"
              onClick={() => {
                setModalMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                modalMode === 'login'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setModalMode('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                modalMode === 'signup'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              Staff Sign Up
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div ref={scrollContainerRef} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {targetTabAfterLogin && modalMode === 'login' && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Please sign in to access <strong>{targetTabAfterLogin.replace('_', ' ').toUpperCase()}</strong>.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 1: SIGN IN MODE */}
          {/* ------------------------------------------------------------- */}
          {modalMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Official Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="name@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Account Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 bg-slate-50 focus:bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Verifying...' : 'Sign In to Portal'}</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('signup');
                    setErrorMsg(null);
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                >
                  New Teacher or Staff Member? Register / Sign Up for an Account →
                </button>
              </div>

              {/* Security Advisory for Visitors */}
              <div className="mt-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Authorized Staff Portal</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Approved staff members can sign in directly using their registered Email and Password anytime without requiring repeated approval.
                </p>
              </div>
            </form>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: STAFF SELF-REGISTRATION (SIGN UP) MODE */}
          {/* ------------------------------------------------------------- */}
          {modalMode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <UserPlus className="w-4 h-4 text-emerald-700" />
                  <span>Teacher & Staff Self-Registration (One-Time Verification)</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  After submitting registration, the School Administrator will approve your account <strong>once (initial verification)</strong>. Once activated, you can log in directly with your registered Email and Password anytime.
                </p>
              </div>

              {/* Full Name & Official Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sir Asad / Ms. Fatima"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 font-medium text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@school.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 font-medium font-mono text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Phone & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="0300-1234567"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Science Teacher"
                    value={signupDesignation}
                    onChange={(e) => setSignupDesignation(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* School Role Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Your School Role *</label>
                <select
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value as UserRole)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs bg-slate-50"
                >
                  <option value="subject_teacher">Subject Teacher (Specialist in One or Multiple Subjects)</option>
                  <option value="class_teacher">Class Teacher (Incharge of a Specific Class & Section)</option>
                  <option value="principal">School Principal / Vice Principal</option>
                  <option value="general_user">General Staff / Auditor</option>
                </select>
              </div>

              {/* Class Teacher: Select assigned class */}
              {signupRole === 'class_teacher' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <label className="block text-slate-700 font-bold text-[11px]">
                    Assigned Class & Section *
                  </label>
                  <select
                    value={signupClass}
                    onChange={(e) => setSignupClass(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold text-emerald-800 text-xs bg-white"
                  >
                    {classes.flatMap((c) =>
                      c.sections.map((sec) => (
                        <option key={`${c.name}-${sec}`} value={`${c.name}-${sec}`}>
                          {c.name} - Section {sec}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Subject Teacher: MULTIPLE SUBJECTS SELECTION */}
              {signupRole === 'subject_teacher' && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-blue-950 font-bold text-[11px] flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                      <span>Select All Subjects You Teach (Multiple Allowed) *</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {signupSubjects.length} Selected
                    </span>
                  </div>

                  <p className="text-[10px] text-blue-800">
                    Select the subjects you are assigned to teach (multiple selections allowed):
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-blue-200">
                    {allSubjects.map((sub) => {
                      const isSelected = signupSubjects.includes(sub.name);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleSubject(sub.name)}
                          className={`flex items-center justify-between p-1.5 rounded text-left text-[11px] font-semibold transition-all border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{sub.name}</span>
                          {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Create Password *</label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 4 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full p-2 pr-8 rounded-xl border border-slate-300 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Confirm Password *</label>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Error banner directly above the submit button for mobile viewports */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-bold">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting Registration...' : 'Submit Registration for Approval'}</span>
              </button>

              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetToLogin}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Already have an account? Back to Sign In →
                </button>
              </div>
            </form>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: SUCCESS & PENDING APPROVAL SCREEN */}
          {/* ------------------------------------------------------------- */}
          {modalMode === 'success_pending' && (
            <div className="p-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Registration Request Submitted!
                </h3>
                <p className="text-xs text-emerald-700 font-semibold">
                  Your registration request has been submitted to the School Administrator.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Registered Email:</span>
                  <span className="font-mono font-bold text-slate-900">{registeredEmailNotice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Account Status:</span>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800">
                    Pending Admin Approval
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 leading-relaxed">
                  The School Administrator will verify and approve your account <strong>once (initial registration)</strong>. Once activated, you can <strong>sign in directly with your registered Email and Password anytime</strong> without repeated verification.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={handleResetToLogin}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Back to Sign In
                </button>
                {!isStandalone && (
                  <button
                    type="button"
                    onClick={closeLoginModal}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                )}
              </div>
            </div>
          )}

          {modalMode !== 'success_pending' && (
            <div className="pt-2 text-center border-t border-slate-100">
              {isStandalone ? (
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[11px] font-medium py-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Authorized Faculty & Admin Only • School Records Protected</span>
                </div>
              ) : (
                <button
                  onClick={closeLoginModal}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Continue as Visitor on Dashboard →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isStandalone && (
        <div className="text-center text-xs text-slate-400 mt-2 select-none">
          <p className="font-semibold text-slate-300">GREEN ISLAND FOUNDATION SCHOOL</p>
          <p className="text-[11px] text-slate-500">Student Portfolio, Academic Records & Monitoring System • 2026-2027</p>
        </div>
      )}
    </div>
  );
};
