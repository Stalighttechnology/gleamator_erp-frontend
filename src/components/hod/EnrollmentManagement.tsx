import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { SkeletonCard } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { manageStudents, getElectiveEnrollmentBootstrap, enrollStaff } from "../../utils/hod_api";
import { useHODBootstrap } from "../../context/HODBootstrapContext";
import { useTheme } from "../../context/ThemeContext";
import { API_ENDPOINT } from "../../utils/config";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { Loader2, UserPlus, GraduationCap, Users, BookOpen } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

const EnrollmentManagement = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  useHODBootstrap();
  
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [semesters, setSemesters] = useState<any[]>([]);
    const [batchId, setBatchId] = useState<string>("");
  const [sections, setSections] = useState<any[]>([]);
  const [sectionId, setSectionId] = useState<string>("");
  const [subjectType, setSubjectType] = useState<string>("");
  const [electiveSubjects, setElectiveSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [showEnrolledOnly, setShowEnrolledOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultData, setResultData] = useState<{ added: number; removed: number; failed: any[] }>({ added: 0, removed: 0, failed: [] });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  const [electivePage, setElectivePage] = useState(1);
  const [electiveTotalPages, setElectiveTotalPages] = useState(1);
  const [electiveLoading, setElectiveLoading] = useState(false);

  const [studentForm, setStudentForm] = useState({
    usn: "",
    name: "",
    email: "",
    phone: "",
    semester_id: "",
    section_id: "",
    batch_id: ""
  });
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    designation: ""
  });
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const boot = await getElectiveEnrollmentBootstrap();
        if (boot.success && boot.data) {
          const bId = boot.data.profile?.branch_id;
          if (bId) setBranchId(String(bId));
          if (Array.isArray(boot.data.semesters)) {
            setSemesters(boot.data.semesters.map((s: any) => ({ id: String(s.id), number: s.number })));
          }
          if (Array.isArray(boot.data.sections)) {
            setSections(boot.data.sections.map((sec: any) => ({ ...sec, id: String(sec.id) })));
          }
          if (Array.isArray(boot.data.batches)) {
            setBatches(boot.data.batches.map((b: any) => ({ id: String(b.id), name: b.name })));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadBootstrap();
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!subjectType || selectedRole !== 'student') return;
      setElectiveLoading(true);
      try {
        const params = new URLSearchParams({
          subject_type: subjectType,
          page: electivePage.toString(),
          page_size: '20'
        });

        const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/elective-enrollment-bootstrap/?${params}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();
        if (data.success && data.data) {
          const newSubjects = (data.data.elective_subjects || []).map((s: any) => ({ ...s, id: String(s.id) }));
          if (electivePage === 1) {
            setElectiveSubjects(newSubjects);
          } else {
            setElectiveSubjects(prev => [...prev, ...newSubjects]);
          }
          setElectiveTotalPages(data.data.elective_pagination?.num_pages || 1);
        }
      } catch (e) {
        console.error('Error loading elective subjects:', e);
      }
      setElectiveLoading(false);
    };
    loadSubjects();
  }, [subjectType, electivePage, selectedRole]);

  const loadStudents = async (page = 1, search?: string) => {
    if (!branchId || !selectedSubjectId || selectedRole !== "student") return;
    
    const selSub = subjects.find((s: any) => String(s.id) === String(selectedSubjectId));
    const selType = selSub ? (selSub.subject_type || selSub.subjectType || '') : '';

    if (selType !== 'open_elective' && (!batchId || !sectionId)) return;
    if (selType === 'open_elective' && !batchId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        branch_id: branchId,
        subject_id: selectedSubjectId,
        include_enrollment_status: 'true',
        page: page.toString(),
        page_size: '50'
      });
      if (search && String(search).trim().length > 0) params.set('search', String(search).trim());
      if (batchId) params.set('batch_id', batchId);
      if (sectionId) params.set('section_id', sectionId);

      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/hod/students/?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!data.results) throw new Error(data.message || "Failed to fetch students");

      const mapped = data.results.map((s: any) => ({
        id: s.usn || s.student_id || s.id,
        usn: s.usn || s.student_id || s.id,
        name: s.name,
        checked: s.is_enrolled || false,
        originallyEnrolled: s.is_enrolled || false,
      }));

      setStudents(mapped);
      setCurrentPage(page);
      setTotalPages(Math.ceil(data.count / 50));
      setTotalStudents(data.count);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (branchId && selectedSubjectId && selectedRole === "student") {
      loadStudents(1);
    }
  }, [branchId, selectedSubjectId, batchId, sectionId, selectedRole]);

  const toggleStudent = (id: string) => {
    setStudents((prev) => prev.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p)));
  };

  const saveStudentEnrollment = async () => {
    if (students.length === 0) return;
    setSaving(true);
    try {
      const toRegister = students.filter(s => s.checked && !s.originallyEnrolled).map(s => s.usn);
      const toUnregister = students.filter(s => !s.checked && s.originallyEnrolled).map(s => s.usn);

      let registeredCount = 0;
      let removedCount = 0;
      let failed: any[] = [];

      if (toRegister.length > 0) {
        const res = await manageStudents({ action: "bulk_register_subjects", branch_id: branchId, subject_id: selectedSubjectId, student_ids: toRegister }, "POST");
        if (res?.success) {
          const resData: any = res.data;
          registeredCount = resData?.registered_count ?? resData?.registered?.length ?? toRegister.length;
          failed = failed.concat(resData?.failed || []);
        }
      }

      if (toUnregister.length > 0) {
        const res2 = await manageStudents({ action: "bulk_unregister_subjects", branch_id: branchId, subject_id: selectedSubjectId, student_ids: toUnregister }, "POST");
        if (res2?.success) {
          const res2Data: any = res2.data;
          removedCount = res2Data?.removed_count ?? res2Data?.removed?.length ?? toUnregister.length;
          failed = failed.concat(res2Data?.failed || []);
        }
      }

      setResultData({ added: registeredCount, removed: removedCount, failed });
      setResultModalOpen(true);
      
      setStudents((prev) => prev.map(student => {
        if (toRegister.includes(student.usn)) return { ...student, checked: true, originallyEnrolled: true };
        if (toUnregister.includes(student.usn)) return { ...student, checked: false, originallyEnrolled: false };
        return student;
      }));
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.email || !staffForm.first_name || !selectedRole) return;
    
    setIsCreatingStaff(true);
    try {
      const res = await enrollStaff({
        ...staffForm,
        role: selectedRole as "teacher" | "mis"
      });
      
      if (res.success) {
        toast({
          title: "Success",
          description: `${selectedRole === 'teacher' ? 'Faculty' : 'MIS'} created successfully.`,
        });
        setStaffForm({ email: "", first_name: "", last_name: "", phone: "", designation: "" });
      } else {
        toast({
          title: "Error",
          description: res.message || "Failed to create staff account.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
    setIsCreatingStaff(false);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.usn || !studentForm.name || !studentForm.section_id || !studentForm.batch_id) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setIsCreatingStudent(true);
    try {
      const payload = {
        ...studentForm,
        branch_id: branchId,
        action: "create"
      };
      const res = await manageStudents(payload as any, "POST");

      if (res.success) {
        toast({ title: "Success", description: "Student created successfully." });
        setStudentForm({
          usn: "", name: "", email: "", phone: "",
          section_id: "", batch_id: ""
        });
        setShowCreationForm(false);
        if (selectedSubjectId) loadStudents(1);
      } else {
        toast({ title: "Error", description: res.message || "Failed to create student.", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
    setIsCreatingStudent(false);
  };

  useEffect(() => {
    setSubjects(electiveSubjects);
  }, [electiveSubjects]);

  const resetFilters = () => {
    setBatchId("");
    setSectionId("");
    setSubjectType("");
    setSelectedSubjectId("");
    setStudents([]);
    setElectivePage(1);
    setElectiveTotalPages(1);
  };

  return (
    <div className="w-full mx-auto max-w-none space-y-6">
      <Card className="shadow-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">User Enrollment & Role Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Consolidated portal for staff creation and student subject enrollment</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`grid grid-cols-1 ${selectedRole === 'student' ? 'md:grid-cols-1 max-w-xs' : 'md:grid-cols-3'} gap-4 p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300`}>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Select Role</Label>
              <Select value={selectedRole} onValueChange={(v) => { setSelectedRole(v); resetFilters(); }}>
                <SelectTrigger className="w-full border-primary/20 focus:ring-primary/30">
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Faculty</SelectItem>
                  <SelectItem value="mis">MIS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole !== 'student' && selectedRole !== '' && (
              <>
                {/* These are placeholders for when Faculty/MIS are selected, if needed. 
                    Currently they don't use these filters in the global header for those roles. */}
              </>
            )}
          </div>

          {!selectedRole ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
              <div className="max-w-md">
                <h3 className="text-xl font-semibold">Ready to begin?</h3>
                <p className="text-muted-foreground mt-2">Please select a role from the dropdown above to manage enrollments or create new accounts.</p>
              </div>
            </div>
          ) : selectedRole === 'student' ? (
            <div className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">New Student Enrollment</h3>
                </div>
                
                <Card className="border-primary/20 bg-primary/5 shadow-inner">
                  <CardContent className="pt-6">
                    <form onSubmit={handleCreateStudent} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">USN *</Label>
                          <Input 
                            placeholder="1AM22CI001" 
                            required 
                            value={studentForm.usn} 
                            onChange={e => setStudentForm({...studentForm, usn: e.target.value})} 
                            className="bg-white dark:bg-gray-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Student Name *</Label>
                          <Input 
                            placeholder="Full Name" 
                            required 
                            value={studentForm.name} 
                            onChange={e => setStudentForm({...studentForm, name: e.target.value})} 
                            className="bg-white dark:bg-gray-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Email</Label>
                          <Input 
                            type="email" 
                            placeholder="email@example.com" 
                            value={studentForm.email} 
                            onChange={e => setStudentForm({...studentForm, email: e.target.value})} 
                            className="bg-white dark:bg-gray-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Phone No</Label>
                          <Input 
                            placeholder="9876543210" 
                            value={studentForm.phone} 
                            onChange={e => setStudentForm({...studentForm, phone: e.target.value})} 
                            className="bg-white dark:bg-gray-800"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Batch *</Label>
                          <Select value={studentForm.batch_id} onValueChange={v => setStudentForm({...studentForm, batch_id: v, section_id: ""})}>
                            <SelectTrigger className="bg-white dark:bg-gray-800">
                              <SelectValue placeholder="Select batch" />
                            </SelectTrigger>
                            <SelectContent>
                              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Section *</Label>
                          <Select value={studentForm.section_id} onValueChange={v => setStudentForm({...studentForm, section_id: v})}>
                            <SelectTrigger className="bg-white dark:bg-gray-800">
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                            <SelectContent>
                              {sections
                                .filter(s => !studentForm.batch_id || String(s.batch_id) === String(studentForm.batch_id))
                                .map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                              }
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isCreatingStudent} className="bg-primary text-white px-10 shadow-lg hover:shadow-primary/20 transition-all">
                          {isCreatingStudent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                          Register & Enroll
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Subject Enrollment</h3>
                </div>

              <hr className="border-gray-100 dark:border-gray-800" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Filter Batch</Label>
                    <Select value={batchId} onValueChange={(v) => { setBatchId(v); setSectionId(""); }}>
                      <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch: any) => (
                          <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Filter Section</Label>
                    <Select value={sectionId} onValueChange={setSectionId} disabled={!batchId}>
                      <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections
                          .filter((sec: any) => !batchId || String(sec.batch_id) === String(batchId))
                          .map((sec: any) => (
                            <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Subject Type</Label>
                    <Select value={subjectType} onValueChange={setSubjectType} disabled={!sectionId}>
                      <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Subject type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="elective">Elective</SelectItem>
                        <SelectItem value="open_elective">Open Elective</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Select Subject</Label>
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!subjectType}>
                      <SelectTrigger className="w-full bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 rounded-xl border ${theme === 'dark' ? 'bg-muted/50 border-border' : 'bg-gray-50 border-gray-100 shadow-sm'}`}>
                  <div className="flex-1">
                    <Input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by USN or name" className="w-full bg-white dark:bg-gray-800" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Button onClick={() => loadStudents(1, searchTerm)} disabled={!selectedSubjectId || isLoading} className="w-full sm:w-auto px-6 bg-primary hover:bg-primary/90 text-white">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search Students"}
                    </Button>
                    <Button onClick={saveStudentEnrollment} disabled={saving || students.length === 0} className="w-full sm:w-auto px-6 bg-green-600 hover:bg-green-700 text-white shadow-md transition-all">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Enrollment"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 ml-auto border-l pl-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Selected:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {students.filter(s => s.checked).length}
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={showEnrolledOnly} onCheckedChange={(v:any) => setShowEnrolledOnly(!!v)} />
                      <span className="text-sm font-medium">Show enrolled only</span>
                    </label>
                  </div>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : (
                  <div className={showEnrolledOnly ? "" : "grid grid-cols-1 sm:grid-cols-2 gap-6"}>
                    <Card className="border-dashed">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Enrolled Students
                          </h4>
                          <span className="text-xs text-muted-foreground">{students.filter(s => s.checked).length} Total</span>
                        </div>
                      </CardHeader>
                      <CardContent className="max-h-[400px] overflow-y-auto space-y-1">
                        {students.filter(s => s.checked).map((s) => (
                          <div key={s.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md group">
                            <Checkbox checked={s.checked} onCheckedChange={() => toggleStudent(s.id)} />
                            <div className="text-sm">
                              <span className="font-mono font-bold text-primary">{s.usn}</span>
                              <span className="mx-2 text-gray-300">|</span>
                              <span>{s.name}</span>
                            </div>
                          </div>
                        ))}
                        {students.filter(s => s.checked).length === 0 && <p className="text-center py-10 text-muted-foreground">No students enrolled yet</p>}
                      </CardContent>
                    </Card>

                    {!showEnrolledOnly && (
                      <Card className="border-dashed">
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-gray-400" />
                              Available Students
                            </h4>
                            <span className="text-xs text-muted-foreground">{students.filter(s => !s.checked).length} Total</span>
                          </div>
                        </CardHeader>
                        <CardContent className="max-h-[400px] overflow-y-auto space-y-1">
                          {students.filter(s => !s.checked).map((s) => (
                            <div key={s.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md group">
                              <Checkbox checked={s.checked} onCheckedChange={() => toggleStudent(s.id)} />
                              <div className="text-sm">
                                <span className="font-mono font-bold">{s.usn}</span>
                                <span className="mx-2 text-gray-300">|</span>
                                <span>{s.name}</span>
                              </div>
                            </div>
                          ))}
                          {students.filter(s => !s.checked).length === 0 && <p className="text-center py-10 text-muted-foreground">All students are enrolled</p>}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
          </div>
        ) : (
            <div className="max-w-2xl mx-auto">
              <Card className="border-primary/10 shadow-md bg-white dark:bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" />
                    Enroll New {selectedRole === 'teacher' ? 'Faculty' : 'MIS Staff'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateStaff} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input id="first_name" placeholder="John" required value={staffForm.first_name} onChange={e => setStaffForm({...staffForm, first_name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input id="last_name" placeholder="Doe" value={staffForm.last_name} onChange={e => setStaffForm({...staffForm, last_name: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" type="email" placeholder="john.doe@example.com" required value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" placeholder="+91 9876543210" value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input id="designation" placeholder={selectedRole === 'teacher' ? 'Asst. Professor' : 'Administrative Officer'} value={staffForm.designation} onChange={e => setStaffForm({...staffForm, designation: e.target.value})} />
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6" disabled={isCreatingStaff}>
                        {isCreatingStaff ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Creating Account...</>
                        ) : (
                          <><UserPlus className="mr-2 h-5 w-5" />Enroll {selectedRole === 'teacher' ? 'Faculty' : 'MIS Staff'}</>
                        )}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground mt-3">An email will be sent to the user with their temporary password (default123) and login link.</p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={resultModalOpen} onOpenChange={setResultModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enrollment Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between p-2 rounded bg-green-50 dark:bg-green-900/20">
              <span className="text-green-700 dark:text-green-400">Successfully Added</span>
              <span className="font-bold">{resultData.added}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-orange-50 dark:bg-orange-900/20">
              <span className="text-orange-700 dark:text-orange-400">Removed Enrollment</span>
              <span className="font-bold">{resultData.removed}</span>
            </div>
            {resultData.failed && resultData.failed.length > 0 && (
              <div className="p-2 rounded bg-red-50 dark:bg-red-900/20">
                <span className="text-red-700 dark:text-red-400 font-medium mb-1 block">Failed ({resultData.failed.length})</span>
                <div className="max-h-24 overflow-y-auto text-xs space-y-1">
                  {resultData.failed.map((f: any, idx: number) => (
                    <div key={idx} className="text-red-600 dark:text-red-300">{f.usn || f.student_id || String(f)}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setResultModalOpen(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnrollmentManagement;
