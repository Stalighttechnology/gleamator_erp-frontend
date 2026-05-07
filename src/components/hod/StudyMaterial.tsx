import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Download, FileText, UploadCloud, X } from "lucide-react";
import { uploadStudyMaterial, getStudyMaterials, getHODStudentBootstrap } from "../../utils/hod_api";
import { useTheme } from "../../context/ThemeContext";
import { SkeletonList } from "../ui/skeleton";
import { useToast } from "../ui/use-toast";

// Interface for display study material
interface StudyMaterial {
  id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  branch: string | null;
  branch_id?: string | null;
  batch?: string | null;
  batch_id?: string | null;
  uploaded_by: string;
  uploaded_at: string;
  file_url: string;
  section?: string | null;
  section_id?: string | null;
}

// Hook for managing study materials (loads by branch/semester/section)
const useStudyMaterials = (
  batchFilter: string,
  sectionFilter: string,
  sectionsLoaded: boolean,
  refreshKey: number
) => {
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      // Only fetch when batch and section are explicitly selected
      // and after page sections have finished loading (so section options are available)
      if (batchFilter === 'All Batches' || sectionFilter === 'All Sections' || !sectionsLoaded) {
        setStudyMaterials([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const batch = batchFilter === 'All Batches' ? undefined : batchFilter;
        const sec = sectionFilter === 'All Sections' ? undefined : sectionFilter;
        // Branch and semester are derived by backend from batch_id; pass only section and batch
        const resp = await getStudyMaterials(undefined, undefined, sec, batch);
        const payload = (resp as any)?.results || resp;
        if (payload && payload.success && Array.isArray(payload.data)) {
          const mapped = payload.data.map((m: any) => ({
            id: m.id,
            title: m.title,
            subject_name: m.subject_name,
            subject_code: m.subject_code,
            branch: m.branch || null,
            branch_id: m.branch_id || null,
            batch: m.batch || null,
            batch_id: m.batch_id || null,
            section: m.section || null,
            section_id: m.section_id || null,
            uploaded_by: m.uploaded_by || '',
            uploaded_at: m.uploaded_at || '',
            file_url: m.file_url || m.drive_web_view_link,
          }));
          setStudyMaterials(mapped);
        } else {
          setStudyMaterials([]);
        }
      } catch (error) {
        console.error("Error fetching study materials:", error);
        setStudyMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [batchFilter, sectionFilter, sectionsLoaded, refreshKey]);

  return { studyMaterials, loading };
};

// Hook for managing upload modal
const useUploadModal = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [batchId, setBatchId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [uploading, setUploading] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setBatchId("");
    setSectionId("");
    setDragActive(false);
  };

  return {
    showUploadModal,
    setShowUploadModal,
    file,
    title,
    batchId,
    sectionId,
    uploading,
    setUploading,
    handleFileChange,
    handleDrag,
    handleDrop,
    dragActive,
    setFile,
    setTitle,
    setBatchId,
    setSectionId,
    resetForm,
  };
};

// Row component for each study material
const StudyMaterialRow = ({ material, theme }: { material: StudyMaterial; theme: string }) => (
  <div
    className={`grid grid-cols-12 items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 mb-2 ${
      theme === "dark"
        ? "border-border bg-card hover:bg-muted/40"
        : "border-gray-200 bg-white hover:bg-gray-50"
    }`}
  >
    <div className="col-span-1 flex justify-center">
      <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/30">
        <FileText className="text-red-500" size={18} />
      </div>
    </div>
    <div className="col-span-4 min-w-0">
      <div className="font-semibold text-sm truncate text-blue-600 dark:text-blue-400">
        {material.title}
      </div>
      <div className="text-xs text-muted-foreground truncate mt-0.5">
        {material.subject_name || "No Subject"}
      </div>
    </div>
    <div className="col-span-2">
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
        {material.batch || "N/A"}
      </span>
    </div>
    <div className="col-span-1">
      <span className="text-sm font-medium">
        {material.section || "-"}
      </span>
    </div>
    <div className="col-span-2">
      <div className="text-sm font-medium truncate">
        {material.uploaded_by || "Unknown"}
      </div>
    </div>
    <div className="col-span-2 flex justify-end">
      <a
        href={material.file_url}
        download
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium"
      >
        <Download size={16} />
        Download
      </a>
    </div>
  </div>
);

// Main component
const StudyMaterials = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("All Batches");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("All Sections");
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string; batch_id?: string | null; semester_id?: string | null }>>([]);
  const [pageSectionsLoaded, setPageSectionsLoaded] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Modal-specific lists
  const [modalSections, setModalSections] = useState<Array<{ id: string; name: string; batch_id?: string | null; semester_id?: string | null }>>([]);
  

  // Pass null when 'All Branches' to hook; but hook expects branch id, so use null to represent none
  const [searchQuery, setSearchQuery] = useState("");

  // Pass null when 'All Branches' to hook; but hook expects branch id, so use null to represent none
  const { studyMaterials, loading } = useStudyMaterials(selectedBatchFilter, selectedSectionFilter, pageSectionsLoaded, refreshKey);
  const {
    showUploadModal,
    setShowUploadModal,
    file,
    title,
    batchId,
    sectionId,
    uploading,
    setUploading,
    handleFileChange,
    handleDrag,
    handleDrop,
    dragActive,
    setFile,
    setTitle,
    setBatchId,
    setSectionId,
    resetForm,
  } = useUploadModal();

  

  // Load branches on mount
  useEffect(() => {
    const load = async () => {
      try {
        const boot = await getHODStudentBootstrap(['profile', 'batches', 'sections']);
        if (boot?.success) {
          setBatches(Array.isArray(boot.data?.batches) ? boot.data.batches.map((b: any) => ({ id: String(b.id), name: b.name })) : []);
          const bootSections = Array.isArray(boot.data?.sections)
            ? boot.data.sections.map((s: any) => ({
                id: String(s.id),
                name: s.name,
                batch_id: s.batch_id ? String(s.batch_id) : null,
                semester_id: s.semester_id ? String(s.semester_id) : null,
              }))
            : [];
          setSections(bootSections);
          setModalSections(bootSections);
          setPageSectionsLoaded(true);
        }
      } catch (e) {
        console.error("Failed to load batches/sections", e);
        setPageSectionsLoaded(true);
      }
    };
    load();
  }, []);
  // Recompute available page sections when batch filter changes
  useEffect(() => {
    const loadSections = async () => {
      setPageSectionsLoaded(false);
      setSelectedSectionFilter("All Sections");
      setPageSectionsLoaded(true);
    };
    loadSections();
  }, [selectedBatchFilter]);

  // modal subjects/semesters removed — upload modal uses batch -> section only

  const pageSectionOptions = sections.filter((s) => {
    const matchesBatch = selectedBatchFilter === "All Batches" || String(s.batch_id || "") === selectedBatchFilter;
    return matchesBatch;
  });

  const modalSectionOptions = modalSections.filter((s) => {
    const matchesBatch = !batchId || String(s.batch_id || "") === batchId;
    return matchesBatch;
  });

  const handleUpload = async () => {
    if (!file || !title) {
      toast({ variant: "destructive", title: "Missing details", description: "Please provide a title and select a file." });
      return;
    }

    if (!batchId || !sectionId) {
      toast({ variant: "destructive", title: "Missing details", description: "Please select batch and section." });
      return;
    }

    // Validate file size <= 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({ variant: "destructive", title: "File too large", description: "File size must not exceed 50MB." });
      return;
    }

    setUploading(true);
    try {
      const response = await uploadStudyMaterial({
        title,
        batch_id: batchId,
        section_id: sectionId,
        file,
      } as any);

      if (response.success && response.data) {
        resetForm();
        setShowUploadModal(false);
        setRefreshKey((key) => key + 1);
        toast({ title: "Success", description: "Study material uploaded successfully." });
      } else {
        toast({ variant: "destructive", title: "Upload failed", description: response.message || "Upload failed" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Upload failed", description: "Error uploading material" });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Filter materials: search by title, batch, section, uploaded_by; filter by batch/section only
  const filteredMaterials = studyMaterials.filter((material) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (material.title || "").toLowerCase().includes(q) ||
      (material.batch || "").toLowerCase().includes(q) ||
      (material.section || "").toLowerCase().includes(q) ||
      (material.uploaded_by || "").toLowerCase().includes(q);
    const matchesBatch = selectedBatchFilter === "All Batches" || material.batch_id === selectedBatchFilter;
    const matchesSection = selectedSectionFilter === "All Sections" || (material as any).section_id === selectedSectionFilter;
    return matchesSearch && matchesBatch && matchesSection;
  });

  return (
    <div className="w-full mx-auto max-w-none">
      <Card className={`shadow-lg ${theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white border-gray-200 text-gray-900'}`}>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center gap-2">
            <CardTitle className="text-2xl font-semibold leading-none tracking-tight">Study Materials</CardTitle>
            <Button
              onClick={() => setShowUploadModal(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-all duration-200 ease-in-out transform hover:scale-105 bg-primary text-white border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white ${theme === 'dark' ? 'shadow-lg shadow-primary/20' : 'shadow-md'}`}
              disabled={uploading}
            >
              <UploadCloud size={16} />
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <input
                type="text"
                placeholder="Search by title, batch, section, or uploaded by..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-3 py-2 rounded outline-none focus:ring-2 border ${theme === 'dark' ? 'bg-background text-foreground border-border focus:ring-primary' : 'bg-white text-gray-900 border-gray-300 focus:ring-blue-500'}`}
              />
            </div>

            <div>
              <Select
                value={selectedBatchFilter}
                onValueChange={(value) => {
                  setSelectedBatchFilter(value);
                  setSelectedSectionFilter("All Sections");
                }}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="All Batches">All Batches</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={selectedSectionFilter}
                onValueChange={(value) => setSelectedSectionFilter(value)}
              >
                <SelectTrigger className={`w-full ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-background text-foreground border-border' : 'bg-white text-gray-900 border-gray-300'}>
                  <SelectItem value="All Sections">All Sections</SelectItem>
                  {pageSectionOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Area */}
          <div className="pt-4 border-t">
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b mb-3">
              <div className="col-span-1 text-center">Type</div>
              <div className="col-span-4">Title</div>
              <div className="col-span-2">Batch</div>
              <div className="col-span-1">Section</div>
              <div className="col-span-2">Uploaded By</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="py-8">
                  <SkeletonList items={5} />
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No study materials found.
                </div>
              ) : (
                filteredMaterials.map((material) => (
                  <StudyMaterialRow key={material.id} material={material} theme={theme} />
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showUploadModal} onOpenChange={(open) => {
        if (!uploading) {
          setShowUploadModal(open);
          if (!open) resetForm();
        }
      }}>
        <DialogContent className={`w-[92%] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Upload Study Material</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Side: Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="material-title">Material Title *</Label>
                <Input
                  id="material-title"
                  placeholder="Enter title (e.g. Unit 1 Notes)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}
                  disabled={uploading}
                />
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch *</Label>
                    <Select
                      value={batchId}
                      onValueChange={(value) => {
                        setBatchId(value);
                        setSectionId("");
                      }}
                      disabled={uploading}
                    >
                      <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                        <SelectValue placeholder="Select Batch" />
                      </SelectTrigger>
                      <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Section *</Label>
                    <Select
                      value={sectionId}
                      onValueChange={(value) => setSectionId(value)}
                      disabled={uploading || !batchId}
                    >
                      <SelectTrigger className={theme === 'dark' ? 'bg-background border-border' : 'bg-white border-gray-300'}>
                        <SelectValue placeholder="Select Section" />
                      </SelectTrigger>
                      <SelectContent className={theme === 'dark' ? 'bg-card border-border text-foreground' : 'bg-white text-gray-900'}>
                        {modalSectionOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            Sec {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Course/Subject removed — upload requires only Batch and Section */}
            </div>

            {/* Right Side: Upload Area */}
            <div className="space-y-4">
              <Label>File Upload *</Label>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                  ${dragActive 
                    ? 'border-primary bg-primary/10 scale-[1.02]' 
                    : theme === 'dark' ? 'border-border bg-background/50' : 'border-gray-300 bg-gray-50'
                  }
                  ${file ? 'border-green-500 bg-green-500/5' : ''}
                `}
              >
                <UploadCloud 
                  className={`mx-auto mb-4 ${file ? 'text-green-500' : theme === 'dark' ? 'text-muted-foreground' : 'text-gray-400'}`} 
                  size={48} 
                />
                
                {file ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium truncate px-4">{file.name}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X size={16} className="mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-1">Drag & drop your file here</p>
                    <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      PDF, JPG, PNG or JPEG (Max 50MB)
                    </p>
                    <input
                      type="file"
                      id="study-material-file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('study-material-file')?.click()}
                      className="bg-primary text-white border-primary hover:bg-primary/90 hover:text-white"
                    >
                      Select File
                    </Button>
                  </>
                )}
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Instructions</p>
                <ul className={`text-[11px] list-disc pl-4 space-y-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  <li>Select the correct Batch and Section.</li>
                  <li>Title should be descriptive (e.g., "Unit 1 - Calculus Notes").</li>
                  <li>Ensure the file is clear and readable.</li>
                  <li>Maximum file size allowed is 50MB.</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
              disabled={uploading}
              className={theme === 'dark' ? 'border-border' : 'border-gray-300'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !title || !batchId || !sectionId}
              className="bg-primary text-white hover:bg-primary/90 min-w-[120px]"
            >
              {uploading ? (
                <>
                  <span className="animate-spin mr-2">◌</span>
                  Uploading...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudyMaterials;
