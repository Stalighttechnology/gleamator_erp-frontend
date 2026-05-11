import { useState, useEffect, useCallback, ReactNode, Component } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { SkeletonTable } from "../ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { useToast } from "../ui/use-toast";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "../ui/dialog";
import { manageFacultyAssignments, manageSections, getFacultyAssignmentsBootstrap, getBatches, manageBatches, getHODStudentBootstrap } from "../../utils/hod_api";
import { getSections as getSectionsByBatch } from "../../utils/faculty_api";
import { useTheme } from "../../context/ThemeContext";

// Interfaces
interface FacultyAssignmentsProps {
  setError: (error: string | null) => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface ManageFacultyAssignmentsRequest {
  action: "create" | "update" | "delete";
  assignment_id?: string;
  faculty_id?: string;
  subject_id?: string;
  batch_id?: string;
  semester_id?: string;
  section_id?: string;
  branch_id: string;
}

interface Assignment {
  id: string;
  faculty: string;
  subject?: string;
  batch_name?: string;
  batch?: string;
  section: string;
  semester: number;
  faculty_id: string;
  subject_id?: string;
  batch_id?: string;
  section_id: string;
  semester_id: string;
  branch_id?: string; // Add optional branch_id property
}

interface Faculty {
  id: string;
  username: string;
  first_name: string;
  last_name: string | null;
  name?: string; // Add optional name property
}

interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester_id: string; // Only string type
}

interface Section {
  id: string;
  name: string;
  semester_id: string; // Only string type
}

interface Semester {
  id: string;
  number: number;
}

// Define types for API responses
interface SemesterData {
  id: number | string; // Allow both types
  number: number;
}

interface FacultyData {
  id: string;
  username: string;
  first_name: string;
  last_name: string | null;
}

interface SubjectData {
  id: string;
  name: string;
  subject_code: string;
  semester_id: number;
}

interface SectionData {
  id: string;
  name: string;
  semester_id: number;
}

interface AssignmentData {
  id: string;
  faculty: string;
  subject: string;
  section: string;
  semester: number;
  faculty_id: string;
  subject_id: string;
  section_id: string;
  semester_id: string;
}

interface ProfileData {
  branch_id: string;
}

interface HODSubjectBootstrapResponse {
  profile: ProfileData;
  semesters: SemesterData[];
  faculties: FacultyData[];
}

interface ManageAssignmentsResponse {
  success: boolean;
  data?: {
    assignment_id?: string;
    assignments?: AssignmentData[];
  };
  message?: string;
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

// Error Boundary Component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-6 text-red-500">
          <h2>Error: {this.state.errorMessage}</h2>
          <p>Please try refreshing the page or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const FacultyAssignments = ({ setError }: FacultyAssignmentsProps) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [state, setState] = useState({
    facultyId: "",
    sectionId: "",
    semesterId: "",
    batchId: "",
    assignments: [] as Assignment[],
    editingId: null as string | null,
    deleteId: null as string | null,
    openDeleteModal: false,
    loading: true,
    isAssigning: false,
    // subjects removed - now using batches
    sections: [] as Section[],
    semesters: [] as Semester[],
    faculties: [] as Faculty[],
    facultySearch: "",
    branchId: "",
    filterBatchId: "",
    filterSectionId: "",
    filterSections: [] as Section[],
  });

  // Local batches state (separate from the composite state)
  const [batches, setBatches] = useState<Array<any>>([]);

  // Helper to update state (stable reference for hooks)
  const updateState = useCallback((newState: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  // Small helpers to reduce cognitive complexity in handlers
  const buildFacultyName = (id: string) => {
    const f = state.faculties.find(x => x.id === id);
    return f ? `${f.first_name} ${f.last_name || ''}`.trim() : 'This faculty';
  };

  const hasDuplicateAssignment = (batchId: string, sectionId: string, semesterId: string, excludeId?: string) =>
    state.assignments.some(a => String(a.batch_id || a.subject_id || '') === String(batchId) && a.section_id === sectionId && a.semester_id === semesterId && a.id !== excludeId);

  const hasDuplicateFaculty = (facultyId: string, batchId: string, sectionId: string, semesterId: string, excludeId?: string) =>
    state.assignments.some(a => a.faculty_id === facultyId && String(a.batch_id || a.subject_id || '') === String(batchId) && a.section_id === sectionId && a.semester_id === semesterId && a.id !== excludeId);

  const buildAssignmentFromForm = (form?: { facultyId?: string; batchId?: string; sectionId?: string; semesterId?: string }) => {
    const fId = form?.facultyId ?? state.facultyId;
    const bId = form?.batchId ?? state.batchId;
    const secId = form?.sectionId ?? state.sectionId;
    const semId = form?.semesterId ?? state.semesterId;

    const batchObj = batches.find((b) => String(b.id) === String(bId)) || undefined;

    return {
      faculty_id: fId,
      batch_id: bId,
      section_id: secId,
      semester_id: semId,
      faculty: buildFacultyName(fId),
      batch_name: batchObj?.name || '',
      section: state.sections.find(s => s.id === secId)?.name || '',
      semester: state.semesters.find(s => s.id === semId)?.number || 0,
    } as Partial<Assignment>;
  };

    type FormState = {
      facultyId: string;
      batchId: string;
      sectionId: string;
      semesterId: string;
      editingId: string | null;
    };

  // Optimistic helpers (separate create vs update to avoid branching flag)
  const applyOptimisticCreate = (tempId?: string) => {
    const newAssignment: Assignment = {
      id: tempId || `temp-${Date.now()}`,
      ...(buildAssignmentFromForm() as Assignment),
    };
    updateState({ assignments: [...state.assignments, newAssignment] });
  };

  const applyOptimisticEdit = () => {
    const updateFields = buildAssignmentFromForm();
    const updatedAssignments = state.assignments.map(assignment =>
      assignment.id === state.editingId ? { ...assignment, ...updateFields } : assignment
    );
    updateState({ assignments: updatedAssignments });
  };

  const reconcileCreateResponse = (response: ManageAssignmentsResponse, originalFormStateLocal: FormState) => {
    const createdId = response.data?.assignment_id;
    if (createdId) {
      const replaced = state.assignments.map((a) => (String(a.id).startsWith('temp-') && a.faculty_id === originalFormStateLocal.facultyId && String(a.batch_id || a.subject_id || '') === String(originalFormStateLocal.batchId) && a.section_id === originalFormStateLocal.sectionId && a.semester_id === originalFormStateLocal.semesterId)
        ? { ...a, id: createdId }
        : a
      );
      updateState({ assignments: replaced });
    }
  };

  const revertOptimisticChanges = (originalAssignmentsLocal: Assignment[], originalFormStateLocal: FormState) => {
    updateState({
      assignments: originalAssignmentsLocal,
      facultyId: originalFormStateLocal.facultyId,
      batchId: originalFormStateLocal.batchId,
      sectionId: originalFormStateLocal.sectionId,
      semesterId: originalFormStateLocal.semesterId,
      editingId: originalFormStateLocal.editingId,
    });
  };

  const saveCreateAssignment = async (data: ManageFacultyAssignmentsRequest, originalAssignmentsLocal: Assignment[], originalFormStateLocal: FormState) => {
    updateState({ isAssigning: true, loading: true });
    try {
      const response = await manageFacultyAssignments(data, "POST") as ManageAssignmentsResponse;
      if (response.success) {
        reconcileCreateResponse(response, originalFormStateLocal);
      } else {
        throw new Error(response.message || "Failed to save assignment");
      }
    } catch (err) {
      revertOptimisticChanges(originalAssignmentsLocal, originalFormStateLocal);
      if (isErrorWithMessage(err)) {
        const errorMessage = err.message || "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      } else {
        const errorMessage = "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      }
    } finally {
      updateState({ isAssigning: false, loading: false });
    }
  };

  const saveUpdateAssignment = async (data: ManageFacultyAssignmentsRequest, originalAssignmentsLocal: Assignment[], originalFormStateLocal: FormState) => {
    updateState({ isAssigning: true, loading: true });
    try {
      const response = await manageFacultyAssignments(data, "POST") as ManageAssignmentsResponse;
      if (!response.success) {
        throw new Error(response.message || "Failed to save assignment");
      }
      // No further reconciliation needed for update; optimistic edit already applied
    } catch (err) {
      revertOptimisticChanges(originalAssignmentsLocal, originalFormStateLocal);
      if (isErrorWithMessage(err)) {
        const errorMessage = err.message || "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      } else {
        const errorMessage = "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      }
    } finally {
      updateState({ isAssigning: false, loading: false });
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      updateState({ loading: true });
      try {
        const boot = await getFacultyAssignmentsBootstrap();
        if (!boot.success || !boot.data) {
          throw new Error(boot.message || "Failed to bootstrap faculty assignments");
        }

        const profile = boot.data.profile;
        const semesters = boot.data.semesters.map((s) => ({
          id: s.id.toString(),
          number: s.number
        }));
        const faculties = boot.data.faculties;
        const defaultSemesterId =
          semesters.find((s) => Number(s.number) === 3)?.id ||
          semesters[0]?.id ||
          "";

        updateState({
          branchId: profile.branch_id,
          semesters,
          faculties,
          semesterId: defaultSemesterId,
        });
      } catch (err) {
        if (isErrorWithMessage(err)) {
          const errorMessage = err.message || "Network error";
          setError(errorMessage);
          toast({ variant: "destructive", title: "Error", description: errorMessage });
        } else {
          const errorMessage = "Network error";
          setError(errorMessage);
          toast({ variant: "destructive", title: "Error", description: errorMessage });
        }
      } finally {
        updateState({ loading: false });
      }
    };
    fetchInitialData();
  }, [toast, setError, updateState]);

  // Fetch batches (and their sections) once branchId is available
  useEffect(() => {
    let mounted = true;
    const fetchBatches = async () => {
      if (!state.branchId) return;
      try {
        // Try the generic batches endpoint first
        const res = await getBatches();
        let finalBatches: any[] = [];
        if (res && res.success) {
          finalBatches = res.data?.batches || [];
        }

        // If batches exist but none include sections, fetch student bootstrap (batches+sections)
        const hasSections = finalBatches.some(b => Array.isArray(b.sections) && b.sections.length > 0);
        if (!hasSections) {
          try {
            const stuBoot = await getHODStudentBootstrap(['batches', 'sections']);
            if (stuBoot && stuBoot.success && stuBoot.data) {
              const bootBatches = Array.isArray(stuBoot.data.batches) ? stuBoot.data.batches.map((b: any) => ({ id: b.id, name: b.name })) : [];
              const bootSections = Array.isArray(stuBoot.data.sections) ? stuBoot.data.sections.map((s: any) => ({ id: s.id, name: s.name, batch_id: s.batch_id || s.batch || s.batch_id })) : [];
              // attach sections to batches by matching batch id
              finalBatches = bootBatches.map((b: any) => ({
                ...b,
                sections: bootSections.filter((s: any) => String(s.batch_id) === String(b.id)).map((s: any) => ({ id: s.id, name: s.name }))
              }));
            }
          } catch (e) {
            console.debug('Failed to fetch student bootstrap for sections', e);
          }
        }

        if (mounted) setBatches(finalBatches);
      } catch (err) {
        console.error("Error fetching batches:", err);
      }
    };
    fetchBatches();
    return () => { mounted = false; };
  }, [state.branchId]);

  // When a batch is selected, ensure its sections are loaded. If the batch object lacks sections,
  // fetch batch detail via `manageBatches(batchId)` and attach sections to the batch entry.
  useEffect(() => {
    let mounted = true;
    const ensureBatchSections = async () => {
      const bId = (state as any).batchId;
      if (!bId) return;
      const selected = batches.find(b => String(b.id) === String(bId));
      if (selected && Array.isArray(selected.sections) && selected.sections.length) return;
      try {
        const detail = await manageBatches(undefined, String(bId), "GET");
        let anyRes: any = detail;
        let sections = anyRes?.sections ?? anyRes?.data?.sections ?? anyRes?.results?.sections ?? [];

        // If no sections from batch detail, try faculty API which supports batch_id
        if ((!sections || !sections.length)) {
          try {
            const secRes = await getSectionsByBatch(String(bId));
            if (secRes && secRes.success && Array.isArray(secRes.data) && secRes.data.length) {
              sections = secRes.data;
            }
          } catch (err) {
            console.debug('getSectionsByBatch failed', err);
          }
        }

        if (mounted && sections && sections.length) {
          const normalized = sections.map((s: any) => ({ id: s.id, name: s.name }));
          setBatches(prev => prev.map(b => String(b.id) === String(bId) ? { ...b, sections: normalized } : b));
        }
      } catch (e) {
        console.debug('Failed to fetch batch detail for sections', e);
      }
    };
    ensureBatchSections();
    return () => { mounted = false; };
  }, [(state as any).batchId, batches]);

  // Fetch sections for filter when filter batch changes
  useEffect(() => {
    const fetchFilterSections = async () => {
      if (!state.branchId || !(state as any).filterBatchId) {
        updateState({ filterSections: [], filterSectionId: "" });
        return;
      }

      try {
        const secRes = await getSectionsByBatch(String((state as any).filterBatchId));
        if (secRes && secRes.success) {
          updateState({ filterSections: secRes.data || [], filterSectionId: "" });
        }
      } catch (err) {
        console.error("Error fetching filter sections:", err);
      }
    };
    fetchFilterSections();
  }, [(state as any).filterBatchId, state.branchId, updateState]);

  // Fetch assignments when batch/section filters change
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!state.branchId || !(state as any).filterBatchId || !state.filterSectionId) {
        updateState({ assignments: [] });
        return;
      }

      updateState({ loading: true });
      try {
        const response = await manageFacultyAssignments({
          branch_id: state.branchId,
          batch_id: (state as any).filterBatchId,
          section_id: state.filterSectionId,
        }, "GET");

        if (response.success && response.data?.assignments) {
          updateState({
            assignments: response.data.assignments,
          });
        }
      } catch (err) {
        console.error("Error fetching assignments:", err);
      } finally {
        updateState({ loading: false });
      }
    };

    fetchAssignments();
  }, [state.branchId, (state as any).filterBatchId, state.filterSectionId, updateState]);

  const resetForm = () => {
    const fallbackSemesterId =
      state.semesters.find((s) => Number(s.number) === 3)?.id ||
      state.semesters[0]?.id ||
      "";
    updateState({
      facultyId: "",
      batchId: "",
      sectionId: "",
      semesterId: fallbackSemesterId,
      editingId: null,
    });
  };

  const validateForm = () => {
    if (!state.facultyId || !(state as any).batchId || !state.sectionId) {
      toast({
        title: "Error",
        description: "Please select all required fields",
        variant: "destructive",
      });
      return false;
    }
    if (!state.faculties.some(f => f.id === state.facultyId)) {
      toast({ title: "Error", description: "Invalid faculty selected", variant: "destructive" });
      return false;
    }
    // subject removed - validate batch
    if (!batches.some(b => String(b.id) === String((state as any).batchId))) {
      toast({ title: "Error", description: "Invalid batch selected", variant: "destructive" });
      return false;
    }
    const selectedBatch = batches.find(b => String(b.id) === String((state as any).batchId));
    if (!selectedBatch || !selectedBatch.sections || !selectedBatch.sections.some((s: any) => String(s.id) === String(state.sectionId))) {
      toast({ title: "Error", description: "Invalid section selected", variant: "destructive" });
      return false;
    }
    if (state.semesters.length > 0 && !state.semesters.some(s => s.id === state.semesterId)) {
      toast({ title: "Error", description: "Invalid semester selected", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleAssignFaculty = async () => {
    if (!validateForm() || !state.branchId) return;

    // 🚨 Case 1: Prevent multiple faculties or duplicate faculty assignment for same subject/section/semester
    if (hasDuplicateAssignment((state as any).batchId, state.sectionId, state.semesterId, state.editingId)) {
      const dup = state.assignments.find(a => String(a.batch_id || a.subject_id || '') === String((state as any).batchId) && a.section_id === state.sectionId && a.semester_id === state.semesterId && a.id !== state.editingId);
      toast({
        variant: "destructive",
        title: "Duplicate Assignment",
        description: `Batch "${(dup as any).batch_name || dup?.batch || dup?.subject || ''}" is already assigned to Section ${dup?.section || ''}, Semester ${dup?.semester || ''}. Only one faculty can be assigned.`,
      });
      return;
    }

    if (hasDuplicateFaculty(state.facultyId, (state as any).batchId, state.sectionId, state.semesterId, state.editingId)) {
      const dupF = state.assignments.find(a => a.faculty_id === state.facultyId && String(a.batch_id || a.subject_id || '') === String((state as any).batchId) && a.section_id === state.sectionId && a.semester_id === state.semesterId && a.id !== state.editingId);
      const facultyName = buildFacultyName(state.facultyId);
      toast({
        variant: "destructive",
        title: "Duplicate Faculty Assignment",
        description: `${facultyName} is already assigned to ${(dupF as any).batch_name || dupF?.subject || ''} - Section ${dupF?.section || ''}, Semester ${dupF?.semester || ''}.`,
      });
      return;
    }

    // ✅ Proceed if no duplicates
    const isEditing = !!state.editingId;
    const originalAssignments = [...state.assignments];
    const originalFormState = {
      facultyId: state.facultyId,
      batchId: (state as any).batchId,
      sectionId: state.sectionId,
      semesterId: state.semesterId,
      editingId: state.editingId,
    };

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    if (isEditing) applyOptimisticEdit(); else applyOptimisticCreate(tempId);

    // Clear form optimistically and show success toast
    resetForm();
    toast({ title: isEditing ? "Updated" : "Success", description: isEditing ? "Assignment updated successfully" : "Faculty assigned successfully", className: "bg-green-100 text-green-800" });

    const data: ManageFacultyAssignmentsRequest = {
      action: isEditing ? "update" : "create",
      assignment_id: state.editingId,
      faculty_id: originalFormState.facultyId,
      batch_id: originalFormState.batchId,
      semester_id: originalFormState.semesterId,
      section_id: originalFormState.sectionId,
      branch_id: state.branchId,
    };

    if (isEditing) {
      await saveUpdateAssignment(data, originalAssignments, originalFormState as FormState);
    } else {
      await saveCreateAssignment(data, originalAssignments, originalFormState as FormState);
    }
  };

  const handleEdit = (assignment: Assignment) => {
    updateState({
      editingId: assignment.id,
      facultyId: assignment.faculty_id,
      batchId: (assignment as any).batch_id || (assignment as any).batch || "",
      sectionId: assignment.section_id,
      semesterId: assignment.semester_id,
    });
  };

  const handleConfirmDelete = async () => {
    if (!state.deleteId || !state.branchId) return;

    // Store original state for potential reversion
    const originalAssignments = [...state.assignments];

    // Optimistic update: remove assignment from list
    const updatedAssignments = state.assignments.filter(a => a.id !== state.deleteId);
    updateState({ assignments: updatedAssignments });

    // Close modal optimistically
    updateState({ deleteId: null, openDeleteModal: false });

    // Show success toast optimistically
    toast({
      title: "Deleted",
      description: "Assignment deleted successfully",
      className: "bg-green-100 text-green-800",
    });

    updateState({ loading: true });

    try {
      const data: ManageFacultyAssignmentsRequest = {
        action: "delete",
        assignment_id: state.deleteId,
        branch_id: state.branchId,
      };
      const response = await manageFacultyAssignments(data, "POST");
      if (response.success) {
        // Deletion succeeded on server; we already removed it optimistically
      } else {
        throw new Error(response.message || "Failed to delete assignment");
      }
    } catch (err) {
      // Revert optimistic changes
      updateState({ assignments: originalAssignments });

      if (isErrorWithMessage(err)) {
        const errorMessage = err.message || "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      } else {
        const errorMessage = "Network error";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
        setError(errorMessage);
      }
    } finally {
      updateState({ loading: false });
    }
  };

  const filteredAssignments = state.assignments;
  const facultyMap = state.faculties.reduce((acc, f) => {
    acc[f.id] = {
      name: `${f.first_name} ${f.last_name || ""}`.trim(),
      email: f.username,
    };
    return acc;
  }, {} as Record<string, { name: string; email: string }>);


  return (
    <ErrorBoundary>
      <div className={` space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
        <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <CardTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>{state.editingId ? "Edit Faculty Assignment" : "Add Faculty Assignment"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block mb-1 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Faculty
                <Select
                  value={state.facultyId}
                  onValueChange={(value) => updateState({ facultyId: value })}
                  disabled={state.loading || state.isAssigning || state.faculties.length === 0}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder={state.faculties.length === 0 ? "No faculties available" : "Select Faculty"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {state.faculties.map((faculty) => (
                      <SelectItem key={faculty.id} value={faculty.id} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        {faculty.first_name} {faculty.last_name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </label>
              </div>

              <div>
                <label className={`block mb-1 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Batch
                <Select
                  value={(state as any).batchId}
                  onValueChange={(value) => updateState({ batchId: value, sectionId: "" })}
                  disabled={state.loading || state.isAssigning || batches.length === 0}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder={batches.length === 0 ? "No batches available" : "Select Batch"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={String(batch.id)} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </label>
              </div>

              <div>
                <label className={`block mb-1 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Section
                <Select
                  value={state.sectionId}
                  onValueChange={(value) => updateState({ sectionId: value })}
                  disabled={state.loading || state.isAssigning || !(batches.find(b => String(b.id) === String((state as any).batchId))?.sections?.length)}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder={!(batches.find(b => String(b.id) === String((state as any).batchId))?.sections?.length) ? "No sections available" : "Select Section"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {(batches.find(b => String(b.id) === String((state as any).batchId))?.sections || []).map((section: any) => (
                      <SelectItem key={section.id} value={String(section.id)} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </label>
              </div>

              <div className="hidden">
                <label className={`block mb-1 text-sm ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Semester
                <Select
                  value={state.semesterId}
                  onValueChange={(value) => updateState({ semesterId: value, batchId: "", sectionId: "" })}
                  disabled={state.loading || state.isAssigning || state.semesters.length === 0}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    <SelectValue placeholder={state.semesters.length === 0 ? "No semesters available" : "Select Semester"} />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                    {state.semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id} className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>
                        Semester {semester.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {(state.facultyId || (state as any).batchId || state.sectionId || state.semesterId || state.editingId) && (
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={state.loading || state.isAssigning}
                  className={theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-900 bg-white border-gray-300 hover:bg-gray-100'}
                >
                  Cancel
                </Button>

              )}
              <Button
                onClick={handleAssignFaculty}
                disabled={state.loading || state.isAssigning}
                className="bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white transition-all duration-200 ease-in-out transform hover:scale-105 shadow-md"
              >
                {(() => {
                  const loading = state.isAssigning;
                  let label = "+ Assign Faculty";
                  if (state.editingId) label = "Update Assignment";
                  if (loading) label = state.editingId ? "Updating..." : "Assigning...";
                  return loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {label}
                    </>
                  ) : label;
                })()}
              </Button>
            </div>
          </CardContent>
        </Card>

  

        <Dialog open={state.openDeleteModal} onOpenChange={(open) => updateState({ openDeleteModal: open })}>
          <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'} p-4 md:p-6 w-[92%] max-w-sm md:w-auto rounded-2xl md:rounded` }>
            <DialogHeader>
              <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Delete Assignment?</DialogTitle>
              <DialogDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>Are you sure you want to delete this assignment?</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                className={theme === 'dark' ? 'text-foreground bg-card border-border hover:bg-accent' : 'text-gray-900 bg-white border-gray-300 hover:bg-gray-100'}
                onClick={() => updateState({ openDeleteModal: false })}
                disabled={state.loading || state.isAssigning}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
                disabled={state.loading || state.isAssigning}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

export default FacultyAssignments;
