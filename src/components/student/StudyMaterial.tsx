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
              placeholder="Search by title or uploaded by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-2 sm:px-3 py-2 border rounded text-xs sm:text-sm ${theme === 'dark' ? 'border-border bg-background text-foreground' : 'border-gray-300 bg-white text-gray-900'}`}
            />
          </div>

          {/* Materials Table Section */}
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
