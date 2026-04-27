import React, { useEffect, useState } from "react";
import { manageBatches } from "../../utils/admin_api";
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
import { Edit, Trash2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface Batch {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
  student_count: number;
  created_at: string;
}

interface BatchManagementProps {
  setError?: (error: string | null) => void;
  toast?: any;
}

const BatchManagement: React.FC<BatchManagementProps> = ({ setError, toast }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: "", start_year: "", end_year: "" });
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState({ start_year: "", end_year: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const { theme } = useTheme();

  const fetchBatches = async () => {
    setLoading(true);
    if (setError) setError(null);
    try {
      const res = await manageBatches();
      // Check if the response has the expected structure
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const dataSource = hasResults ? (res as any).results : (res as any);
      
      if (dataSource && dataSource.success) {
        // Handle paginated response format
        const batchesArray = dataSource.batches || [];
        if (Array.isArray(batchesArray)) {
          setBatches(batchesArray);
        } else {
          if (setError) setError("Invalid response format");
        }
      } else {
        if (setError) setError(dataSource?.message || "Failed to fetch batches");
        if (toast) {
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to fetch batches",
          });
        }
      }
    } catch (err) {
      if (setError) setError("Network error");
      if (toast) {
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBatch({ ...newBatch, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleAddBatch = async () => {
    setLoading(true);
    if (setError) setError(null);
    try {
      const res = await manageBatches(
        {
          start_year: Number(newBatch.start_year),
          end_year: Number(newBatch.end_year),
        },
        undefined,
        "POST"
      );
      // Check if the response has the expected structure
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const dataSource = hasResults ? (res as any).results : (res as any);
      
      if (dataSource && dataSource.success) {
        // ✅ Use the returned batch data instead of making extra GET call
        if (dataSource.batch) {
          const newBatchData = {
            id: dataSource.batch.id,
            name: dataSource.batch.name,
            start_year: dataSource.batch.start_year,
            end_year: dataSource.batch.end_year,
            student_count: 0, // New batch has no students yet
            created_at: dataSource.batch.created_at
          };
          setBatches(prevBatches => [...prevBatches, newBatchData]);
        } else {
          // Fallback: fetch data if batch data not returned
          fetchBatches();
        }
        setNewBatch({ name: "", start_year: "", end_year: "" });
        if (toast) {
          toast({
            title: "Success",
            description: "Batch added successfully",
          });
        }
      } else {
        if (setError) setError(dataSource?.message || "Failed to add batch");
        if (toast) {
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to add batch",
          });
        }
      }
    } catch (err) {
      if (setError) setError("Network error");
      if (toast) {
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      }
    }
    setLoading(false);
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setEditForm({
      start_year: batch.start_year.toString(),
      end_year: batch.end_year.toString(),
    });
  };

  const handleUpdateBatch = async () => {
    if (!editingBatch) return;

    setLoading(true);
    if (setError) setError(null);
    try {
      const res = await manageBatches(
        {
          start_year: Number(editForm.start_year),
          end_year: Number(editForm.end_year),
        },
        editingBatch.id,
        "PUT"
      );
      // Check if the response has the expected structure
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const dataSource = hasResults ? (res as any).results : (res as any);
      
      if (dataSource && dataSource.success) {
        // ✅ Use the returned batch data instead of making extra GET call
        if (dataSource.batch) {
          setBatches(prevBatches =>
            prevBatches.map(batch =>
              batch.id === dataSource.batch.id ? {
                ...batch,
                name: dataSource.batch.name,
                start_year: dataSource.batch.start_year,
                end_year: dataSource.batch.end_year,
                student_count: dataSource.batch.student_count || batch.student_count
              } : batch
            )
          );
        } else {
          // Fallback: fetch data if batch data not returned
          fetchBatches();
        }
        setEditingBatch(null);
        setEditForm({ start_year: "", end_year: "" });
        if (toast) {
          toast({
            title: "Success",
            description: "Batch updated successfully",
          });
        }
      } else {
        if (setError) setError(dataSource?.message || "Failed to update batch");
        if (toast) {
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to update batch",
          });
        }
      }
    } catch (err) {
      if (setError) setError("Network error");
      if (toast) {
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      }
    }
    setLoading(false);
  };

  const handleDeleteBatch = (batch: Batch) => {
    setBatchToDelete(batch);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!batchToDelete) return;

    setLoading(true);
    if (setError) setError(null);
    try {
      const res = await manageBatches(undefined, batchToDelete.id, "DELETE");
      // Check if the response has the expected structure
      const hasResults = res && typeof res === 'object' && 'results' in res;
      const dataSource = hasResults ? (res as any).results : (res as any);
      
      if (dataSource && dataSource.success) {
        fetchBatches();
        setDeleteDialogOpen(false);
        setBatchToDelete(null);
        if (toast) {
          toast({
            title: "Success",
            description: "Batch deleted successfully",
          });
        }
      } else {
        if (setError) setError(dataSource?.message || "Failed to delete batch");
        if (toast) {
          toast({
            variant: "destructive",
            title: "Error",
            description: dataSource?.message || "Failed to delete batch",
          });
        }
      }
    } catch (err) {
      if (setError) setError("Network error");
      if (toast) {
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      }
    }
    setLoading(false);
  };

  return (
    <div className={` max-w-full mx-auto ${theme === 'dark' ? 'bg-background' : 'bg-gray-50'}`}>
      {/* Add New Batch Card */}
      <Card className={theme === 'dark' ? 'bg-card border border-border shadow-sm mb-6' : 'bg-white border border-gray-200 shadow-sm mb-6'}>
        <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full">
            <CardTitle className={`block text-lg md:text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Add New Batch
            </CardTitle>
            <p className={`block text-sm md:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Create a batch with start and end years
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <Input
              name="start_year"
              type="number"
              placeholder="Start Year"
              value={newBatch.start_year}
              onChange={handleInputChange}
              className={theme === 'dark' ? 'w-full sm:w-1/3 bg-card text-foreground border border-border' : 'w-full sm:w-1/3 bg-white text-gray-900 border border-gray-300'}
            />
            <Input
              name="end_year"
              type="number"
              placeholder="End Year"
              value={newBatch.end_year}
              onChange={handleInputChange}
              className={theme === 'dark' ? 'w-full sm:w-1/3 bg-card text-foreground border border-border' : 'w-full sm:w-1/3 bg-white text-gray-900 border border-gray-300'}
            />
            <Button
              onClick={handleAddBatch}
              disabled={loading}
              className="text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white shadow-sm"
            >
              Add Batch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Batches */}
      <Card className={theme === 'dark' ? 'bg-card border border-border shadow-sm min-h-[450px]' : 'bg-white border border-gray-200 shadow-sm min-h-[450px]'}>
        <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="w-full">
            <CardTitle className={`block text-lg md:text-xl ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Existing Batches
            </CardTitle>
            <p className={`block text-sm md:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Manage, edit, or delete created batches
            </p>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto md:overflow-x-visible pb-0">
          {loading ? (
            <SkeletonTable rows={5} cols={4} />
          ) : (
            <div className="max-h-[22rem] overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-[320px] mx-auto md:max-w-none md:mx-0">
                <table className="w-full text-[11px] md:text-sm text-left border-collapse table-auto align-middle">
                  <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-card border-b border-border' : 'bg-gray-50 border-b border-gray-200'}`}>
                    <tr>
                      <th className={`py-1 px-2 md:py-2 md:px-3 text-left ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Name</th>
                      <th className={`py-1 px-2 md:py-2 md:px-3 hidden sm:table-cell ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-center`}>Start</th>
                      <th className={`py-1 px-2 md:py-2 md:px-3 hidden sm:table-cell ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-center`}>End</th>
                      <th className={`py-1 px-2 md:py-2 md:px-3 w-16 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-center`}>Students</th>
                      <th className={`py-1 px-2 md:py-2 md:px-3 w-20 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'} text-center`}>Created</th>
                      <th className={`py-1 px-2 md:py-2 md:px-3 w-20 text-right ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr
                        key={batch.id}
                        className={`border-b transition-colors duration-200 ${theme === 'dark' ? 'border-border hover:bg-accent text-foreground' : 'border-gray-200 hover:bg-gray-50 text-gray-900'}`} 
                      >
                        <td className="py-1 px-2 md:py-2 md:px-3 min-w-0 align-middle">
                          <div className="truncate">{batch.name}</div>
                        </td>
                        <td className="py-1 px-2 md:py-2 md:px-3 hidden sm:table-cell text-center align-middle">{batch.start_year}</td>
                        <td className="py-1 px-2 md:py-2 md:px-3 hidden sm:table-cell text-center align-middle">{batch.end_year}</td>
                        <td className="py-1 px-2 md:py-2 md:px-3 w-16 text-center align-middle">{batch.student_count}</td>
                        <td className="py-1 px-2 md:py-2 md:px-3 w-20 min-w-0 text-center align-middle">
                          <div className="truncate">{new Date(batch.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="py-1 px-2 md:py-2 md:px-3 w-20 text-right space-x-2 whitespace-nowrap align-middle">
                          <Button size="icon" variant="ghost" onClick={() => handleEditBatch(batch)} disabled={loading} className={theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'}>
                            <Edit className={theme === 'dark' ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-blue-600'} />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteBatch(batch)} disabled={loading} className={theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'}>
                            <Trash2 className={theme === 'dark' ? 'w-4 h-4 text-destructive' : 'w-4 h-4 text-red-600'} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          )}
        </CardContent>
      </Card>

      {/* Edit Batch Dialog */}
      <Dialog open={!!editingBatch} onOpenChange={() => setEditingBatch(null)}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[320px] w-[calc(100%-32px)] mx-4 rounded-lg` }>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Edit Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                Start Year
              </label>
              <Input
                name="start_year"
                type="number"
                value={editForm.start_year}
                onChange={handleEditInputChange}
                placeholder="Start Year"
                className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-foreground' : 'text-gray-700'}`}>
                End Year
              </label>
              <Input
                name="end_year"
                type="number"
                value={editForm.end_year}
                onChange={handleEditInputChange}
                placeholder="End Year"
                className={theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-300'}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingBatch(null)}
              className={`${theme === 'dark' ? 'text-foreground bg-card border border-border hover:bg-accent' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'} w-full sm:w-auto`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBatch}
              disabled={loading}
              className={`text-white bg-primary border-primary hover:bg-primary/90 hover:border-primary/90 hover:text-white w-full sm:w-auto`}
            >
              {loading ? "Updating..." : "Update Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[320px] w-[calc(100%-32px)] mx-4 rounded-lg` }>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Delete Batch</DialogTitle>
          </DialogHeader>
          <p className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
            Are you sure you want to delete the batch{" "}
            <span className="font-semibold">"{batchToDelete?.name}"</span>? This
            action cannot be undone.
          </p>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className={`${theme === 'dark' ? 'border-border text-foreground bg-card hover:bg-accent' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} w-full sm:w-auto`}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={loading}
              className={`${theme === 'dark' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : 'bg-red-600 hover:bg-red-700 text-white'} w-full sm:w-auto`}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchManagement;