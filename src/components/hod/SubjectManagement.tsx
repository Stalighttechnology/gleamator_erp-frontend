import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { SkeletonTable } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { manageSubjects, getSemesters, manageProfile, getHODSubjectBootstrap, getHODStudentBootstrap } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";

interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester_id: string;
  subject_type: string;
  credits?: number;
  batch_id?: string;
  section_id?: string;
}

interface Semester {
  id: string;
  number: number;
}

interface ManageSubjectsRequest {
  action: "create" | "update" | "delete";
  branch_id: string;
  name?: string;
  subject_code?: string;
  semester_id?: string;
  batch_id?: string;
  section_id?: string;
  subject_id?: string;
  subject_type?: string;
  credits?: number;
}

// Define error type for catch blocks
interface ErrorWithMessage {
  message: string;
}

// Type guard to check if an object has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Define the state type to include all properties
interface SubjectManagementState {
  subjects: Subject[];
  semesters: Semester[];
  batches: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string; batch_id?: string }>;
  deleteConfirmation: string | null;
  showModal: "add" | "edit" | null;
  currentSubject: Subject | null;
  newSubject: { code: string; name: string; semester_id: string; subject_type: string; credits: number; batch_id?: string; section_id?: string };
  error: string | null;
  success: string | null;
  loading: boolean;
  branchId: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  modalError: string | null;
}

const SubjectManagement = () => {
  const { theme } = useTheme();
  const [state, setState] = useState<SubjectManagementState>({
    subjects: [],
    semesters: [],
    batches: [],
    sections: [],
    deleteConfirmation: null,
    showModal: null,
    currentSubject: null,
    newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, batch_id: "", section_id: "" },
    error: null,
    success: null,
    loading: false,
    branchId: "",
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    modalError: null,
  });

  const totalPages = state.totalPages;

  // Helper to update state
  const updateState = (newState: Partial<SubjectManagementState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (state.error || state.success) {
      const timer = setTimeout(() => {
        updateState({ error: null, success: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error, state.success]);

  // Fetch branch ID and semesters (one-time bootstrap)
  const fetchBootstrap = async () => {
    try {
      const boot = await getHODSubjectBootstrap();
      if (!boot.success || !boot.data?.profile?.branch_id) {
        throw new Error(boot.message || "Failed to bootstrap subject management");
      }
      const branchId = boot.data.profile.branch_id;
      updateState({ branchId });

      // Semesters
      const semestersRes = boot.data.semesters ? { success: true, data: boot.data.semesters } : await getSemesters(branchId);

      if (semestersRes.success) {
        console.log("Semesters fetched:", semestersRes.data);
        updateState({ semesters: semestersRes.data || [] });
        if (!semestersRes.data?.length) {
          updateState({ error: "No semesters found for this branch" });
        }
      } else {
        updateState({ error: semestersRes.message || "Failed to fetch semesters" });
      }

      // Also fetch batches & sections for batch/section selects
      try {
        const stuBoot = await getHODStudentBootstrap(['profile', 'batches', 'sections']);
        if (stuBoot && stuBoot.success && stuBoot.data) {
          const batchesList = Array.isArray(stuBoot.data.batches) ? stuBoot.data.batches.map((b: any) => ({ id: String(b.id), name: b.name })) : [];
          const sectionsList = Array.isArray(stuBoot.data.sections) ? stuBoot.data.sections.map((s: any) => ({ id: String(s.id), name: s.name, batch_id: String(s.batch_id || s.batch || "") })) : [];
          updateState({ batches: batchesList, sections: sectionsList });
        } else {
          // fallback: try admin manageBatches if needed (not implemented here)
          console.debug("No student bootstrap batches/sections available");
        }
      } catch (e) {
        console.debug("Failed to fetch batches/sections:", e);
      }

      return branchId;
    } catch (err) {
      if (isErrorWithMessage(err)) {
        updateState({ error: err.message || "Failed to fetch bootstrap data" });
      } else {
        updateState({ error: "Failed to fetch bootstrap data" });
      }
      return null;
    }
  };

  // Fetch subjects with pagination
  const fetchSubjects = async (branchId: string, page: number = 1, pageSize: number = 10) => {
    updateState({ loading: true });
    try {
      const subjectsRes = await manageSubjects({
        branch_id: branchId,
        page,
        page_size: pageSize
      }, "GET");

      if (subjectsRes.success) {
        console.log("Subjects fetched:", subjectsRes.data);
        updateState({
          subjects: subjectsRes.data || [],
          totalCount: subjectsRes.count || 0,
          totalPages: subjectsRes.total_pages || 0,
          currentPage: subjectsRes.current_page || 1
        });
      } else {
        updateState({ error: subjectsRes.message || "Failed to fetch subjects" });
      }
    } catch (err) {
      if (isErrorWithMessage(err)) {
        updateState({ error: err.message || "Failed to fetch subjects" });
      } else {
        updateState({ error: "Failed to fetch subjects" });
      }
    } finally {
      updateState({ loading: false });
    }
  };

  // Initial bootstrap on mount
  useEffect(() => {
    const initialize = async () => {
      updateState({ loading: true });
      const branchId = await fetchBootstrap();
      if (branchId) {
        await fetchSubjects(branchId, state.currentPage, state.pageSize);
      }
      updateState({ loading: false });
    };
    initialize();
  }, []); // Only run once on mount

  // Fetch subjects when pagination changes (but not on initial mount)
  useEffect(() => {
    if (state.branchId) {
      fetchSubjects(state.branchId, state.currentPage, state.pageSize);
    }
  }, [state.currentPage, state.pageSize]);

  // Handle adding or updating a subject
  const handleSubmit = async () => {
    if (!state.newSubject.code || !state.newSubject.name) {
      updateState({ error: "Code and name are required" });
      return;
    }

    const data: ManageSubjectsRequest = {
      action: state.showModal === "add" ? "create" : "update",
      branch_id: state.branchId,
      name: state.newSubject.name,
      subject_code: state.newSubject.code,
      // enforce defaults for fields removed from UI
      semester_id: "3",
      subject_type: "regular",
      credits: 3,
      batch_id: state.newSubject.batch_id,
      section_id: state.newSubject.section_id,
      ...(state.showModal === "edit" && state.currentSubject ? { subject_id: state.currentSubject.id } : {}),
    };

    updateState({ loading: true });
    try {
      const response = await manageSubjects(data, "POST");
      if (response.success) {
        // Update local state to reflect create/update without refetching
        const isCreate = data.action === 'create';
        const createdId = response.data?.subject_id as unknown as string;
        const updatedSubject: Subject = {
          id: isCreate ? (createdId || `${Date.now()}`) : (state.currentSubject ? state.currentSubject.id : createdId || `${Date.now()}`),
          name: state.newSubject.name,
          subject_code: state.newSubject.code,
          // UI no longer exposes these; keep backend-safe defaults locally
          semester_id: "3",
          subject_type: "regular",
          credits: 3,
          batch_id: state.newSubject.batch_id || "",
          section_id: state.newSubject.section_id || "",
        };

        if (isCreate) {
          // Prepend to current page; keep page size stable
          const newSubjects = [updatedSubject, ...state.subjects].slice(0, state.pageSize);
          const newTotalCount = state.totalCount + 1;
          const newTotalPages = Math.ceil(newTotalCount / state.pageSize);
          updateState({
            subjects: newSubjects,
            totalCount: newTotalCount,
            totalPages: newTotalPages,
            success: "Course added successfully",
            showModal: null,
            newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, batch_id: "", section_id: "" },
            currentSubject: null,
          });
        } else {
          // Update in-place
          const newSubjects = state.subjects.map((s) => (s.id === updatedSubject.id ? updatedSubject : s));
          updateState({
            subjects: newSubjects,
            success: "Course updated successfully",
            showModal: null,
            newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, batch_id: "", section_id: "" },
            currentSubject: null,
          });
        }
      } else {
        updateState({ error: response.message });
      }
    } catch (err) {
      if (isErrorWithMessage(err)) {
        updateState({ error: err.message || "Failed to save subject" });
      } else {
        updateState({ error: "Failed to save subject" });
      }
    } finally {
      updateState({ loading: false });
    }
  };

  const handleEdit = (subject: Subject) => {
    updateState({
      currentSubject: subject,
      newSubject: {
        code: subject.subject_code,
        name: subject.name,
        semester_id: subject.semester_id || "3",
        subject_type: subject.subject_type || "regular",
        credits: subject.credits || 3,
        batch_id: subject.batch_id || "",
        section_id: subject.section_id || "",
      },
      showModal: "edit",
    });
  };

  // Handle deleting a subject
  const handleDelete = (subjectId: string) => {
    updateState({ deleteConfirmation: subjectId });
  };

  const confirmDelete = async (confirmed: boolean) => {
    if (confirmed && state.deleteConfirmation) {
      const data: ManageSubjectsRequest = {
        action: "delete",
        branch_id: state.branchId,
        subject_id: state.deleteConfirmation,
      };

      updateState({ loading: true });
      try {
        const response = await manageSubjects(data, "POST");
        if (response.success) {
          // Remove locally and adjust pagination; only fetch if previous page must be loaded
          const removedId = state.deleteConfirmation;
          const newSubjectsList = state.subjects.filter((s) => s.id !== removedId);
          const newTotalCount = Math.max(0, state.totalCount - 1);
          const newTotalPages = Math.ceil(newTotalCount / state.pageSize);
          let newPage = state.currentPage;
          // If current page became empty and there is a previous page, go back one page and fetch it
          if (newSubjectsList.length === 0 && state.currentPage > 1) {
            newPage = Math.max(1, newTotalPages);
            updateState({ loading: false, deleteConfirmation: null, success: "Course deleted successfully", currentPage: newPage, totalCount: newTotalCount, totalPages: newTotalPages });
            // Load previous page because we don't have its items locally
            await fetchSubjects(state.branchId, newPage, state.pageSize);
          } else {
            updateState({ subjects: newSubjectsList, totalCount: newTotalCount, totalPages: newTotalPages, success: "Course deleted successfully" });
          }
        } else {
          updateState({ error: response.message });
        }
      } catch (err) {
        if (isErrorWithMessage(err)) {
          updateState({ error: err.message || "Failed to delete subject" });
        } else {
          updateState({ error: "Failed to delete subject" });
        }
      } finally {
        updateState({ loading: false });
      }
    }
    updateState({ deleteConfirmation: null });
  };

  // Helper to get semester number by ID
  const getSemesterNumber = (semesterId: string): string => {
    const semester = state.semesters.find((s) => s.id === semesterId);
    return semester ? `Semester ${semester.number}` : `Semester ID: ${semesterId} (Not Found)`;
  };

  const getBatchName = (batchId?: string): string => {
    if (!batchId) return "";
    const b = state.batches.find((bb) => String(bb.id) === String(batchId));
    return b ? b.name : String(batchId);
  };

  const getSectionName = (sectionId?: string): string => {
    if (!sectionId) return "";
    const s = state.sections.find((ss) => String(ss.id) === String(sectionId));
    return s ? s.name : String(sectionId);
  };

  // Resolve batch name from different subject shapes returned by API
  const getBatchNameFromSubject = (subject: any): string => {
    if (!subject) return "";
    // direct name fields
    if (subject.batch_name) return String(subject.batch_name);
    if (subject.course && subject.course.batch_name) return String(subject.course.batch_name);
    // nested objects with name
    if (subject.batch && typeof subject.batch === 'object' && subject.batch.name) return String(subject.batch.name);
    if (subject.course && subject.course.batch && typeof subject.course.batch === 'object' && subject.course.batch.name) return String(subject.course.batch.name);
    // possible id fields (string, number, or object)
    const maybeId =
      subject.batch_id ??
      (subject.batch && (typeof subject.batch === 'string' ? subject.batch : (subject.batch.id ?? subject.batch.batch_id))) ??
      (subject.course && (subject.course.batch_id ?? subject.course.batch ?? subject.course.batch?.id));
    return maybeId !== undefined && maybeId !== null && String(maybeId) !== '' ? getBatchName(String(maybeId)) : "";
  };

  // Resolve section name from different subject shapes returned by API
  const getSectionNameFromSubject = (subject: any): string => {
    if (!subject) return "";
    if (subject.section_name) return String(subject.section_name);
    if (subject.course && subject.course.section_name) return String(subject.course.section_name);
    if (subject.section && typeof subject.section === 'object' && subject.section.name) return String(subject.section.name);
    if (subject.course && subject.course.section && typeof subject.course.section === 'object' && subject.course.section.name) return String(subject.course.section.name);
    const maybeId =
      subject.section_id ??
      (subject.section && (typeof subject.section === 'string' ? subject.section : (subject.section.id ?? subject.section.section_id))) ??
      (subject.course && (subject.course.section_id ?? subject.course.section ?? subject.course.section?.id));
    return maybeId !== undefined && maybeId !== null && String(maybeId) !== '' ? getSectionName(String(maybeId)) : "";
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>

      {state.error && <div className={`mb-4 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{state.error}</div>}
      {state.success && <div className={`mb-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{state.success}</div>}

      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Manage Courses</CardTitle>
            <Button
              onClick={() => {
                updateState({
                  showModal: "add",
                  newSubject: { code: "", name: "", semester_id: "3", subject_type: "regular", credits: 3, batch_id: "", section_id: "" },
                  currentSubject: null,
                });
              }}
              className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
              disabled={state.loading || !state.branchId}
            >
              + Add Course
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {state.loading ? (
            <div className="py-4">
              <SkeletonTable rows={10} cols={6} />
            </div>
          ) : (
            <>
              {/* Desktop/Table for md+ */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full table-auto text-sm">
                  <thead className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-gray-100 text-gray-900'}>
                    <tr>
                      <th className="px-4 py-3 text-left">COURSE CODE</th>
                      <th className="px-4 py-3 text-left">COURSE NAME</th>
                      <th className="px-4 py-3 text-left hidden">SEMESTER</th>
                      <th className="px-4 py-3 text-left hidden">COURSE TYPE</th>
                      <th className="px-4 py-3 text-left hidden">COURSE CREDITS</th>
                      <th className="px-4 py-3 text-left">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className={theme === 'dark' ? 'bg-background' : 'bg-white'}>
                    {state.subjects.map((subject, index) => (
                      <tr
                        key={subject.id}
                        className={
                          index % 2 === 0 ? (theme === 'dark' ? 'bg-card' : 'bg-gray-50') : (theme === 'dark' ? 'bg-background' : 'bg-white')
                        }
                      >
                        <td className="px-4 py-3">{subject.subject_code}</td>
                        <td className="px-4 py-3">{subject.name}</td>
                        <td className="px-4 py-3 hidden">{getSemesterNumber(subject.semester_id)}</td>
                        <td className="px-4 py-3 hidden">{subject.subject_type === 'regular' ? 'Regular' : subject.subject_type === 'elective' ? 'Elective Subjects' : 'Open Elective Subjects'}</td>
                        <td className="px-4 py-3 hidden">{subject.credits ?? 0}</td>
                        <td className="px-4 py-3 flex gap-5">
                          <Pencil
                            className={`w-4 h-4 cursor-pointer ${theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-800'}`}
                            onClick={() => handleEdit(subject)}
                          />
                          <Trash2
                            className={`w-4 h-4 cursor-pointer ${theme === 'dark' ? 'text-destructive hover:text-destructive/80' : 'text-red-600 hover:text-red-800'}`}
                            onClick={() => handleDelete(subject.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: card list (only visible on small screens) */}
              <div className="md:hidden space-y-3">
                {state.subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className={`p-3 rounded-md border ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-3">
                        <div className="text-xs text-gray-500 mb-1">{subject.subject_code}</div>
                        <div className="font-medium text-sm mb-1">{subject.name}</div>
                        <div className="text-sm text-gray-500">
                          {(() => {
                            const b = getBatchNameFromSubject(subject);
                            const s = getSectionNameFromSubject(subject);
                            return b || s ? `${b}${b && s ? ' • ' : ''}${s}` : 'No batch/section';
                          })()}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Pencil
                          className={`w-5 h-5 cursor-pointer ${theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-800'}`}
                          onClick={() => handleEdit(subject)}
                        />
                        <Trash2
                          className={`w-5 h-5 cursor-pointer ${theme === 'dark' ? 'text-destructive hover:text-destructive/80' : 'text-red-600 hover:text-red-800'}`}
                          onClick={() => handleDelete(subject.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="mt-4 flex justify-end items-center gap-2">
            <Button
              onClick={() => updateState({ currentPage: Math.max(state.currentPage - 1, 1) })}
              disabled={state.currentPage === 1 || state.loading}
              className="flex items-center justify-center gap-1 text-sm font-medium py-1.5 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            >
              Previous
            </Button>
            <div className={`px-4 text-center text-sm font-medium py-1.5 rounded-md min-w-12 ${theme === 'dark' ? 'text-foreground bg-card border border-border' : 'text-gray-900 bg-white border border-gray-300'}`}>
              {state.currentPage}
            </div>
            <Button
              onClick={() => updateState({ currentPage: Math.min(state.currentPage + 1, totalPages) })}
              disabled={state.currentPage === totalPages || state.loading || totalPages === 0}
              className="flex items-center justify-center gap-1 text-sm font-medium py-1.5 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {state.deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => confirmDelete(false)}>
          <div className={`p-4 md:p-6 w-[92%] max-w-sm md:w-auto rounded-2xl md:rounded shadow-lg ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Are you sure you want to delete this course?
            </h3>
            <div className="flex justify-end gap-4">
              <Button
                onClick={() => confirmDelete(false)}
                className={`text-foreground ${theme === 'dark' ? 'bg-card border-border hover:bg-accent' : 'bg-white border-gray-300 hover:bg-gray-100'}`}
                disabled={state.loading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmDelete(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={state.loading}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Subject Modal */}
      {state.showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={() => updateState({ showModal: null })}>
          <div className={`p-6 rounded-lg shadow-lg w-96 max-h-[70vh] overflow-y-auto md:max-h-none md:overflow-visible ${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              {state.showModal === "add" ? "Add New Subject" : "Edit Subject"}
            </h3>

            {/* Display modal-level error below title */}
            {state.modalError && (
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-destructive' : 'text-red-500'}`}>{state.modalError}</p>
            )}

            {/* Course Code */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Course Code</label>
              <Input
                type="text"
                value={state.newSubject.code}
                onChange={(e) => {
                  const code = e.target.value.toUpperCase(); // auto-uppercase
                  updateState({
                    newSubject: { ...state.newSubject, code },
                    modalError: null,
                  });
                }}
                placeholder="e.g., PH1L001, BCS601"
                disabled={state.loading}
                className={`${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'} px-3 py-2 rounded`}
              />
            </div>

            {/* Course Name */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Course Name</label>
              <Input
                type="text"
                value={state.newSubject.name}
                onChange={(e) =>
                  updateState({
                    newSubject: { ...state.newSubject, name: e.target.value },
                    modalError: null,
                  })
                }
                placeholder="e.g., Mathematics"
                disabled={state.loading}
                className={`${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'} px-3 py-2 rounded`}
              />
            </div>

            {/* Batch */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Batch</label>
              <Select
                value={state.newSubject.batch_id}
                onValueChange={(val: string) => updateState({ newSubject: { ...state.newSubject, batch_id: val }, modalError: null })}
                disabled={state.loading}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  {/* Populate batch options via API when available */}
                  {state.batches.length === 0 ? (
                    <SelectItem value="__none">No batches</SelectItem>
                  ) : (
                    state.batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Section */}
            <div className="mb-4">
              <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section</label>
              <Select
                value={state.newSubject.section_id}
                onValueChange={(val: string) => updateState({ newSubject: { ...state.newSubject, section_id: val }, modalError: null })}
                disabled={state.loading}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {/* Populate section options via API when available */}
                    {(() => {
                      const selectedBatch = state.newSubject.batch_id || "";
                      const options = state.sections.filter((s) => String(s.batch_id || "") === String(selectedBatch));
                      if (!options.length) return <SelectItem value="__none">No sections</SelectItem>;
                      return options.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>);
                    })()}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden">
              {/* Semester */}
              <div className="mb-4">
                <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Semester</label>
                <Select
                  value={state.newSubject.semester_id}
                  onValueChange={(val: string) => updateState({ newSubject: { ...state.newSubject, semester_id: val }, modalError: null })}
                  disabled={state.loading}
                >
                  <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {state.semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        Semester {semester.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Type */}
              <div className="mb-4">
                <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Course Type</label>
                <Select
                  value={state.newSubject.subject_type}
                  onValueChange={(val: string) => updateState({ newSubject: { ...state.newSubject, subject_type: val }, modalError: null })}
                  disabled={state.loading}
                >
                  <SelectTrigger className={`w-full ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}`}>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="elective">Elective Subjects</SelectItem>
                    <SelectItem value="open_elective">Open Elective Subjects</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Course Credits */}
              <div className="mb-4">
                <label className={`block mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Course Credits</label>
                <Input
                  type="number"
                  min={0}
                  value={state.newSubject.credits}
                  onChange={(e) =>
                    updateState({ newSubject: { ...state.newSubject, credits: Number(e.target.value) }, modalError: null })
                  }
                  placeholder="e.g., 3"
                  disabled={state.loading}
                  className={`${theme === 'dark' ? 'bg-card border-border text-foreground placeholder:text-muted-foreground' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'} px-3 py-2 rounded`}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                onClick={() => {
                  updateState({
                    showModal: null,
                    newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, batch_id: "", section_id: "" },
                    currentSubject: null,
                    modalError: null,
                  });
                }}
                className={`${theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 bottom-1 '}`}
                disabled={state.loading}
              >
                Cancel
              </Button>

              <Button
                onClick={async () => {
                  if (!state.newSubject.code || !state.newSubject.name) {
                    updateState({ modalError: "Code and name are required" });
                    return;
                  }

                  const data: ManageSubjectsRequest = {
                    action: state.showModal === "add" ? "create" : "update",
                    branch_id: state.branchId,
                    name: state.newSubject.name,
                    subject_code: state.newSubject.code,
                    // always send defaults for hidden fields
                    semester_id: "3",
                    subject_type: "regular",
                    credits: 3,
                    batch_id: state.newSubject.batch_id,
                    section_id: state.newSubject.section_id,
                    ...(state.showModal === "edit" && state.currentSubject ? { subject_id: state.currentSubject.id } : {}),
                  };

                  updateState({ loading: true, modalError: null, success: null });
                  try {
                    const response = await manageSubjects(data, "POST");
                    if (response.success) {
                      const isCreate = data.action === 'create';
                      const createdId = response.data?.subject_id as unknown as string;
                      const updatedSubject: Subject = {
                        id: isCreate ? (createdId || `${Date.now()}`) : (state.currentSubject ? state.currentSubject.id : createdId || `${Date.now()}`),
                        name: state.newSubject.name,
                        subject_code: state.newSubject.code,
                        semester_id: "3",
                        subject_type: "regular",
                        credits: 3,
                        batch_id: state.newSubject.batch_id || "",
                        section_id: state.newSubject.section_id || "",
                      };

                      if (isCreate) {
                        const newSubjects = [updatedSubject, ...state.subjects].slice(0, state.pageSize);
                        const newTotalCount = state.totalCount + 1;
                        const newTotalPages = Math.ceil(newTotalCount / state.pageSize);
                        updateState({
                          subjects: newSubjects,
                          totalCount: newTotalCount,
                          totalPages: newTotalPages,
                          success: "Subject added successfully",
                          showModal: null,
                          newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, batch_id: "", section_id: "" },
                          currentSubject: null,
                          modalError: null,
                        });
                      } else {
                        const newSubjects = state.subjects.map((s) => (s.id === updatedSubject.id ? updatedSubject : s));
                        updateState({
                          subjects: newSubjects,
                          success: "Subject updated successfully",
                          showModal: null,
                          newSubject: { code: "", name: "", semester_id: "", subject_type: "regular", credits: 3, batch_id: "", section_id: "" },
                          currentSubject: null,
                          modalError: null,
                        });
                      }
                    } else {
                      updateState({ modalError: response.message });
                    }
                  } catch (err) {
                    updateState({ modalError: "Failed to save subject" });
                  } finally {
                    updateState({ loading: false });
                  }
                }}
                className="bg-primary text-white border border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
                disabled={state.loading}
              >
                {state.showModal === "add" ? "Add Course" : "Update Course"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;