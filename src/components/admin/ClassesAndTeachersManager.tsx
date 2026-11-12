import React, { useState } from 'react';
import { StorageService } from '../../db/storage';
import { useAuth } from '../../context/AuthContext';
import { ClassGrade, Subject, User, UserRole } from '../../types';
import {
  Layers,
  Plus,
  Trash2,
  Edit,
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  X,
  Save,
  Lock,
  Key,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  UserCheck,
  UserX,
  Clock,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ClassesAndTeachersManager: React.FC = () => {
  const { canAccessAdminSettings, currentRole, switchUser, refreshUsers, currentUser } = useAuth();
  const isAdmin = canAccessAdminSettings();

  const [classes, setClasses] = useState<ClassGrade[]>(() => StorageService.getClasses());
  const [subjects, setSubjects] = useState<Subject[]>(() => StorageService.getSubjects());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'teachers' | 'pending_approvals' | 'master_data'>('classes');

  // Password visibility & quick change
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [quickPassModal, setQuickPassModal] = useState<{ user: User; newPass: string } | null>(null);

  // Database Wipe Modal State
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeAdminEmail, setWipeAdminEmail] = useState('zohaib.aim@gmail.com');
  const [wipeAdminName, setWipeAdminName] = useState('Zohaib (Administrator)');
  const [wipeAdminPassword, setWipeAdminPassword] = useState('Malik@456');

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGrade | null>(null);
  const [classForm, setClassForm] = useState({
    name: '',
    category: 'Regular' as 'Regular' | 'O Level',
    sectionsStr: 'A, B, C, D',
    order: 1,
  });

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [targetClassForSection, setTargetClassForSection] = useState<ClassGrade | null>(null);
  const [newSectionName, setNewSectionName] = useState('');

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
  });

  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    password: '',
    isActive: true,
    phone: '',
    designation: '',
    role: 'class_teacher' as UserRole,
    assignedClass: 'Class IX-A',
    selectedSubjectNames: ['Mathematics'] as string[],
  });

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleApproveApplicant = (applicant: User) => {
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to approve staff.', 'error');
      return;
    }
    const ok = StorageService.approveUser(applicant.id);
    if (ok) {
      setUsers(StorageService.getUsers());
      refreshUsers();
      showNotification(`Account for "${applicant.name}" has been approved! They can now log in with their password.`);
    }
  };

  const handleRejectApplicant = (applicant: User) => {
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to reject staff.', 'error');
      return;
    }
    if (confirm(`Are you sure you want to decline registration request for ${applicant.name}?`)) {
      StorageService.rejectUser(applicant.id);
      setUsers(StorageService.getUsers());
      refreshUsers();
      showNotification(`Registration request for "${applicant.name}" was declined and removed.`, 'error');
    }
  };

  const handleWipeDatabase = () => {
    StorageService.wipeDatabaseToCleanState(wipeAdminName, wipeAdminEmail, wipeAdminPassword);
    setClasses(StorageService.getClasses());
    setSubjects(StorageService.getSubjects());
    setUsers(StorageService.getUsers());
    refreshUsers();
    setIsWipeModalOpen(false);
    showNotification('Database wiped clean! All dummy student portfolios, exam marks, and logs have been cleared. Administrator account configured.', 'success');
  };

  const handleLoadDemoDataset = () => {
    if (confirm('Load demonstration sample dataset? This will populate sample students, marks, and teacher accounts for testing.')) {
      StorageService.loadSampleDemoData();
      setClasses(StorageService.getClasses());
      setSubjects(StorageService.getSubjects());
      setUsers(StorageService.getUsers());
      refreshUsers();
      showNotification('Demonstration dataset loaded successfully.', 'success');
    }
  };

  // -------------------------------------------------------------
  // 1. CLASS CRUD OPERATIONS
  // -------------------------------------------------------------
  const handleOpenAddClass = () => {
    setEditingClass(null);
    setClassForm({
      name: '',
      category: 'Regular',
      sectionsStr: 'A, B, C, D',
      order: classes.length + 1,
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (cls: ClassGrade) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name,
      category: cls.category,
      sectionsStr: cls.sections.join(', '),
      order: cls.order,
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to modify classes.', 'error');
      return;
    }

    const sectionsArray = classForm.sectionsStr
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    if (editingClass) {
      StorageService.updateClass(editingClass.id, {
        name: classForm.name,
        category: classForm.category,
        sections: sectionsArray.length > 0 ? sectionsArray : ['A'],
        order: Number(classForm.order),
      });
      showNotification(`Class "${classForm.name}" updated successfully.`);
    } else {
      StorageService.addClass({
        name: classForm.name,
        category: classForm.category,
        sections: sectionsArray.length > 0 ? sectionsArray : ['A'],
        isActive: true,
        order: Number(classForm.order),
      });
      showNotification(`New Class "${classForm.name}" added to school curriculum.`);
    }

    setClasses(StorageService.getClasses());
    setIsClassModalOpen(false);
  };

  const handleDeleteClass = (cls: ClassGrade) => {
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to remove classes.', 'error');
      return;
    }
    if (confirm(`Are you sure you want to remove ${cls.name}? Students in this class should be reassigned first.`)) {
      StorageService.deleteClass(cls.id);
      setClasses(StorageService.getClasses());
      showNotification(`Class "${cls.name}" was removed.`);
    }
  };

  // -------------------------------------------------------------
  // 2. SECTION ADD / REMOVE
  // -------------------------------------------------------------
  const handleOpenAddSection = (cls: ClassGrade) => {
    setTargetClassForSection(cls);
    setNewSectionName('');
    setIsSectionModalOpen(true);
  };

  const handleConfirmAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !targetClassForSection) return;
    const clean = newSectionName.trim().toUpperCase();
    if (!clean) return;

    const success = StorageService.addSectionToClass(targetClassForSection.id, clean);
    if (success) {
      setClasses(StorageService.getClasses());
      showNotification(`Section ${clean} added to ${targetClassForSection.name}.`);
      setIsSectionModalOpen(false);
    } else {
      showNotification(`Section ${clean} already exists in ${targetClassForSection.name}.`, 'error');
    }
  };

  const handleRemoveSection = (cls: ClassGrade, sec: string) => {
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to remove sections.', 'error');
      return;
    }
    if (cls.sections.length <= 1) {
      showNotification('A class must have at least one active section.', 'error');
      return;
    }
    if (confirm(`Remove Section ${sec} from ${cls.name}?`)) {
      StorageService.removeSectionFromClass(cls.id, sec);
      setClasses(StorageService.getClasses());
      showNotification(`Section ${sec} removed from ${cls.name}.`);
    }
  };

  // -------------------------------------------------------------
  // 3. SUBJECT CRUD OPERATIONS
  // -------------------------------------------------------------
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({ name: '', code: '' });
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (subj: Subject) => {
    setEditingSubject(subj);
    setSubjectForm({ name: subj.name, code: subj.code });
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to manage subjects.', 'error');
      return;
    }

    if (editingSubject) {
      StorageService.updateSubject(editingSubject.id, {
        name: subjectForm.name,
        code: subjectForm.code.toUpperCase(),
      });
      showNotification(`Subject "${subjectForm.name}" updated successfully.`);
    } else {
      StorageService.addSubject({
        name: subjectForm.name,
        code: subjectForm.code.toUpperCase(),
        classIds: classes.map((c) => c.id),
      });
      showNotification(`New Subject "${subjectForm.name}" added to curriculum.`);
    }

    setSubjects(StorageService.getSubjects());
    setIsSubjectModalOpen(false);
  };

  const handleDeleteSubject = (subj: Subject) => {
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to remove subjects.', 'error');
      return;
    }
    if (confirm(`Are you sure you want to delete subject "${subj.name}" (${subj.code})?`)) {
      StorageService.deleteSubject(subj.id);
      setSubjects(StorageService.getSubjects());
      showNotification(`Subject "${subj.name}" has been deleted.`);
    }
  };

  // -------------------------------------------------------------
  // 4. TEACHER / STAFF ACCOUNT CRUD
  // -------------------------------------------------------------
  const toggleSubjectInForm = (subjectName: string) => {
    setTeacherForm((prev) => ({
      ...prev,
      selectedSubjectNames: prev.selectedSubjectNames.includes(subjectName)
        ? prev.selectedSubjectNames.filter((s) => s !== subjectName)
        : [...prev.selectedSubjectNames, subjectName],
    }));
  };

  const handleOpenAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherForm({
      name: '',
      email: '',
      password: 'teacher' + Math.floor(100 + Math.random() * 900),
      isActive: true,
      phone: '',
      designation: '',
      role: 'class_teacher',
      assignedClass: 'Class IX-A',
      selectedSubjectNames: ['Mathematics'],
    });
    setIsTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (u: User) => {
    setEditingTeacher(u);
    const subjectsList =
      u.selectedSubjectNames ||
      (u.assignedSubjects && u.assignedSubjects.length > 0
        ? u.assignedSubjects.map((s) => s.subjectName)
        : ['Mathematics']);

    setTeacherForm({
      name: u.name,
      email: u.email,
      password: u.password || 'teacher123',
      isActive: u.isActive !== false,
      phone: u.phone || '',
      designation: u.designation,
      role: u.role,
      assignedClass: u.assignedClasses?.[0] || 'Class IX-A',
      selectedSubjectNames: subjectsList,
    });
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to manage teacher accounts.', 'error');
      return;
    }

    const assignedClasses = teacherForm.role === 'class_teacher' ? [teacherForm.assignedClass] : undefined;
    const assignedSubjects =
      teacherForm.role === 'subject_teacher'
        ? teacherForm.selectedSubjectNames.map((s) => ({
            classId: 'c9',
            sectionId: 'A',
            subjectName: s,
          }))
        : undefined;

    if (editingTeacher) {
      StorageService.updateUser(editingTeacher.id, {
        name: teacherForm.name,
        email: teacherForm.email,
        phone: teacherForm.phone,
        designation: teacherForm.designation,
        role: teacherForm.role,
        isActive: teacherForm.isActive,
        password: teacherForm.password.trim() || editingTeacher.password || 'teacher123',
        assignedClasses,
        assignedSubjects,
        selectedSubjectNames: teacherForm.role === 'subject_teacher' ? teacherForm.selectedSubjectNames : undefined,
      });
      showNotification(`Staff account "${teacherForm.name}" updated with credentials.`);
    } else {
      StorageService.addUser({
        name: teacherForm.name,
        email: teacherForm.email,
        phone: teacherForm.phone,
        designation: teacherForm.designation,
        role: teacherForm.role,
        isActive: teacherForm.isActive,
        password: teacherForm.password.trim() || 'teacher123',
        assignedClasses,
        assignedSubjects,
        selectedSubjectNames: teacherForm.role === 'subject_teacher' ? teacherForm.selectedSubjectNames : undefined,
      });
      showNotification(`New staff account created for "${teacherForm.name}". Password set.`);
    }

    setUsers(StorageService.getUsers());
    refreshUsers();
    setIsTeacherModalOpen(false);
  };

  const handleQuickPasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !quickPassModal) return;
    const newPass = quickPassModal.newPass.trim();
    if (!newPass) {
      showNotification('Password cannot be empty.', 'error');
      return;
    }
    StorageService.updateUserPassword(quickPassModal.user.id, newPass);
    setUsers(StorageService.getUsers());
    refreshUsers();
    setQuickPassModal(null);
    showNotification(`Password for ${quickPassModal.user.name} successfully updated to: ${newPass}`);
  };

  const handleDeleteTeacher = (u: User) => {
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to remove staff accounts.', 'error');
      return;
    }
    if (u.role === 'admin' && users.filter((x) => x.role === 'admin').length <= 1) {
      showNotification('Cannot remove the primary Administrator account.', 'error');
      return;
    }
    if (confirm(`Are you sure you want to delete account for ${u.name}?`)) {
      StorageService.deleteUser(u.id);
      setUsers(StorageService.getUsers());
      refreshUsers();
      showNotification(`Staff account for ${u.name} removed.`);
    }
  };

  // -------------------------------------------------------------
  // 5. MASTER DATA IMPORT & EXPORT (ADMIN)
  // -------------------------------------------------------------
  const handleMasterExportJSON = () => {
    StorageService.downloadDatabaseBackupFile();
    showNotification('Master database backup downloaded successfully (.json).');
  };

  const handleMasterExportExcel = () => {
    const studentsData = StorageService.getStudents();
    const attendanceData = StorageService.getAttendance();
    const marksData = StorageService.getMarks();
    const complaintsData = StorageService.getComplaints();
    const meetingsData = StorageService.getParentMeetings();

    const wb = XLSX.utils.book_new();

    // Sheet 1: Students
    const wsStudents = XLSX.utils.json_to_sheet(
      studentsData.map((s) => ({
        AdmissionNo: s.admissionNo,
        RollNo: s.rollNo,
        Name: s.name,
        FatherName: s.fatherName,
        Class: s.className,
        Section: s.sectionName,
        DOB: s.dob,
        Gender: s.gender,
        Contact: s.parentContact,
        Address: s.address,
        Status: s.status,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Students');

    // Sheet 2: Classes & Sections
    const wsClasses = XLSX.utils.json_to_sheet(
      classes.map((c) => ({
        ClassID: c.id,
        Name: c.name,
        Category: c.category,
        Sections: c.sections.join(', '),
        Order: c.order,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsClasses, 'Classes');

    // Sheet 3: Subjects
    const wsSubjects = XLSX.utils.json_to_sheet(
      subjects.map((sub) => ({
        SubjectID: sub.id,
        Name: sub.name,
        Code: sub.code,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsSubjects, 'Subjects');

    // Sheet 4: Teachers
    const wsTeachers = XLSX.utils.json_to_sheet(
      users.map((u) => ({
        Name: u.name,
        Email: u.email,
        Phone: u.phone,
        Designation: u.designation,
        Role: u.role,
        AssignedClasses: u.assignedClasses?.join(', ') || 'None',
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsTeachers, 'Staff_Teachers');

    // Sheet 5: Marks
    const wsMarks = XLSX.utils.json_to_sheet(
      marksData.map((m) => ({
        StudentName: m.studentName,
        RollNo: m.rollNo,
        Subject: m.subjectName,
        Obtained: m.obtainedMarks,
        Total: m.totalMarks,
        Percentage: m.percentage,
        Grade: m.grade,
        Date: m.date,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsMarks, 'Examination_Marks');

    // Sheet 6: Attendance
    const wsAttendance = XLSX.utils.json_to_sheet(
      attendanceData.map((a) => ({
        Date: a.date,
        RollNo: a.rollNo,
        StudentName: a.studentName,
        Status: a.status,
        ArrivalTime: a.arrivalTime,
        Reason: a.reason,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsAttendance, 'Daily_Attendance');

    // Sheet 7: Complaints
    const wsComplaints = XLSX.utils.json_to_sheet(
      complaintsData.map((c) => ({
        Date: c.date,
        RollNo: c.rollNo,
        StudentName: c.studentName,
        Category: c.category,
        Description: c.description,
        Status: c.status,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsComplaints, 'Discipline_Complaints');

    // Sheet 8: Parent Meetings
    const wsMeetings = XLSX.utils.json_to_sheet(
      meetingsData.map((pm) => ({
        Date: pm.meetingDate,
        RollNo: pm.rollNo,
        StudentName: pm.studentName,
        ParentName: pm.parentName,
        Reason: pm.meetingReason,
        ActionPlan: pm.agreedActionPlan,
        Status: pm.meetingStatus,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsMeetings, 'Parent_Meetings');

    XLSX.writeFile(wb, `GIFS_Complete_School_Workbook_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Master Multi-Sheet Excel workbook exported successfully!');
  };

  const handleMasterImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      showNotification('Access Denied: Only Administrator has rights to import master data.', 'error');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = StorageService.importDatabaseJSON(content);
      if (res.success) {
        setClasses(StorageService.getClasses());
        setSubjects(StorageService.getSubjects());
        setUsers(StorageService.getUsers());
        showNotification(
          `Master restore successful! Restored ${res.counts?.students || 0} students, ${res.counts?.classes || 0} classes, ${res.counts?.marks || 0} marks.`
        );
      } else {
        showNotification(res.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Superuser Rights Notice */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold">
                Administrator Master Control Panel
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500 text-white tracking-wider">
                Full Rights & Overrides
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5">
              Add and remove classes, sections, subjects, and class teachers • Master data import & export across all modules
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Current Role:</span>
          <span
            className={`px-2.5 py-1 rounded-full font-bold uppercase text-[11px] ${
              isAdmin
                ? 'bg-purple-600 text-white border border-purple-400'
                : 'bg-amber-500 text-slate-950 font-bold'
            }`}
          >
            {currentRole.replace('_', ' ')}
          </span>
          {!isAdmin && (
            <span className="text-amber-300 text-[11px] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> (Read-Only)
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Sub-tab calculations */}
      {(() => null)()}

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'classes'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Manage Classes & Sections ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'subjects'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Manage Subjects ({subjects.length})
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'teachers'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Staff & Teachers ({users.filter((u) => u.isApproved !== false).length})
          </button>
          <button
            onClick={() => setActiveTab('pending_approvals')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'pending_approvals'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approvals</span>
            {users.filter((u) => u.isApproved === false).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                {users.filter((u) => u.isApproved === false).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('master_data')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'master_data'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Master Data Import / Export</span>
          </button>
        </div>

        {/* Action Button for current tab */}
        {isAdmin && activeTab === 'classes' && (
          <button
            onClick={handleOpenAddClass}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Class</span>
          </button>
        )}

        {isAdmin && activeTab === 'subjects' && (
          <button
            onClick={handleOpenAddSubject}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Subject</span>
          </button>
        )}

        {isAdmin && activeTab === 'teachers' && (
          <button
            onClick={handleOpenAddTeacher}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Teacher Account</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CLASSES & SECTIONS (ADD / REMOVE CLASSES & SECTIONS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3.5 text-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base text-slate-900">{cls.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cls.category === 'O Level'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {cls.category}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditClass(cls)}
                        title="Edit Class"
                        className="p-1 text-slate-400 hover:text-emerald-700 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls)}
                        title="Delete Class (Admin)"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Sections list with Add/Remove buttons */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      Active Sections ({cls.sections.length})
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleOpenAddSection(cls)}
                        className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add Section
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {cls.sections.map((sec) => (
                      <div
                        key={sec}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs"
                      >
                        <span>Section {sec}</span>
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveSection(cls, sec)}
                            title={`Remove Section ${sec}`}
                            className="text-slate-400 hover:text-rose-600 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Display Order: #{cls.order}</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active Curriculum
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: SUBJECTS (ADD / EDIT / REMOVE SUBJECTS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Curriculum Subjects Roster ({subjects.length} Subjects)
            </span>
            <span className="text-slate-500">
              {isAdmin ? 'Admin can add or remove subjects freely' : 'Read-only access'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Subject Name</th>
                  <th className="py-2.5 px-3">Subject Code</th>
                  <th className="py-2.5 px-3">Applicable Classes</th>
                  <th className="py-2.5 px-3">Status</th>
                  {isAdmin && <th className="py-2.5 px-4 text-right">Admin Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{sub.name}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">{sub.code}</td>
                    <td className="py-3 px-3 text-slate-600">All Regular & O Level Grades</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenEditSubject(sub)}
                            className="p-1 text-slate-500 hover:text-emerald-700 rounded"
                            title="Edit Subject"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(sub)}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: TEACHERS (APPROVED STAFF & CLASS/SUBJECT TEACHERS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'teachers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users
            .filter((u) => u.isApproved !== false)
            .map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3.5 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900">{u.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'principal'
                                ? 'bg-indigo-100 text-indigo-800'
                                : u.role === 'class_teacher'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              u.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {u.isActive !== false ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditTeacher(u)}
                          title="Edit Teacher Account & Permissions"
                          className="p-1 text-slate-400 hover:text-emerald-700 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(u)}
                          title="Delete Teacher Account"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-slate-600 pt-2.5">
                    <div>
                      <span className="text-slate-400">Designation:</span> <strong>{u.designation}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span> <strong className="font-mono text-slate-900">{u.email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone:</span> <strong className="font-mono">{u.phone || 'N/A'}</strong>
                    </div>

                    {/* Password / Login Credentials Box for Admin */}
                    {isAdmin && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Key className="w-3 h-3 text-amber-600" />
                            <span>Login Password:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuickPassModal({ user: u, newPass: u.password || 'teacher123' })}
                            className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                          >
                            Change
                          </button>
                        </div>

                        <div className="flex items-center justify-between font-mono bg-white px-2 py-1 rounded border border-slate-200">
                          <span className="text-xs font-bold text-slate-800">
                            {revealedPasswords[u.id] ? u.password || 'teacher123' : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPasswords((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                            }
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                            title={revealedPasswords[u.id] ? 'Hide Password' : 'Show Password'}
                          >
                            {revealedPasswords[u.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {u.assignedClasses && u.assignedClasses.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Class Teacher Assignment:
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                          {u.assignedClasses.join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Multiple Teaching Subjects Display */}
                    {((u.selectedSubjectNames && u.selectedSubjectNames.length > 0) ||
                      (u.assignedSubjects && u.assignedSubjects.length > 0)) && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Teaching Subjects ({u.selectedSubjectNames?.length || u.assignedSubjects?.length || 0}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(
                            u.selectedSubjectNames ||
                            u.assignedSubjects?.map((as) => as.subjectName) ||
                            []
                          ).map((name, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200 flex items-center gap-1"
                            >
                              <BookOpen className="w-2.5 h-2.5 text-blue-600" />
                              <span>{name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: PENDING APPROVALS (SELF-REGISTRATION REQUESTS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'pending_approvals' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Staff Registration Requests Awaiting Verification
                </h3>
                <p className="text-xs text-amber-800">
                  This verification is only required once during initial staff registration. Once approved and activated, the teacher can log in permanently with their registered Email and Password.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-200 text-amber-900 font-bold text-xs rounded-full self-start sm:self-auto">
              {users.filter((u) => u.isApproved === false).length} Pending Requests
            </span>
          </div>

          {users.filter((u) => u.isApproved === false).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">All Registration Requests Cleared</p>
              <p className="text-xs text-slate-500">
                There are currently no new teacher or staff registration requests pending approval.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users
                .filter((u) => u.isApproved === false)
                .map((applicant) => (
                  <div
                    key={applicant.id}
                    className="bg-white rounded-2xl border-2 border-amber-300 shadow-md p-5 space-y-3.5 text-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm uppercase">
                            {applicant.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900">{applicant.name}</h4>
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Requested: {applicant.role.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          Awaiting Approval
                        </span>
                      </div>

                      <div className="space-y-1.5 text-slate-600 pt-2.5">
                        <div>
                          <span className="text-slate-400">Designation:</span> <strong>{applicant.designation}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Email:</span> <strong className="font-mono text-slate-900">{applicant.email}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Phone:</span> <strong className="font-mono">{applicant.phone || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Password Chosen:</span> <strong className="font-mono text-slate-800">{applicant.password || '••••••'}</strong>
                        </div>

                        {applicant.assignedClasses && applicant.assignedClasses.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                              Requested Class:
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                              {applicant.assignedClasses.join(', ')}
                            </span>
                          </div>
                        )}

                        {((applicant.selectedSubjectNames && applicant.selectedSubjectNames.length > 0) ||
                          (applicant.assignedSubjects && applicant.assignedSubjects.length > 0)) && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Requested Subjects ({applicant.selectedSubjectNames?.length || applicant.assignedSubjects?.length || 0}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {(
                                applicant.selectedSubjectNames ||
                                applicant.assignedSubjects?.map((as) => as.subjectName) ||
                                []
                              ).map((name, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200 flex items-center gap-1"
                                >
                                  <BookOpen className="w-2.5 h-2.5 text-blue-600" />
                                  <span>{name}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveApplicant(applicant)}
                        className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Approve & Activate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectApplicant(applicant)}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        title="Decline registration request"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: MASTER DATA IMPORT / EXPORT (ADMIN POWER TOOLS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'master_data' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <span>Full School Master Data Export (Multi-Format)</span>
            </h3>
            <p className="text-xs text-slate-600">
              Download complete database backups covering students, classes, subjects, teacher assignments, daily attendance, examination marks, complaints, and parent conferences.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                  <span>Master Excel (.xlsx)</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Export complete structured tables: Students, Classes, Staff, Attendance, Marks, and Complaints.
                </p>
                <button
                  onClick={handleMasterExportExcel}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
                  <FileJson className="w-5 h-5 text-indigo-700" />
                  <span>Database Backup (.json)</span>
                </div>
                <p className="text-xs text-indigo-800">
                  Export complete JSON snapshot containing all 16 tables, settings, and alerts for offline backup.
                </p>
                <button
                  onClick={handleMasterExportJSON}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/40 space-y-3">
                <div className="flex items-center space-x-2 text-purple-900 font-bold text-sm">
                  <Download className="w-5 h-5 text-purple-700" />
                  <span>Full Source Code (.zip)</span>
                </div>
                <p className="text-xs text-purple-800">
                  Download entire software code (React, TypeScript, Database, Styles) ready to upload to GitHub.
                </p>
                <a
                  href="/green_island_portal_source_code.zip"
                  download="green_island_portal_source_code.zip"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Project ZIP</span>
                </a>
              </div>
            </div>
          </div>

          {/* Master Restore (Admin Only) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              <span>Restore Database from Backup (Admin Restricted)</span>
            </h3>
            <p className="text-xs text-slate-600">
              Restore the entire Green Island Foundation School database from a previously exported JSON backup file.
            </p>

            <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center space-y-3">
              <label className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload Database Backup (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleMasterImportJSON}
                  disabled={!isAdmin}
                  className="hidden"
                />
              </label>
              {!isAdmin && (
                <p className="text-xs text-rose-600 font-bold">
                  (Restricted to Administrator account)
                </p>
              )}
            </div>
          </div>

          {/* Clean Slate & Reset (Production Blank Mode) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span>Blank Database Reset & Production Mode</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Clear all pre-filled dummy students, attendance logs, marks, and complaints to run a 100% fresh, blank school database. You can customize your primary administrator name, email, and password.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsWipeModalOpen(true)}
                disabled={!isAdmin}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Wipe to 100% Blank Database</span>
              </button>

              <button
                type="button"
                onClick={handleLoadDemoDataset}
                disabled={!isAdmin}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Load Sample Demonstration Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT CLASS */}
      {/* ------------------------------------------------------------- */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingClass ? `Edit Class: ${editingClass.name}` : 'Add New Class to Curriculum'}
              </h3>
              <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class XI, O Level 3, Nursery..."
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Category *</label>
                <select
                  value={classForm.category}
                  onChange={(e) => setClassForm({ ...classForm, category: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="Regular">Regular Matric / Secondary</option>
                  <option value="O Level">Cambridge O Level</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Sections (Comma-Separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A, B, C, D"
                  value={classForm.sectionsStr}
                  onChange={(e) => setClassForm({ ...classForm, sectionsStr: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Display Sort Order</label>
                <input
                  type="number"
                  value={classForm.order}
                  onChange={(e) => setClassForm({ ...classForm, order: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ADD SECTION TO SPECIFIC CLASS */}
      {/* ------------------------------------------------------------- */}
      {isSectionModalOpen && targetClassForSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Add Section to {targetClassForSection.name}
              </h3>
              <button onClick={() => setIsSectionModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAddSection} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Section Identifier *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. E, F, Rose, Red..."
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold uppercase"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: ADD / EDIT SUBJECT */}
      {/* ------------------------------------------------------------- */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingSubject ? `Edit Subject: ${editingSubject.name}` : 'Add New Curriculum Subject'}
              </h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Subject Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Environmental Management, Art & Design..."
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ENV, ART, ECO..."
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: ADD / EDIT TEACHER / STAFF ACCOUNT */}
      {/* ------------------------------------------------------------- */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingTeacher ? `Edit Staff Account: ${editingTeacher.name}` : 'Register New Teacher / Staff Account'}
              </h3>
              <button onClick={() => setIsTeacherModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Teacher Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mrs. Saima Qureshi"
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@greenisland.edu.pk"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="0300-1234567"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="Senior Science Teacher"
                    value={teacherForm.designation}
                    onChange={(e) => setTeacherForm({ ...teacherForm, designation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Security Role *</label>
                <select
                  value={teacherForm.role}
                  onChange={(e) => setTeacherForm({ ...teacherForm, role: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                >
                  <option value="class_teacher">Class Teacher (Assigned Class Access)</option>
                  <option value="subject_teacher">Subject Teacher (Subject-Wise Access Only)</option>
                  <option value="principal">Principal (School-Wide Monitoring)</option>
                  <option value="admin">Administrator (Full System Control)</option>
                  <option value="general_user">General User (Read-Only Auditor)</option>
                </select>
              </div>

              {teacherForm.role === 'class_teacher' && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Assigned Class & Section *</label>
                  <select
                    value={teacherForm.assignedClass}
                    onChange={(e) => setTeacherForm({ ...teacherForm, assignedClass: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-emerald-800"
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

              {teacherForm.role === 'subject_teacher' && (
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-blue-950 font-bold text-xs flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                      <span>Assigned Teaching Subjects (Multiple Allowed) *</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                      {teacherForm.selectedSubjectNames.length} Selected
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-800">
                    Click subjects to select or unselect. Multiple subjects can be assigned to one teacher:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-blue-200">
                    {subjects.map((s) => {
                      const isSelected = teacherForm.selectedSubjectNames.includes(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSubjectInForm(s.name)}
                          className={`flex items-center justify-between p-1.5 rounded text-left text-[11px] font-semibold transition-all border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Login Password assigned by Admin */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-amber-950 font-bold flex items-center gap-1.5 text-xs">
                    <Key className="w-3.5 h-3.5 text-amber-700" />
                    <span>Login Password (Admin Decided) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTeacherForm({
                        ...teacherForm,
                        password: 'gifs' + Math.floor(1000 + Math.random() * 9000),
                      })
                    }
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter login password"
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                  className="w-full p-2 border border-amber-300 rounded-lg font-mono font-bold bg-white text-slate-900"
                />
                <p className="text-[10px] text-amber-800">
                  This user will log in with their email and this password. Only the Admin can set or reset passwords.
                </p>
              </div>

              {/* Active Account Status */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="userIsActive"
                  checked={teacherForm.isActive}
                  onChange={(e) => setTeacherForm({ ...teacherForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="userIsActive" className="text-slate-700 font-semibold select-none">
                  Account Active (Allow user to log in)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: QUICK PASSWORD CHANGE FOR TEACHER (ADMIN ONLY) */}
      {/* ------------------------------------------------------------- */}
      {quickPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Change Password</h3>
              </div>
              <button onClick={() => setQuickPassModal(null)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickPasswordSave} className="space-y-3">
              <div>
                <p className="text-slate-600">
                  Setting new password for: <strong>{quickPassModal.user.name}</strong> ({quickPassModal.user.email})
                </p>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">New Password *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickPassModal.newPass}
                  onChange={(e) => setQuickPassModal({ ...quickPassModal, newPass: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPassModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: WIPE DATABASE TO 100% BLANK CLEAN STATE */}
      {/* ------------------------------------------------------------- */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-700">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Reset to Blank Database</h3>
              </div>
              <button onClick={() => setIsWipeModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Confirm Database Wipe</span>
              </p>
              <p className="text-[11px]">
                This will delete all sample students, attendance registers, exam marks, complaints, and parent meetings. Your classes and curriculum will be kept intact.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleWipeDatabase();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Primary Administrator Name *</label>
                <input
                  type="text"
                  required
                  value={wipeAdminName}
                  onChange={(e) => setWipeAdminName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Administrator Login Email *</label>
                <input
                  type="email"
                  required
                  value={wipeAdminEmail}
                  onChange={(e) => setWipeAdminEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Administrator Password *</label>
                <input
                  type="text"
                  required
                  value={wipeAdminPassword}
                  onChange={(e) => setWipeAdminPassword(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWipeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Wipe & Start Fresh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
