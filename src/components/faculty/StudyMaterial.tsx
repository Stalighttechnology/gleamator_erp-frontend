import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Download, FileText, UploadCloud, X } from "lucide-react";
import { getStudyMaterials, uploadStudyMaterial, getSections } from "../../utils/faculty_api";
import { useTheme } from "../../context/ThemeContext";
import { fetchWithTokenRefresh } from "@/utils/authService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/skeleton";

interface StudyMaterial {
  id: number;
  title: string;
  subject_name: string;
  subject_code: string;
  semester: string;
  uploaded_by: string;
  file_url: string;
  batch?: string | null;
  section?: string | null;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  batch: string;
  section: string;
}

const StudyMaterialRow = ({ material, theme }: { material: StudyMaterial; theme: string }) => (
  <div className={`grid md:grid-cols-6 gap-2 md:gap-3 items-start md:items-center text-xs sm:text-sm py-2 md:py-3 border-b md:border-b ${theme === 'dark' ? 'border-border' : 'border-gray-200'} last:border-b-0`}>
    <div className="hidden md:flex items-center">
      <FileText className="text-red-500" size={18} />
    </div>
    <div className="flex items-start gap-2 md:flex-col md:gap-0 col-span-3">
      <FileText className="text-red-500 flex-shrink-0 md:hidden" size={16} />
      <div>
        <div className="text-xs text-gray-500 md:hidden font-semibold">Title</div>
        <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-medium cursor-pointer hover:underline break-words`}>{material.title}</div>
      </div>
    </div>
    <div className="hidden md:block truncate">{material.batch || 'N/A'}</div>
    <div className="hidden md:block truncate">{material.section || 'N/A'}</div>
    <div className="flex items-start gap-2 md:flex-col md:gap-0">
      <div className="text-xs text-gray-500 md:hidden font-semibold">Uploaded</div>
      <div className="">{material.uploaded_by}</div>
    </div>
    <div className="flex items-center justify-end md:justify-center">
      <a href={material.file_url} download={material.title + '.pdf'} target="_blank" rel="noopener noreferrer">
        <Download className={`cursor-pointer text-gray-500 hover:text-gray-700 flex-shrink-0`} size={18} />
      </a>
    </div>
  </div>
);

const StudyMaterialsFaculty = () => {
  const { theme } = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("All Batches");
  const [selectedSection, setSelectedSection] = useState<string>("All Sections");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [uploadSections, setUploadSections] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBatch, setUploadBatch] = useState<string>("");
  const [uploadSection, setUploadSection] = useState<string>("");
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Load batches using stable assessment endpoint (same as AssignAssessment)
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const res = await fetchWithTokenRefresh('/api/assessment/batches/');
        if (!res.ok) {
          setBatches([]);
          return;
        }
        const json = await res.json();
        const list = json.results?.batches || json.batches || json.results || json;
        setBatches(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error loading batches', err);
        setBatches([]);
      }
    };
    loadBatches();
  }, []);

  // Load students when a batch is selected (AssignAssessment behaviour)
  useEffect(() => {
    const batchId = selectedBatch === 'All Batches' ? '' : selectedBatch;
    if (!batchId) {
      setStudents([]);
      return;
    }
    let mounted = true;
    const fetchStudents = async () => {
      try {
        const res = await fetchWithTokenRefresh(`/api/faculty/students/?batch_id=${batchId}`);
        if (!res.ok) {
          if (mounted) setStudents([]);
          return;
        }
        const json = await res.json();
        const list = json.results?.data || json.data || json.results || json || [];
        if (mounted) setStudents(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error fetching students', err);
        if (mounted) setStudents([]);
      }
    };
    fetchStudents();
    return () => { mounted = false; };
  }, [selectedBatch]);

  // Load sections when batch changes
  useEffect(() => {
    if (selectedBatch !== "All Batches") {
      const loadSections = async () => {
        const resp = await getSections(selectedBatch);
        if (resp && resp.success) {
          setSections(resp.data || []);
        } else {
          setSections([]);
        }
        setSelectedSection("All Sections");
      };
      loadSections();
    } else {
      setSections([]);
      setSelectedSection("All Sections");
    }
  }, [selectedBatch]);

  // Load sections for upload modal when uploadBatch changes
  useEffect(() => {
    if (!uploadBatch) {
      setUploadSections([]);
      setUploadSection('');
      return;
    }
    const load = async () => {
      try {
        const resp = await getSections(uploadBatch);
        if (resp && resp.success) setUploadSections(resp.data || []);
        else setUploadSections([]);
      } catch (err) {
        console.error('Error loading upload sections', err);
        setUploadSections([]);
      }
      setUploadSection('');
    };
    load();
  }, [uploadBatch]);

  const loadMaterials = async () => {
    setLoading(true);
    const batch_id = selectedBatch === 'All Batches' ? undefined : selectedBatch;
    const section_id = selectedSection === 'All Sections' ? undefined : selectedSection;
    const resp = await getStudyMaterials(batch_id, section_id, searchQuery || undefined);
    try {
      const payload = (resp && resp.success) ? (resp.data?.results || resp.data || []) : (resp?.results || resp || []);
      const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.results) ? payload.results : []);
      // Normalize each item: set subject_name to batch or null, and include batch/section
      const normalized = list.map((it: any) => ({
        id: it.id,
        title: it.title,
        // do not default subject to batch; use actual subject_name when present
        subject_name: it.subject_name || null,
        subject_code: it.subject_code || null,
        semester: it.semester || (it.semester_display || ''),
        uploaded_by: it.uploaded_by || it.uploaded_by_name || '',
        file_url: it.file || it.file_url || it.file_url_full || '',
        batch: it.batch || it.batch_name || null,
        section: it.section || it.section_name || null,
      }));
      setMaterials(normalized);
    } catch (e) {
      console.error('Error normalizing materials', e, resp);
      setMaterials([]);
    }
    setHasSearched(true);
    setLoading(false);
  };

  // Auto-load materials when batch is selected
  useEffect(() => {
    if (selectedBatch !== "All Batches") {
      loadMaterials();
    }
  }, [selectedBatch, selectedSection, searchQuery]);

  return (
    <div className={`w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader className="p-3 sm:p-4 lg:p-6 border-b">
          <div className="flex flex-row justify-between items-center gap-2 sm:gap-3">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">Study Materials</h1>
              <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
                View and upload course-related study materials for your assigned subjects.
              </p>
            </div>
            <button onClick={() => setShowUploadModal(true)} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 bg-primary text-white hover:bg-primary/90 whitespace-nowrap`}>
              <UploadCloud size={16} /> Upload
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
          {/* Filters & Search */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              <Select value={selectedBatch} onValueChange={(value) => setSelectedBatch(value)}>
                <SelectTrigger className={theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Batches">All Batches</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSection}
                onValueChange={(value) => setSelectedSection(value)}
                disabled={sections.length === 0}
              >
                <SelectTrigger className={`${sections.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Sections">All Sections</SelectItem>
                  {sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id.toString()}>{sec.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input
                type="text"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}
              />
            </div>
          </div>

          {/* Materials Table Section */}
          <div className="pt-4 border-t">
            <div className="hidden md:grid grid-cols-6 font-semibold text-xs sm:text-sm gap-2 mb-4 px-2">
              <div>Type</div>
              <div className="col-span-3">Title</div>
              <div>Batch</div>
              <div>Section</div>
              <div>Uploaded By</div>
              
            </div>
            <div className="space-y-1">
              {loading ? (
                <div className="py-4">
                  <SkeletonList items={5} />
                </div>
              ) : !hasSearched ? (
                <div className="text-center py-10 text-xs sm:text-sm text-gray-500 italic">Select a batch to view study materials.</div>
              ) : materials.length === 0 ? (
                <div className="text-center py-10 text-xs sm:text-sm text-gray-500">No study materials found for the selected criteria.</div>
              ) : (
                materials.map((m: StudyMaterial) => <StudyMaterialRow key={m.id} material={m} theme={theme} />)
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className={`p-4 sm:p-6 rounded-lg shadow-lg max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-md w-full ${theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}`}>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold">Upload Study Material</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <Select value={uploadBatch} onValueChange={setUploadBatch}>
                <SelectTrigger className={theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}>
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={uploadSection} onValueChange={setUploadSection}>
                <SelectTrigger className={theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}>
                  <SelectValue placeholder="Select Section (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">All Sections</SelectItem>
                  {uploadSections.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input
                type="text"
                placeholder="Title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className={`w-full px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}
              />
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                className={`w-full px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}
              />
              <button
                onClick={async () => {
                  if (!uploadFile || !uploadTitle || !uploadBatch) {
                    alert("Please fill all required fields");
                    return;
                  }
                  setUploading(true);
                  try {
                    // derive semester_id and branch_id from the selected batch object when available
                    const batchObj = batches.find((b: any) => String(b.id) === String(uploadBatch));
                    const semester_id = batchObj?.semester ? String(batchObj.semester) : (batchObj?.semester_id ? String(batchObj.semester_id) : undefined);
                    const branch_id = batchObj?.branch_id ? String(batchObj.branch_id) : (batchObj?.branch ? String(batchObj.branch) : undefined);

                    const resp = await uploadStudyMaterial({
                      title: uploadTitle,
                      batch_id: uploadBatch,
                      section_id: uploadSection || undefined,
                      file: uploadFile,
                      // pass through optional fields via cast
                      ...(semester_id ? { semester_id } as any : {}),
                      ...(branch_id ? { branch_id } as any : {}),
                    } as any);

                    if (resp && resp.success) {
                      alert('Uploaded successfully');
                      setShowUploadModal(false);
                      setUploadBatch('');
                      setUploadSection('');
                      setUploadTitle('');
                      setUploadFile(null);
                      // Reload materials
                      loadMaterials();
                    } else {
                      alert(resp?.message || 'Upload failed');
                    }
                  } catch (e) {
                    console.error(e);
                    alert('Upload error');
                  } finally {
                    setUploading(false);
                  }
                }}
                disabled={uploading}
                className={`w-full px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-bold text-white ${uploading ? 'bg-gray-500' : 'bg-primary hover:bg-primary/90'}`}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudyMaterialsFaculty;
