import { useState, useEffect, useCallback } from "react";
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
import { PencilIcon, TrashIcon, PlusIcon, UserPlus2Icon, FileDownIcon, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { manageBranches, getBranchesWithHODs, assignMis, clearMis, manageUsers } from "../../utils/admin_api";
import { useToast } from "../../hooks/use-toast";
import { useTheme } from "../../context/ThemeContext";

interface Branch {
  id: number;
  name: string;
  branch_code: string | null;
  hod: string | null;
  hod_contact: string | null;
  mis?: string[];
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
  const [users, setUsers] = useState<User[]>([]); // Counselors ONLY
  const [misUsers, setMisUsers] = useState<User[]>([]); // MIS ONLY
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: "", branch_code: "" });
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAssignMisDialogOpen, setIsAssignMisDialogOpen] = useState(false);
  const [selectedHodBranchId, setSelectedHodBranchId] = useState<number | null>(null);
  const [newHodId, setNewHodId] = useState("");
  const [selectedMisBranchId, setSelectedMisBranchId] = useState<number | null>(null);
  const [selectedMisId, setSelectedMisId] = useState("");
  const [loading, setLoading] = useState(true);
  const normalize = (str: string) => str.toLowerCase().trim();
  const { theme } = useTheme();

  const unwrapPaginatedPayload = (response: any) => {
    if (
      response &&
      typeof response === "object" &&
      "results" in response &&
      response.results &&
      !Array.isArray(response.results)
    ) {
      return response.results;
    }
    return response;
  };

  const extractUsersFromResponse = (response: any) => {
    const payload = unwrapPaginatedPayload(response);

    if (Array.isArray(payload?.users)) return payload.users;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload)) return payload;

    return [];
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getBranchesWithHODs();
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);

      console.debug('getBranchesWithHODs response.hods:', dataSource?.hods);

      if (dataSource && dataSource.success) {
        const branchData = Array.isArray(dataSource.branches)
          ? dataSource.branches.map((b: any) => {
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

            // Use backend MIS list directly
            let misList: string[] = [];
            if (Array.isArray(b.mis)) {
              misList = b.mis.map((m: any) => {
                if (typeof m === 'string') return m;
                return `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username || m.email || '';
              }).filter(Boolean);
            }

            return {
              id: b.id,
              name: b.name || "",
              branch_code: b.branch_code || null,
              hod: hodName,
              hod_contact: hodContact || (b.hod ? "--" : null),
              mis: misList,
            };
          })
          : [];
        setBranches(branchData);

        // Process HODs ONLY (role === 'hod')
        const hodData = Array.isArray(dataSource.hods)
          ? dataSource.hods.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: (u.role || 'hod').toLowerCase(),
            first_name: u.first_name,
            last_name: u.last_name,
            mobile_number: u.mobile_number,
          }))
          : [];
        const counselorList = hodData.filter((u: any) => (u.role || '').toLowerCase() === 'hod');
        setUsers(counselorList);
        // Also set MIS users from dedicated mis_all payload if present, otherwise from hods
        const misFromAll = Array.isArray((dataSource as any).mis_all) ? (dataSource as any).mis_all : [];
        if (misFromAll.length) {
          const mappedMis = misFromAll.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: 'mis',
            first_name: u.first_name,
            last_name: u.last_name,
            mobile_number: u.mobile_number || null,
          }));
          setMisUsers(mappedMis);
        } else {
          const misFromHods = hodData.filter((u: any) => (u.role || '').toLowerCase() === 'mis');
          setMisUsers(misFromHods);
        }

        toast({ title: "Success", description: "Data loaded successfully" });
      } else {
        setError(dataSource?.message || "Failed to fetch branches and Counselor");
        toast({ variant: "destructive", title: "Error", description: dataSource?.message || "Failed to fetch branches and Counselor" });
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Network error or invalid response");
      toast({ variant: "destructive", title: "Error", description: "Network error or invalid response" });
    } finally {
      setLoading(false);
    }
  }, [setError, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('branches:updated', handler);
    return () => window.removeEventListener('branches:updated', handler);
  }, [fetchData]);

  // Load MIS users when dialog opens
  const loadMisUsers = async () => {
    setMisUsers([]);
    try {
      const res = await manageUsers({ role: 'mis', page_size: 1000 });
      console.debug('manageUsers(mis) response:', res);

      const misList = extractUsersFromResponse(res);
      
      const mapped = misList.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: (u.role || 'mis').toLowerCase(),
        first_name: u.first_name,
        last_name: u.last_name,
        mobile_number: u.mobile_number,
      }));
      setMisUsers(mapped);
    } catch (e: any) {
      console.warn('Failed to load MIS list', e);
      if (e && e.message && e.message.toLowerCase().includes('401')) {
        toast({ variant: 'destructive', title: 'Unauthorized', description: 'Session expired. Please login again.' });
      }
    }
  };

  useEffect(() => {
    if (isAssignMisDialogOpen) loadMisUsers();
  }, [isAssignMisDialogOpen]);

  const filteredBranches = Array.isArray(branches)
    ? branches
      .filter((branch) => normalize(branch?.name || "").includes(normalize(filter)))
      .sort((a, b) => {
        const aName = normalize(a.name || "");
        const bName = normalize(b.name || "");
        const s = normalize(filter);

        if (aName === s && bName !== s) return -1;
        if (bName === s && aName !== s) return 1;

        const aStarts = aName.startsWith(s);
        const bStarts = bName.startsWith(s);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        const aIndex = aName.indexOf(s);
        const bIndex = bName.indexOf(s);
        if (aIndex !== bIndex) return aIndex - bIndex;

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

      if (!trimmedName) {
        toast({ variant: "destructive", title: "Error", description: "Branch name is required" });
        return;
      }

      const validNameRegex = /^[A-Za-z\s]+$/;
      if (!validNameRegex.test(trimmedName)) {
        toast({ variant: "destructive", title: "Error", description: "Branch name must contain only letters and spaces" });
        return;
      }

      if (trimmedCode && (!/^[A-Za-z0-9]{2,10}$/.test(trimmedCode))) {
        toast({ variant: "destructive", title: "Error", description: "Branch code must be 2-10 characters (letters and numbers only)" });
        return;
      }

      const isDuplicate = branches.some(
        (b) => b.id !== editData.id && b.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (isDuplicate) {
        toast({ variant: "destructive", title: "Error", description: "Branch already exists" });
        return;
      }

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
          ({ name: trimmedName, branch_code: trimmedCode || null } as any),
          editData.id,
          "PUT"
        );

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

    if (!trimmedName) {
      toast({ variant: "destructive", title: "Error", description: "Branch name is required" });
      return;
    }

    const validNameRegex = /^[A-Za-z\s]+$/;
    if (!validNameRegex.test(trimmedName)) {
      toast({ variant: "destructive", title: "Error", description: "Branch name must contain only letters and spaces" });
      return;
    }

    if (trimmedCode && (!/^[A-Za-z0-9]{2,10}$/.test(trimmedCode))) {
      toast({ variant: "destructive", title: "Error", description: "Branch code must be 2-10 characters (letters and numbers only)" });
      return;
    }

    const isDuplicate = branches.some((b) => b.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      toast({ variant: "destructive", title: "Error", description: "Branch already exists" });
      return;
    }

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
        ({ name: trimmedName, branch_code: trimmedCode || null } as any),
        undefined,
        "POST"
      );

      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);

      if (dataSource && dataSource.success) {
        if (dataSource.branch) {
          const newBranchData = {
            id: dataSource.branch.id,
            name: dataSource.branch.name || "",
            branch_code: dataSource.branch.branch_code || null,
            hod: dataSource.branch.hod ? dataSource.branch.hod.username : null,
            hod_contact: dataSource.branch.hod ? (dataSource.branch.hod.mobile_number || dataSource.branch.hod.email || "--") : null,
            mis: [],
          };
          setBranches(prevBranches => [...prevBranches, newBranchData]);
        } else {
          await fetchData();
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
    if (!selectedHodBranchId) {
      toast({ variant: "destructive", title: "Error", description: "Branch selection is required" });
      return;
    }
    if (!newHodId) {
      toast({ variant: "destructive", title: "Error", description: "Counselor selection is required" });
      return;
    }
    
    setLoading(true);
    try {
      // ONLY send hod_id - never touch MIS
      const response = await manageBranches(
        ({ hod_id: newHodId } as any),
        selectedHodBranchId,
        "PUT"
      );
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);

      if (dataSource && dataSource.success) {
        setBranches(branches.map((b) => {
          if (b.id === selectedHodBranchId) {
            const selectedUser = users.find((u) => u.id === Number(newHodId));
            return {
              ...b,
              hod: selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}`.trim() : null,
              hod_contact: selectedUser ? (selectedUser.mobile_number || selectedUser.email || "--") : null
            };
          }
          return b;
        }));
        setIsAssignDialogOpen(false);
        setNewHodId("");
        setSelectedHodBranchId(null);
        toast({ title: "Success", description: "Counselor assigned successfully" });
      } else {
        const msg = response.message || "Failed to assign Counselor";
        if (msg.toLowerCase().includes('conslore') || msg.toLowerCase().includes('already exists for this branch')) {
          toast({ variant: "destructive", title: "Error", description: "A Counselor already exists for this branch." });
        } else {
          setError(msg);
          toast({ variant: "destructive", title: "Error", description: msg });
        }
      }
    } catch (err) {
      console.error("Assign Counselor Error:", err);
      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMis = async () => {
    if (!selectedMisBranchId) {
      toast({ variant: "destructive", title: "Error", description: "Branch selection is required" });
      return;
    }
    if (!selectedMisId) {
      toast({ variant: "destructive", title: "Error", description: "MIS selection is required" });
      return;
    }

    setLoading(true);
    try {
      const response = await assignMis(Number(selectedMisId), Number(selectedMisBranchId));
      if (response && response.success) {
        await fetchData();
        setIsAssignMisDialogOpen(false);
        setSelectedMisId("");
        setSelectedMisBranchId(null);
        try { window.dispatchEvent(new Event('branches:updated')); } catch (e) { }
        toast({ title: "Success", description: "MIS assigned successfully" });
      } else {
        setError(response.message || "Failed to assign MIS");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to assign MIS" });
      }
    } catch (err) {
      console.error("Assign MIS Error:", err);
      setError("Network error");
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHod = async (branchId: number) => {
    setLoading(true);
    try {
      const response = await manageBranches(({ hod_id: null } as any), branchId, "PUT");
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);
      if (dataSource && dataSource.success) {
        await fetchData();
        toast({ title: "Success", description: "Counselor removed" });
      } else {
        setError(response.message || "Failed to remove Counselor");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to remove Counselor" });
      }
    } catch (err) {
      console.error('Remove Counselor error', err);
      setError('Network error');
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleClearMis = async (branchId: number) => {
    setLoading(true);
    try {
      const response = await clearMis(branchId);
      const hasResults = response && typeof response === 'object' && 'results' in response;
      const dataSource = hasResults ? (response as any).results : (response as any);
      if (dataSource && dataSource.success) {
        await fetchData();
        toast({ title: "Success", description: "MIS cleared for branch" });
      } else {
        setError(response.message || "Failed to clear MIS");
        toast({ variant: "destructive", title: "Error", description: response.message || "Failed to clear MIS" });
      }
    } catch (err) {
      console.error('Clear MIS error', err);
      setError('Network error');
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
      head: [["ID", "Branch", "Branch Code", "Assigned Counselor", "MIS", "Counselor Contact No"]],
      body: filteredBranches.map((branch) => [
        branch.id || "",
        branch.name || "--",
        branch.branch_code || "--",
        branch.hod || "--",
        branch.mis && branch.mis.length ? branch.mis.join(', ') : "--",
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
          <div className="w-full">
            <CardTitle className={`text-2xl font-semibold leading-none tracking-tight mb-2 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
              Branch Management
            </CardTitle>
            <p className={`block text-xs md:text-base ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
              Manage branches and assign department heads
            </p>
          </div>

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
              onClick={() => { setIsAssignDialogOpen(true); setSelectedHodBranchId(null); setNewHodId(""); }}
              disabled={loading || unassignedBranches.length === 0 || unassignedHods.length === 0}
            >
              <UserPlus2Icon className="w-4 h-4" /> Assign Counselor
            </Button>

            <Button
              size="sm"
              className="flex items-center justify-center gap-1 w-full md:w-auto"
              onClick={() => { setIsAssignMisDialogOpen(true); setSelectedMisBranchId(null); setSelectedMisId(""); loadMisUsers(); }}
              disabled={loading}
            >
              <UserPlus2Icon className="w-4 h-4" /> Assign MIS
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
                <th className="py-2 px-2">Assigned Counselor</th>
                <th className="py-2 px-2 hidden sm:table-cell">MIS</th>
                <th className="py-2 px-2 hidden sm:table-cell">Counselor Contact No</th>
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
                  <td className="py-3 pr-2">
                    {editingId === branch.id ? (
                      <Input
                        name="name"
                        value={editData?.name || ""}
                        onChange={handleEditChange}
                        placeholder="Branch Name"
                        className={theme === 'dark' ? 'bg-card text-foreground border border-border w-full' : 'bg-white text-gray-900 border border-gray-300 w-full'}
                      />
                    ) : (
                      <div className="break-words whitespace-normal">{branch.name}</div>
                    )}
                  </td>

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

                  <td className="py-3">
                    {editingId === branch.id ? (
                      <div className="flex items-center gap-2">
                        <div className="break-words whitespace-normal">{branch.hod || "--"}</div>
                        {branch.hod ? (
                          <Button size="icon" variant="ghost" onClick={() => handleRemoveHod(branch.id)} disabled={loading} className="p-1">
                            <X className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="break-words whitespace-normal">{branch.hod || "--"}</div>
                    )}
                  </td>

                  <td className="py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="break-words whitespace-normal">{branch.mis && branch.mis.length > 0 ? branch.mis.join(', ') : "--"}</div>
                      {editingId === branch.id && branch.mis && branch.mis.length > 0 ? (
                        <Button size="sm" variant="outline" onClick={() => handleClearMis(branch.id)} disabled={loading}>
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </td>

                  <td className="py-3 hidden sm:table-cell">
                    <div className="break-words whitespace-normal">{branch.hod_contact || "--"}</div>
                  </td>

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

      {/* Delete Dialog */}
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

      {/* Add Branch Dialog */}
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
              placeholder="Branch Code"
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

      {/* Assign Counselor Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className={
          theme === 'dark'
            ? 'bg-card text-foreground w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
            : 'bg-white text-gray-900 w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
        }>
          <DialogHeader>
            <DialogTitle>Assign Counselor to Branch</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Select
              value={selectedHodBranchId?.toString() || ""}
              onValueChange={(val) => setSelectedHodBranchId(Number(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {unassignedBranches.length ? unassignedBranches.map((branch) => (
                  <SelectItem
                    key={branch.id}
                    value={branch.id.toString()}
                  >
                    {branch.name}
                  </SelectItem>
                )) : <SelectItem value="__none" disabled>-- No branches available --</SelectItem>}
              </SelectContent>
            </Select>

            <Select
              value={newHodId}
              onValueChange={setNewHodId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Counselor" />
              </SelectTrigger>
              <SelectContent>
                {unassignedHods.length ? unassignedHods.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {`${user.first_name} ${user.last_name}`.trim()}
                  </SelectItem>
                )) : <SelectItem value="__none" disabled>-- No available Counselors --</SelectItem>}
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
              disabled={loading || !selectedHodBranchId || !newHodId}
            >
              {loading ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign MIS Dialog */}
      <Dialog open={isAssignMisDialogOpen} onOpenChange={setIsAssignMisDialogOpen}>
        <DialogContent className={
          theme === 'dark'
            ? 'bg-card text-foreground w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
            : 'bg-white text-gray-900 w-full max-w-[90%] sm:max-w-md md:max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 rounded-lg'
        }>
          <DialogHeader>
            <DialogTitle>Assign MIS to Branch</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Select
              value={selectedMisBranchId?.toString() || ""}
              onValueChange={(val) => setSelectedMisBranchId(Number(val))}
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

            <Select
              value={selectedMisId}
              onValueChange={setSelectedMisId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select MIS" />
              </SelectTrigger>
              <SelectContent>
                {misUsers && misUsers.length ? misUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email}
                  </SelectItem>
                )) : <SelectItem value="__none" disabled>-- No MIS users found --</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex flex-col md:flex-row md:justify-end gap-2 w-full">
            <Button
              variant="outline"
              className={theme === 'dark'
                ? 'text-foreground bg-card border border-border hover:bg-accent'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}
              onClick={() => setIsAssignMisDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignMis}
              disabled={loading || !selectedMisBranchId || !selectedMisId}
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
