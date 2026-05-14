import React, { useEffect, useState } from "react";
import { manageBatches } from "../../utils/admin_api";
import { getSemesterBootstrap, getFacultyAssignmentsBootstrap } from "../../utils/hod_api";
import { fetchWithTokenRefresh } from "../../utils/authService";
import { API_ENDPOINT } from "../../utils/config";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { SkeletonTable } from "../ui/skeleton";
import { useToast } from "../../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Edit, Trash2, Book, Users, Check } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { Badge } from "../ui/badge";

interface Batch {
  id: number;
  name: string;
  student_count: number;
  created_at: string;
  sections?: Array<{ id: number; name: string }>;
  courses?: Array<{ id: string; name: string }>;
  faculty?: Array<{ id: string; name: string }>;
}

interface BatchManagementProps {
  setError?: (error: string | null) => void;
  toast?: any;
  viewOnly?: boolean;
}

const exportBatchesToPDF = (batches: Batch[]) => {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  script.onload = () => {
    const autoTableScript = document.createElement('script');
    autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
    autoTableScript.onload = () => {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('Batch List', 14, 15);
      doc.setFontSize(10);
      doc.text(`Exported on: ${new Date().toLocaleString('en-IN')}`, 14, 22);

      const rows = batches.map(b => [
        b.name,
        b.sections?.map(s => s.name).join(', ') || '-',
        b.faculty?.map((f: any) => f.name || `${f.first_name || ''} ${f.last_name || ''}`.trim() || '-').join(', ') || '-',
        String(b.student_count ?? 0),
      ]);

      (doc as any).autoTable({
        startY: 27,
        head: [['Batch Name', 'Sections', 'Faculty', 'Students']],
        body: rows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save('batches.pdf');
    };
    document.head.appendChild(autoTableScript);
  };
  document.head.appendChild(script);
};


const BatchManagement: React.FC<BatchManagementProps> = ({ setError, toast, viewOnly = false }) => {

  const [batches, setBatches] = useState<Batch[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBatches, setTotalBatches] = useState(0);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [newBatch, setNewBatch] = useState<{ name: string; sections: string[] }>({ name: "", sections: [] });
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    sections: string[];
    courses: string[];
    faculty: string[];
  }>({ name: "", sections: [], courses: [], faculty: [] });

  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [availableFaculty, setAvailableFaculty] = useState<Array<{ id: string; name: string }>>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);


  const { theme } = useTheme();

  const fetchBatches = async () => {
    setLoading(true);
    if (setError) setError(null);
    try {
      const res = await manageBatches({ page: currentPage, page_size: pageSize });
      // Handle paginated/responses which may be wrapped
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const dataSource = hasResults ? (res as any).results : (res as any);

      if (dataSource && dataSource.success) {
        const batchesData = dataSource.batches || [];
        setBatches(batchesData);
        // Pagination metadata
        const pagination = (hasResults ? res : dataSource) as any;
        setTotalBatches(pagination.count || 0);
        setTotalPages(Math.max(1, Math.ceil((pagination.count || 0) / pageSize)));
      }
    } catch (err) {
      if (setError) setError("Network error");
    }
    setLoading(false);
  };

  const fetchOptions = async () => {
    try {
      const [coursesRes, facultyRes] = await Promise.all([
        getSemesterBootstrap(['subjects']),
        getFacultyAssignmentsBootstrap()
      ]);

      if (coursesRes.success && coursesRes.data?.subjects) {
        setAvailableCourses(coursesRes.data.subjects.map(s => ({ id: s.id, name: s.name })));
      }
      if (facultyRes.success && facultyRes.data?.faculties) {
        setAvailableFaculty(facultyRes.data.faculties.map(f => ({
          id: f.id,
          name: `${f.first_name} ${f.last_name || ''}`.trim()
        })));
      }
    } catch (err) {
      console.error("Failed to fetch options", err);
    }
  };

  useEffect(() => {
    fetchBatches();
    if (!viewOnly) fetchOptions();
  }, [viewOnly]);

  // Refetch when page changes
  useEffect(() => {
    fetchBatches();
  }, [currentPage]);

  const handleAddBatch = async () => {

    if (!newBatch.name.trim()) {
      if (toast) toast({ variant: "destructive", title: "Error", description: "Batch name is required." });
      return;
    }

    if (newBatch.sections.length === 0) {
      if (toast) toast({ variant: "destructive", title: "Error", description: "At least one section must be selected." });
      return;
    }

    setLoading(true);
    try {
      const res = await manageBatches(
        {
          name: newBatch.name,
          sections: newBatch.sections,
        },
        undefined,
        "POST"
      );
      const dataSource = (res as any).results || res;
      if (dataSource.success) {
        fetchBatches();
        setNewBatch({ name: "", sections: [] });
        if (toast) toast({ title: "Success", description: "Batch added successfully." });
      } else {
        if (toast) toast({ variant: "destructive", title: "Error", description: dataSource.message || "Failed to add batch." });
      }
    } catch (err) {
      console.error("Error adding batch:", err);
      if (toast) toast({ variant: "destructive", title: "Error", description: "Network error or server issue." });
    }
    setLoading(false);
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setEditForm({
      name: batch.name || "",
      sections: batch.sections?.map(s => s.name) || [],
      courses: batch.courses?.map(c => c.id.toString()) || [],
      faculty: batch.faculty?.map(f => f.id.toString()) || [],
    });
  };

  const handleUpdateBatch = async () => {
    if (!editingBatch) return;
    setLoading(true);
    try {
      const res = await manageBatches(
        {
          name: editForm.name,
          sections: editForm.sections,
          courses: editForm.courses,
          faculty: editForm.faculty,
        } as any,
        editingBatch.id,
        "PUT"
      );
      const dataSource = (res as any).results || res;
      if (dataSource.success) {
        fetchBatches();
        setEditingBatch(null);
        if (toast) toast({ title: "Success", description: "Batch updated successfully" });
      } else {
        if (toast) toast({ variant: "destructive", title: "Update Failed", description: dataSource.message || "Could not update batch" });
      }
    } catch (err) {
      if (toast) toast({ variant: "destructive", title: "Error", description: "Network error" });
    }
    setLoading(false);
  };

  const toggleItem = (list: string[], item: string) => {
    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
  };

  return (
    <div className={` max-w-full mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      {!viewOnly && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Batch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                name="name"
                type="text"
                placeholder="Batch Name (e.g. Computer Science Batch)"
                value={newBatch.name}
                onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
              />
              <div className="flex flex-wrap gap-1.5 items-center p-2 border rounded-md bg-white dark:bg-gray-800 flex-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1">Sections:</span>
                {["A", "B", "C", "D", "E", "F", "G", "H"].map(sec => (
                  <Badge
                    key={sec}
                    variant={newBatch.sections.includes(sec) ? "default" : "outline"}
                    className={`cursor-pointer h-7 w-7 flex items-center justify-center p-0 text-xs transition-all ${newBatch.sections.includes(sec) ? 'bg-primary shadow-sm' : 'hover:bg-primary/5'}`}
                    onClick={() => setNewBatch({ ...newBatch, sections: toggleItem(newBatch.sections, sec) })}
                  >
                    {sec}
                  </Badge>
                ))}
              </div>
              <Button onClick={handleAddBatch} disabled={loading}>Add Batch</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="min-h-[450px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Existing Batches</CardTitle>
            {batches.length > 0 && (
              <Button
                onClick={() => exportBatchesToPDF(batches)}
                size="sm"
                className="flex items-center gap-2"
              >
                Export PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonTable rows={5} cols={5} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4">Batch Name</th>
                    <th className="py-3 px-4">Sections</th>
                    <th className="py-3 px-4">Faculty</th>
                    <th className="py-3 px-4 text-center">Students</th>
                  </tr>

                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{batch.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {batch.sections && batch.sections.length > 0 ? (
                            batch.sections.map(s => (
                              <Badge key={s.id} variant="outline" className="bg-primary/5 text-primary border-primary/20">{s.name}</Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          {batch.faculty && batch.faculty.length > 0 ? (
                            batch.faculty.map((f: any, idx: number) => {
                              const name = typeof f === 'string'
                                ? f
                                : (f.name || `${f.first_name || ''} ${f.last_name || ''}`.trim() || f.id || 'Unknown');
                              return (
                                <Badge key={idx} variant="outline" className="px-2 py-0.5 rounded-full bg-primary/5 text-primary border-primary/20">
                                  {name}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No Faculty</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">{batch.student_count}</td>
                    </tr>

                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {/* Pagination controls for batches */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-muted-foreground">Showing page {currentPage} of {totalPages} ({totalBatches} batches)</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>Prev</Button>
            <Button size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
          </div>
        </div>
      </Card>

      <Dialog open={!!editingBatch} onOpenChange={() => setEditingBatch(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Batch: {editingBatch?.name}</DialogTitle>
            <DialogDescription>
              Update the batch name, sections, courses, and faculty assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Batch Name</label>
                <Input
                  type="text"
                  placeholder="Batch Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Assign Sections</label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
                  {["A", "B", "C", "D", "E", "F", "G", "H"].map(sec => (
                    <Badge
                      key={sec}
                      variant={editForm.sections.includes(sec) ? "default" : "outline"}
                      className={`cursor-pointer px-4 py-1.5 text-sm transition-all ${editForm.sections.includes(sec) ? 'bg-primary text-white shadow-md' : 'hover:bg-primary/10'}`}
                      onClick={() => setEditForm({ ...editForm, sections: toggleItem(editForm.sections, sec) })}
                    >
                      {sec}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2 border-b pb-2">
                <Book className="w-4 h-4 text-primary" /> Assign Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg bg-muted/20">
                {availableCourses.map(course => (
                  <label key={course.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer transition-colors">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${editForm.courses.includes(course.id.toString()) ? 'bg-primary border-primary' : 'border-border'}`}
                      onClick={() => setEditForm({ ...editForm, courses: toggleItem(editForm.courses, course.id.toString()) })}
                    >
                      {editForm.courses.includes(course.id.toString()) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">{course.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold flex items-center gap-2 border-b pb-2">
                <Users className="w-4 h-4 text-primary" /> Assign Faculty
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg bg-muted/20">
                {availableFaculty.map(f => (
                  <label key={f.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer transition-colors">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${editForm.faculty.includes(f.id.toString()) ? 'bg-primary border-primary' : 'border-border'}`}
                      onClick={() => setEditForm({ ...editForm, faculty: toggleItem(editForm.faculty, f.id.toString()) })}
                    >
                      {editForm.faculty.includes(f.id.toString()) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">{f.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBatch(null)}>Cancel</Button>
            <Button onClick={handleUpdateBatch} disabled={loading}>
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
            <DialogDescription>
              This action removes the selected batch from the system.
            </DialogDescription>
          </DialogHeader>
          <p>Are you sure you want to delete <span className="font-bold">{batchToDelete?.name}</span>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              setLoading(true);
              const res = await manageBatches(undefined, batchToDelete?.id, "DELETE");
              if ((res as any).success || (res as any).results?.success) {
                fetchBatches();
                setDeleteDialogOpen(false);
                if (toast) toast({ title: "Success", description: "Batch deleted" });
              }
              setLoading(false);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default BatchManagement;
