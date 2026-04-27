import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { SkeletonTable } from "../ui/skeleton";
import { PencilIcon, TrashIcon, PlusIcon, UserPlus2Icon, FileDownIcon } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { manageBranches, manageUsers, getBranchesWithHODs } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";

interface Branch {
  id: number;
  name: string;
  branch_code: string | null;
  hod: string | null;
  hod_contact: string | null;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  mobile_number: string | null;
}

const BranchesManagement = ({ setError, toast }: { setError: (error: string | null) => void; toast: (options: any) => void }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", branch_code: "" });
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [newHodId, setNewHodId] = useState("");
  const [loading, setLoading] = useState(true);
  const normalize = (str: string) => str.toLowerCase().trim();
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getBranchesWithHODs();
        console.log("Combined Branch and HOD Response:", response);
        // Check if the response has the expected structure
        const hasResults = response && typeof response === 'object' && 'results' in response;
        const dataSource = hasResults ? (response as any).results : (response as any);

        if (dataSource && dataSource.success) {
          // Handle paginated response format
          const branchData = Array.isArray(dataSource.branches)
            ? dataSource.branches.map((b: any) => {
              // Support both compact response (hod as string + hod_contact) and full object
              let hodName: string | null = null;
              let hodContact: string | null = null;

              if (b.hod) {
                if (typeof b.hod === 'string') {
                  hodName = b.hod;
                  hodContact = b.hod_contact || null;
                } else if (typeof b.hod === 'object') {
                  hodName = `${b.hod.first_name || ''} ${b.hod.last_name || ''}`.trim() || null;
                  hodContact = b.hod.mobile_number || b.hod.email || null;
                }
              }

              return {
                id: b.id,
                name: b.name || "",
                branch_code: b.branch_code || null,
                hod: hodName,
                hod_contact: hodContact || (b.hod ? "--" : null),
              };
            })
            : [];
          setBranches(branchData);

          // Process HODs data
          const hodData = Array.isArray(dataSource.hods)
            ? dataSource.hods.map((u: any) => ({
              id: u.id,
              username: u.username,
              email: u.email,
              role: "hod",
              first_name: u.first_name,
              last_name: u.last_name,
              mobile_number: u.mobile_number,
            }))
            : [];
          setUsers(hodData);

          toast({ title: "Success", description: "Data loaded successfully" });
        } else {
          setError(dataSource?.message || "Failed to fetch branches and HODs");
          toast({ variant: "destructive", title: "Error", description: dataSource?.message || "Failed to fetch branches and HODs" });
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Network error or invalid response");
        toast({ variant: "destructive", title: "Error", description: "Network error or invalid response" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setError, toast]);

  const filteredBranches = Array.isArray(branches)
    ? branches
      .filter((branch) =>
        normalize(branch?.name || "").includes(normalize(filter))
      )
      .sort((a, b) => {
        const aName = normalize(a.name || "");
        const bName = normalize(b.name || "");
        const s = normalize(filter);

        // 1. Exact match first
        if (aName === s && bName !== s) return -1;
        if (bName === s && aName !== s) return 1;

        // 2. StartsWith gets higher priority
        const aStarts = aName.startsWith(s);
        const bStarts = bName.startsWith(s);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        // 3. Earlier occurrence of search string is better
        const aIndex = aName.indexOf(s);
        const bIndex = bName.indexOf(s);
        if (aIndex !== bIndex) return aIndex - bIndex;

        // 4. Shorter name is better
        return aName.length - bName.length;
      })
    : [];

  const unassignedHods = users.filter(
    (user) => !branches.some((b) => b.hod === `${user.first_name} ${user.last_name}`.trim())
  );

  const unassignedBranches = branches.filter((b) => !b.hod);

  const handleEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setEditData(branch);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editData) setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
    if (editData) {
      const trimmedName = editData.name.trim();
      const trimmedCode = editData.branch_code?.trim() || "";

      // ✅ Empty name check
      if (!trimmedName) {
        toast({ variant: "destructive", title: "Error", description: "Branch name is required" });
        return;
      }

      // ✅ Only letters and spaces allowed
      const validNameRegex = /^[A-Za-z\s]+$/;
      if (!validNameRegex.test(trimmedName)) {
        toast({ variant: "destructive", title: "Error", description: "Branch name must contain only letters and spaces" });
        return;
      }

      // ✅ Branch code validation (optional but if provided, must be 2-10 characters, letters/numbers)
      if (trimmedCode && (!/^[A-Za-z0-9]{2,10}$/.test(trimmedCode))) {
        toast({ variant: "destructive", title: "Error", description: "Branch code must be 2-10 characters (letters and numbers only)" });
        return;
      }

      // ✅ Prevent duplicates (excluding the current branch being edited)
      const isDuplicate = branches.some(
        (b) => b.id !== editData.id && b.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (isDuplicate) {
        toast({ variant: "destructive", title: "Error", description: "Branch already exists" });
        return;
      }

      // ✅ Prevent branch code duplicates (excluding the current branch being edited)
      if (trimmedCode) {
        const isCodeDuplicate = branches.some(
          (b) => b.id !== editData.id && b.branch_code && b.branch_code.toLowerCase() === trimmedCode.toLowerCase()
        );
        if (isCodeDuplicate) {
          toast({ variant: "destructive", title: "Error", description: "Branch code already exists" });
          return;
        }
      }

      setLoading(true);
      try {
        const response = await manageBranches(
          {
            name: trimmedName,
            branch_code: trimmedCode || null,
            hod_id: editData.hod ? users.find((u) => `${u.first_name} ${u.last_name}`.trim() === editData.hod)?.id?.toString() : null
          },
          editData.id,
          "PUT"
        );

        // Check if the response has the expected structure
        const hasResults = response && typeof response === 'object' && 'results' in response;
        const dataSource = hasResults ? (response as any).results : (response as any);

        if (dataSource && dataSource.success) {
          setBranches(branches.map((b) => (b.id === editData.id ? { ...editData, name: trimmedName, branch_code: trimmedCode || null } : b)));
          setEditingId(null);
          setEditData(null);
          toast({ title: "Success", description: "Branch updated successfully" });
        } else {
          setError(response.message || "Failed to update branch");
          toast({ variant: "destructive", title: "Error", description: response.message || "Failed to update branch" });
        }
      } catch (err) {
        setError("Network error");
        toast({ variant: "destructive", title: "Error", description: "Network error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmDelete = (id: number) => setDeleteId(id);
  const deleteBranch = async () => {
    setLoading(true);
    try {
      const response = await manageBranches(undefined, deleteId, "DELETE");
      // Check if the response has the expected structure
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);

      if (dataSource && dataSource.success) {
        setBranches(branches.filter((b) => b.id !== deleteId));
        setDeleteId(null);
        toast({ title: "Success", description: "Branch deleted successfully" });
      } else {
        setError(response.message || "Failed to delete branch");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to delete branch" });
      }
    } catch (err) {
      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async () => {
    const trimmedName = newBranch.name.trim();
    const trimmedCode = newBranch.branch_code.trim();

    // ✅ Empty or invalid branch name
    if (!trimmedName) {
      toast({ variant: "destructive", title: "Error", description: "Branch name is required" });
      return;
    }

    // ✅ Only letters and spaces allowed (e.g., "Computer Science", "ME")
    const validNameRegex = /^[A-Za-z\s]+$/;
    if (!validNameRegex.test(trimmedName)) {
      toast({ variant: "destructive", title: "Error", description: "Branch name must contain only letters and spaces" });
      return;
    }

    // ✅ Branch code validation (optional but if provided, must be 2-10 characters, letters/numbers)
    if (trimmedCode && (!/^[A-Za-z0-9]{2,10}$/.test(trimmedCode))) {
      toast({ variant: "destructive", title: "Error", description: "Branch code must be 2-10 characters (letters and numbers only)" });
      return;
    }

    // ✅ Prevent duplicates (case-insensitive)
    const isDuplicate = branches.some((b) => b.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      toast({ variant: "destructive", title: "Error", description: "Branch already exists" });
      return;
    }

    // ✅ Prevent branch code duplicates (case-insensitive)
    if (trimmedCode) {
      const isCodeDuplicate = branches.some((b) => b.branch_code && b.branch_code.toLowerCase() === trimmedCode.toLowerCase());
      if (isCodeDuplicate) {
        toast({ variant: "destructive", title: "Error", description: "Branch code already exists" });
        return;
      }
    }

    setLoading(true);
    try {
      const response = await manageBranches(
        { name: trimmedName, branch_code: trimmedCode || null },
        undefined,
        "POST"
      );
      console.log("Add Branch Response:", response);

      // Check if the response has the expected structure
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);

      if (dataSource && dataSource.success) {
        // ✅ Use the returned branch data from POST response instead of making extra GET call
        if (dataSource.branch) {
          const newBranchData = {
            id: dataSource.branch.id,
            name: dataSource.branch.name || "",
            branch_code: dataSource.branch.branch_code || null,
            hod: dataSource.branch.hod ? dataSource.branch.hod.username : null,
            hod_contact: dataSource.branch.hod ? (dataSource.branch.hod.mobile_number || dataSource.branch.hod.email || "--") : null,
          };
          setBranches(prevBranches => [...prevBranches, newBranchData]);
        } else {
          // Fallback: make GET call if branch data not returned (for backward compatibility)
          const updatedBranchResponse = await manageBranches();
          const hasUpdatedResults = updatedBranchResponse && typeof updatedBranchResponse === 'object' && 'results' in updatedBranchResponse;
          const updatedDataSource = hasUpdatedResults ? (updatedBranchResponse as any).results : (updatedBranchResponse as any);

          if (updatedDataSource && updatedDataSource.success) {
            const branchData = Array.isArray(updatedDataSource.branches)
              ? updatedDataSource.branches.map((b: any) => ({
                id: b.id,
                name: b.name || "",
                branch_code: b.branch_code || null,
                hod: b.hod ? b.hod.username : null,
                hod_contact: b.hod ? (b.hod.mobile_number || b.hod.email || "--") : null,
              }))
              : [];
            setBranches(branchData);
          }
        }
        setIsAddDialogOpen(false);
        setNewBranch({ name: "", branch_code: "" });
        toast({ title: "Success", description: "Branch added successfully" });
      } else {
        setError(response.message || "Failed to add branch");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to add branch" });
      }
    } catch (err) {
      console.error("Add Branch Error:", err);
      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignHod = async () => {
    if (!selectedBranchId) {
      toast({ variant: "destructive", title: "Error", description: "Branch selection is required" });
      return;
    }
    if (!newHodId) {
      toast({ variant: "destructive", title: "Error", description: "HOD selection is required" });
      return;
    }
    console.log("Assigning hod_id:", newHodId);
    setLoading(true);
    try {
      const response = await manageBranches(
        { hod_id: newHodId },
        selectedBranchId,
        "PUT"
      );
      // Check if the response has the expected structure
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);

      if (dataSource && dataSource.success) {
        setBranches(branches.map((b) => (b.id === selectedBranchId ? {
          ...b,
          hod: users.find((u) => u.id === Number(newHodId)) ? `${users.find((u) => u.id === Number(newHodId))!.first_name} ${users.find((u) => u.id === Number(newHodId))!.last_name}`.trim() : null,
          hod_contact: users.find((u) => u.id === Number(newHodId)) ? (users.find((u) => u.id === Number(newHodId))!.mobile_number || users.find((u) => u.id === Number(newHodId))!.email || "--") : null
        } : b)));
        setIsAssignDialogOpen(false);
        setNewHodId("");
        setSelectedBranchId(null);
        toast({ title: "Success", description: "HOD assigned successfully" });
      } else {
        setError(response.message || "Failed to assign HOD");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to assign HOD" });
      }
    } catch (err) {
      console.error("Assign HOD Error:", err);
      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Branch Management", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["ID", "Branch", "Branch Code", "Assigned HOD", "HOD Contact No"]],
      body: filteredBranches.map((branch) => [
        branch.id || "",
        branch.name || "--",
        branch.branch_code || "--",
        branch.hod || "--",
        branch.hod_contact || "--",
      ]),
    });
    doc.save("Branch_list.pdf");
  };

  if (loading) {
    return (
      <div className="p-6">
        <SkeletonTable rows={8} cols={4} />
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full max-w-[400px] sm:max-w-full text-sm sm:text-base ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'w-full bg-card border border-border' : 'w-full bg-white border border-gray-200'}>
        <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Title + paragraph always full width */}
          <div className="w-full">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight text-gray-900 mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Branch Management
            </CardTitle>
            <p className={`block text-xs md:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Manage branches and assign department heads
            </p>
          </div>

          {/* Buttons: stacked on mobile, inline on md+ (keep tablet same as large) */}
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <Button
              size="sm"
              className="flex items-center justify-center gap-1 w-full md:w-auto"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={loading}
            >
              <PlusIcon className="w-4 h-4" /> Add Branch
            </Button>

            <Button
              size="sm"
              className="flex items-center justify-center gap-1 w-full md:w-auto"
              onClick={() => setIsAssignDialogOpen(true)}
              disabled={loading}
            >
              <UserPlus2Icon className="w-4 h-4" /> Assign HOD
            </Button>

            <Button
              size="sm"
              className="flex items-center justify-center gap-1 w-full md:w-auto"
              onClick={exportToPDF}
              disabled={loading}
            >
              <FileDownIcon className="w-4 h-4" /> Export PDF
            </Button>
          </div>

        </CardHeader>
        <CardContent className="overflow-x-auto md:overflow-x-visible px-2 sm:px-4">
          <div className="pt-3 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Input
              placeholder="Search by branch name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={theme === 'dark' ? 'w-full sm:w-64 bg-card text-foreground py-1' : 'w-full sm:w-64 bg-white text-gray-900 py-1'}
            />
          </div>
          <table className="w-full text-xs md:text-base text-left table-fixed">
            <thead className={`border-b ${theme === 'dark' ? 'border-border bg-card text-foreground' : 'border-gray-200 bg-gray-100 text-gray-900'}`}>
              <tr>
                <th className="py-2 px-2 text-left">Branch</th>
                <th className="py-2 px-2 hidden sm:table-cell">Branch Code</th>
                <th className="py-2 px-2">Assigned HOD</th>
                <th className="py-2 px-2 hidden sm:table-cell">HOD Contact No</th>
                <th className="py-2 px-2 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.map((branch) => (
                <tr
                  key={branch.id}
                  className={`border-b transition-colors duration-200 ${theme === 'dark'
                    ? 'border-border hover:bg-accent text-foreground'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-900'
                    }`}
                >

                  {/* Branch Name column */}
                  <td className="py-3 pr-2">
                    {editingId === branch.id ? (
                      <Select
                        value={editData?.name || ""}
                        onValueChange={(val) => setEditData(prev => prev ? { ...prev, name: val } : null)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.name}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="break-words whitespace-normal">{branch.name}</div>
                    )}
                  </td>

                  {/* Branch Code column */}
                  <td className="py-3 pr-2 hidden sm:table-cell">
                    {editingId === branch.id ? (
                      <Input
                        name="branch_code"
                        value={editData?.branch_code || ""}
                        onChange={handleEditChange}
                        placeholder="Branch Code"
                        className={theme === 'dark' ? 'bg-card text-foreground border border-border w-full' : 'bg-white text-gray-900 border border-gray-300 w-full'}
                      />
                    ) : (
                      branch.branch_code || "--"
                    )}
                  </td>

                  {/* HOD column */}
                  <td className="py-3">
                    {editingId === branch.id ? (
                      <Select
                        value={editData?.hod || ""}
                        onValueChange={(val) => setEditData(prev => prev ? { ...prev, hod: val } : null)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select HOD" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Select HOD --</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={`${u.first_name} ${u.last_name}`.trim()}>
                              {`${u.first_name} ${u.last_name}`.trim()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="break-words whitespace-normal">{branch.hod || "--"}</div>
                    )}
                  </td>

                  {/* HOD Contact column */}
                  <td className="py-3 hidden sm:table-cell">
                    <div className="break-words whitespace-normal">{branch.hod_contact || "--"}</div>
                  </td>

                  {/* Actions column */}
                  <td className="py-3 text-right space-x-2 px-2 w-20 align-top">
                    {editingId === branch.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          disabled={loading}
                          className="px-2 py-1 text-xs"
                        >
                          {loading ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null);
                            setEditData(null);
                          }}
                          disabled={loading}
                          className={theme === 'dark' ? 'hover:bg-accent px-2 py-1 text-xs' : 'hover:bg-gray-100 px-2 py-1 text-xs'}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(branch)}
                          disabled={loading}
                          className={theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'}
                        >
                          <PencilIcon className={theme === 'dark' ? 'w-4 h-4 text-primary' : 'w-4 h-4 text-blue-600'} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(branch.id)}
                          disabled={loading}
                          className={theme === 'dark' ? 'hover:bg-accent' : 'hover:bg-gray-100'}
                        >
                          <TrashIcon className={theme === 'dark' ? 'w-4 h-4 text-destructive' : 'w-4 h-4 text-red-600'} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className={
          theme === 'dark'
            ? 'bg-card text-foreground w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
            : 'bg-white text-gray-900 w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
        }>
          <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
          <p>Are you sure you want to delete this branch? This action cannot be undone.</p>
          <DialogFooter className="flex flex-col md:flex-row md:justify-end gap-2 w-full">
            <Button
              variant="outline"
              className={theme === 'dark'
                ? 'text-foreground bg-card border border-border hover:bg-accent'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
              onClick={() => setDeleteId(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteBranch}
              disabled={loading}
              className={theme === 'dark' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : 'bg-red-600 hover:bg-red-700 text-white'}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={
          theme === 'dark'
            ? 'bg-card text-foreground w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
            : 'bg-white text-gray-900 w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
        }>
          <DialogHeader><DialogTitle>Add New Branch</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input
              className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}
              placeholder="Branch Name"
              value={newBranch.name}
              onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
            />
            <Input
              className={theme === 'dark' ? 'bg-card text-foreground' : 'bg-white text-gray-900'}
              placeholder="Branch Code (e.g., CSE, ME)"
              value={newBranch.branch_code}
              onChange={(e) => setNewBranch({ ...newBranch, branch_code: e.target.value })}
            />
          </div>
          <DialogFooter className="flex flex-col md:flex-row md:justify-end gap-2 w-full">
            <Button
              className={theme === 'dark'
                ? 'text-foreground bg-card border border-border hover:bg-accent'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBranch}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className={
          theme === 'dark'
            ? 'bg-card text-foreground w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
            : 'bg-white text-gray-900 w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
        }>
          <DialogHeader>
            <DialogTitle>Assign HOD to Branch</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Branch Dropdown */}
            <Select
              value={selectedBranchId?.toString() || ""}
              onValueChange={(val) => setSelectedBranchId(Number(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem
                    key={branch.id}
                    value={branch.id.toString()}
                  >
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* HOD Dropdown */}
            <Select
              value={newHodId}
              onValueChange={setNewHodId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select HOD" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem
                    key={user.id}
                    value={user.id.toString()}
                  >
                    {`${user.first_name} ${user.last_name}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex flex-col md:flex-row md:justify-end gap-2 w-full">
            <Button
              variant="outline"
              className={theme === 'dark'
                ? 'text-foreground bg-card border border-border hover:bg-accent'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
              onClick={() => setIsAssignDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignHod}
              disabled={loading || !selectedBranchId || !newHodId}
            >
              {loading ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchesManagement;