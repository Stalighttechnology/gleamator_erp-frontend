import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useClientPagination from '@/hooks/useClientPagination';
import { FileText, Download } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStudentStudyMaterials } from "@/utils/student_api";
import { SkeletonList } from "../ui/skeleton";

interface StudyMaterial {
  id: number;
  title: string;
  subject_name: string;
  subject_code: string;
  semester: string;
  batch?: string | null;
  batch_id?: string | null;
  section?: string | null;
  section_id?: string | null;
  uploaded_by: string;
  file_url: string;
  drive_web_view_link?: string | null;
}

const StudyMaterialRow = ({ material, theme }: { material: StudyMaterial; theme: string }) => (
  <div className={`grid grid-cols-3 md:grid-cols-8 gap-2 md:gap-2 items-start md:items-center text-xs md:text-sm py-3 md:py-2 px-3 md:px-0 md:border-b ${theme === 'dark' ? 'md:border-border' : 'md:border-gray-200'} last:border-b-0`}>
    <div className="hidden md:flex items-center">
      <FileText className="text-red-500" size={18} />
    </div>
    <div className="col-span-1">
      <span className={`md:hidden text-xs font-bold mr-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Title:</span>
      <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-medium cursor-pointer hover:underline truncate`}>
        {material.title}
      </div>
    </div>
    <div className="col-span-1">
      <span className={`md:hidden text-xs font-bold mr-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>Course:</span>
      <div className={`truncate`}>{material.subject_name}</div>
    </div>
    <div className="hidden md:block col-span-1 truncate">{material.batch || "N/A"}</div>
    <div className="hidden md:block col-span-1 truncate">{material.section || "N/A"}</div>
    <div className="hidden md:block col-span-1">{material.semester || "N/A"}</div>
    <div className="hidden md:block col-span-1">{material.uploaded_by}</div>
    <div className="col-span-1">
      <a href={material.file_url} download={material.title} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
        <Download className={`cursor-pointer ${theme === 'dark' ? 'text-muted-foreground hover:text-foreground' : 'text-gray-500 hover:text-gray-700'}`} size={18} />
        <span className="hidden sm:inline">Download</span>
      </a>
    </div>
  </div>
);

const StudyMaterialsStudent = () => {
  const { theme } = useTheme();
  // Student-scoped view: backend returns only the student's batch/section materials
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  // Always initialize pagination hook at top-level to preserve hook order
  const pagination = useClientPagination(materials, 10);


  const loadMaterials = async () => {
    setLoading(true);
    const resp = await getStudentStudyMaterials();
    const payload = resp?.results || resp;
    const data = payload?.data?.results || payload?.data || [];
    let items: StudyMaterial[] = [];
    if (payload && payload.success && Array.isArray(data)) {
      items = data.map((m: StudyMaterial) => ({ ...m, file_url: m.file_url }));
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((it) => (it.title || '').toLowerCase().includes(q) || (it.subject_name || '').toLowerCase().includes(q) || (it.uploaded_by || '').toLowerCase().includes(q));
    }
    setMaterials(items);
    setHasSearched(true);
    setLoading(false);
  };

  // Auto-load materials; backend keeps students scoped to their own batch and section.
  useEffect(() => {
    loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  return (
    <div className={`w-full ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
      <Card className={`${theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200'}`}>
        <CardHeader className="p-3 sm:p-4 lg:p-6 border-b">
          <h1 className={`text-lg sm:text-xl md:text-2xl font-semibold ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Study Materials</h1>
          <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}>
            Access and download study materials shared by your professors.
          </p>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 space-y-6">
          {/* Filters & Search */}
          <div className="space-y-4">
            

            <input
              type="text"
              placeholder="Search by title, course name, course code, semester, or uploaded by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}
            />
          </div>

          {/* Materials Table Section */}
          <div className="pt-4 border-t">
            <div className="hidden md:grid grid-cols-8 font-semibold text-xs sm:text-sm gap-2 mb-4 px-2">
              <div>Type</div>
              <div>Title</div>
              <div>Course</div>
              <div>Batch</div>
              <div>Section</div>
              <div>Sem</div>
              <div>Uploaded By</div>
              <div>Action</div>
            </div>
            <div className="space-y-1">
              {loading ? (
                <SkeletonList items={5} />
              ) : !hasSearched ? (
                <div className="text-center py-10 text-xs sm:text-sm text-gray-500 italic">Loading study materials.</div>
              ) : materials.length === 0 ? (
                <div className="text-center py-10 text-xs sm:text-sm text-gray-500">No study materials found for the selected criteria.</div>
              ) : (
                <>
                  {pagination.current.map((m: StudyMaterial) => <StudyMaterialRow key={m.id} material={m} theme={theme} />)}
                  {pagination.showPagination && (
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <button onClick={pagination.prev} disabled={pagination.page === 1} className="p-1 rounded-md border"><ChevronLeft className="w-4 h-4"/></button>
                      <div className="text-sm text-muted-foreground">{pagination.page} / {pagination.totalPages}</div>
                      <button onClick={pagination.next} disabled={pagination.page === pagination.totalPages} className="p-1 rounded-md border"><ChevronRight className="w-4 h-4"/></button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudyMaterialsStudent;
