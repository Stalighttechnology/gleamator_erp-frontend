import React, { useEffect, useState } from "react";
import { manageBatches } from "../../utils/admin_api";
import { getSemesterBootstrap, getFacultyAssignmentsBootstrap } from "../../utils/hod_api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { SkeletonTable } from "../ui/skeleton";
import { useToast } from "../../hooks/use-toast";
import {
  Dialog,
  DialogContent,
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
  start_year: number;
  end_year: number;
  student_count: number;
  created_at: string;
  courses?: Array<{ id: string; name: string }>;
  faculty?: Array<{ id: string; name: string }>;
}

interface BatchManagementProps {
  setError?: (error: string | null) => void;
  toast?: any;
  viewOnly?: boolean;
}

const BatchManagement: React.FC<BatchManagementProps> = ({ setError, toast, viewOnly = false }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: "", start_year: "", end_year: "" });
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState<{
    start_year: string;
    end_year: string;
    courses: string[];
    faculty: string[];
  }>({ start_year: "", end_year: "", courses: [], faculty: [] });
  
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [availableFaculty, setAvailableFaculty] = useState<Array<{ id: string; name: string }>>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const { theme } = useTheme();

  const fetchBatches = async () => {
    setLoading(true);
    if (setError) setError(null);
    try {
      const res = await manageBatches();
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const dataSource = hasResults ? (res as any).results : (res as any);
      
      if (dataSource && dataSource.success) {
        setBatches(dataSource.batches || []);
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
          name: `${f.first_name} ${f.last_name || ''}`.strip() 
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

  const handleAddBatch = async () => {
    setLoading(true);
    try {
      const res = await manageBatches(
        {
          start_year: Number(newBatch.start_year),
          end_year: Number(newBatch.end_year),
        },
        undefined,
        "POST"
      );
      const dataSource = (res as any).results || res;
      if (dataSource.success) {
        fetchBatches();
        setNewBatch({ name: "", start_year: "", end_year: "" });
        if (toast) toast({ title: "Success", description: "Batch added successfully" });
      }
    } catch (err) {
      if (toast) toast({ variant: "destructive", title: "Error", description: "Network error" });
    }
    setLoading(false);
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setEditForm({
      start_year: batch.start_year.toString(),
      end_year: batch.end_year.toString(),
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
          start_year: Number(editForm.start_year),
          end_year: Number(editForm.end_year),
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
                name="start_year"
                type="number"
                placeholder="Start Year"
                value={newBatch.start_year}
                onChange={(e) => setNewBatch({ ...newBatch, start_year: e.target.value })}
              />
              <Input
                name="end_year"
                type="number"
                placeholder="End Year"
                value={newBatch.end_year}
                onChange={(e) => setNewBatch({ ...newBatch, end_year: e.target.value })}
              />
              <Button onClick={handleAddBatch} disabled={loading}>Add Batch</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="min-h-[450px]">
        <CardHeader>
          <CardTitle>Existing Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonTable rows={5} cols={5} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Assignments</th>
                    <th className="py-3 px-4 text-center">Students</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{batch.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {batch.courses && batch.courses.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Book className="w-3 h-3" /> {batch.courses.length} Courses
                            </Badge>
                          )}
                          {batch.faculty && batch.faculty.length > 0 && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {batch.faculty.length} Faculty
                            </Badge>
                          )}
                          {(!batch.courses?.length && !batch.faculty?.length) && (
                            <span className="text-xs text-muted-foreground italic">No assignments</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">{batch.student_count}</td>
                      <td className="py-3 px-4 text-right">
                        {!viewOnly && (
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEditBatch(batch)}>
                              <Edit className="w-4 h-4 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setBatchToDelete(batch); setDeleteDialogOpen(true); }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingBatch} onOpenChange={() => setEditingBatch(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Batch: {editingBatch?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Year</label>
                <Input
                  type="number"
                  value={editForm.start_year}
                  onChange={(e) => setEditForm({ ...editForm, start_year: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Year</label>
                <Input
                  type="number"
                  value={editForm.end_year}
                  onChange={(e) => setEditForm({ ...editForm, end_year: e.target.value })}
                />
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