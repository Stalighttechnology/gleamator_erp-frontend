import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, Loader, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { getStaffEnrollment, manageWardens, manageCaretakers } from "../../utils/hms_api";
import { useTheme } from "../../context/ThemeContext";

interface Warden {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  experience?: string;
}

interface Caretaker {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  experience?: string;
}

const StaffManagementOverview = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wardens, setWardens] = useState<Warden[]>([]);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [wardensTotal, setWardensTotal] = useState(0);
  const [caretakersTotal, setCaretakersTotal] = useState(0);

  // Inline edit state
  const [editingWardenId, setEditingWardenId] = useState<number | null>(null);
  const [editingCaretakerId, setEditingCaretakerId] = useState<number | null>(null);
  const [editingWardenForm, setEditingWardenForm] = useState<Partial<Warden>>({});
  const [editingCaretakerForm, setEditingCaretakerForm] = useState<Partial<Caretaker>>({});
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination state
  const [wardensPage, setWardensPage] = useState(1);
  const [caretakersPage, setCaretakersPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    fetchStaffData();
  }, [wardensPage, caretakersPage]);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const response = await getStaffEnrollment(wardensPage, pageSize);

      if (response.success) {
        // Handle the response data structure - check if it's double-wrapped
        const actualData = response.data?.data || response.data;
        const { wardens: wardensData, caretakers: caretakersData } = actualData;

        setWardens(wardensData?.items || []);
        setWardensTotal(wardensData?.total || 0);

        setCaretakers(caretakersData?.items || []);
        setCaretakersTotal(caretakersData?.total || 0);
      } else {
        throw new Error(response.message || "Failed to fetch staff data");
      }
    } catch (error) {
      console.error("Error fetching staff data:", error);
      toast({
        title: "Error",
        description: "Failed to load staff enrollment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Warden handlers
  const startEditWarden = (warden: Warden) => {
    setEditingWardenId(warden.id);
    setEditingWardenForm({ ...warden });
  };

  const cancelEditWarden = () => {
    setEditingWardenId(null);
    setEditingWardenForm({});
  };

  const saveWarden = async (id?: number) => {
    try {
      setActionLoading(true);
      const payload = {
        name: editingWardenForm.name,
        email: editingWardenForm.email,
        phone: editingWardenForm.phone,
        designation: editingWardenForm.designation,
        experience: editingWardenForm.experience,
      };
      const method = id ? "PUT" : "POST";
      const response = await manageWardens(payload, id, method as any);
      if (response.success) {
        toast({ title: "Saved", description: "Warden saved successfully." });
        const saved = response.data?.data || response.data || null;
        setEditingWardenId(null);
        setEditingWardenForm({});
        if (saved) {
          if (id) {
            setWardens((prev) => prev.map((w) => (w.id === id ? (saved as Warden) : w)));
          } else {
            setWardens((prev) => [saved as Warden, ...prev]);
            setWardensTotal((t) => t + 1);
          }
        }
      } else {
        throw new Error(response.message || "Failed to save warden");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save warden.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteWarden = async (id: number) => {
    if (!confirm("Delete this warden?")) return;
    try {
      setActionLoading(true);
      const response = await manageWardens(undefined, id, "DELETE");
      if (response.success) {
        toast({ title: "Deleted", description: "Warden deleted." });
        setWardens((prev) => prev.filter((w) => w.id !== id));
        setWardensTotal((t) => Math.max(0, t - 1));
      } else {
        throw new Error(response.message || "Failed to delete warden");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete warden.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // Caretaker handlers
  const startEditCaretaker = (c: Caretaker) => {
    setEditingCaretakerId(c.id);
    setEditingCaretakerForm({ ...c });
  };

  const cancelEditCaretaker = () => {
    setEditingCaretakerId(null);
    setEditingCaretakerForm({});
  };

  const saveCaretaker = async (id?: number) => {
    try {
      setActionLoading(true);
      const payload = {
        name: editingCaretakerForm.name,
        email: editingCaretakerForm.email,
        phone: editingCaretakerForm.phone,
        address: editingCaretakerForm.address,
        experience: editingCaretakerForm.experience,
      };
      const method = id ? "PUT" : "POST";
      const response = await manageCaretakers(payload, id, method as any);
      if (response.success) {
        toast({ title: "Saved", description: "Caretaker saved successfully." });
        const saved = response.data?.data || response.data || null;
        setEditingCaretakerId(null);
        setEditingCaretakerForm({});
        if (saved) {
          if (id) {
            setCaretakers((prev) => prev.map((c) => (c.id === id ? (saved as Caretaker) : c)));
          } else {
            setCaretakers((prev) => [saved as Caretaker, ...prev]);
            setCaretakersTotal((t) => t + 1);
          }
        }
      } else {
        throw new Error(response.message || "Failed to save caretaker");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to save caretaker.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteCaretaker = async (id: number) => {
    if (!confirm("Delete this caretaker?")) return;
    try {
      setActionLoading(true);
      const response = await manageCaretakers(undefined, id, "DELETE");
      if (response.success) {
        toast({ title: "Deleted", description: "Caretaker deleted." });
        setCaretakers((prev) => prev.filter((c) => c.id !== id));
        setCaretakersTotal((t) => Math.max(0, t - 1));
      } else {
        throw new Error(response.message || "Failed to delete caretaker");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete caretaker.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  // Pagination calculations
  const totalWardensPages = Math.ceil(wardensTotal / pageSize);
  const totalCaretakersPages = Math.ceil(caretakersTotal / pageSize);

  // Pagination handlers
  const handleWardensPreviousPage = () => {
    if (wardensPage > 1) {
      setWardensPage(wardensPage - 1);
    }
  };

  const handleWardensNextPage = () => {
    if (wardensPage < totalWardensPages) {
      setWardensPage(wardensPage + 1);
    }
  };

  const handleCaretakersPreviousPage = () => {
    if (caretakersPage > 1) {
      setCaretakersPage(caretakersPage - 1);
    }
  };

  const handleCaretakersNextPage = () => {
    if (caretakersPage < totalCaretakersPages) {
      setCaretakersPage(caretakersPage + 1);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading staff data...</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Staff Management</h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          View all enrolled wardens and caretakers
        </p>
      </div>

      {/* Statistics Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        variants={containerVariants}
      >
        {/* Total Wardens */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-lg border-2 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-orange-900 to-orange-800 border-orange-700'
              : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300'
          } hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-orange-300' : 'text-orange-600'}`}>
                Total Wardens
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-orange-900'}`}>
                {wardensTotal}
              </p>
            </div>
            <UserCheck className={`w-12 h-12 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`} />
          </div>
        </motion.div>

        {/* Total Caretakers */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-lg border-2 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700'
              : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300'
          } hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                Total Caretakers
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>
                {caretakersTotal}
              </p>
            </div>
            <Users className={`w-12 h-12 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
        </motion.div>
      </motion.div>

      {/* Staff Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wardens */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-lg border-2 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-orange-500" />
            Wardens ({wardensTotal})
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {wardens.length > 0 ? (
              wardens.map((warden, index) => (
                <motion.div
                  key={warden.id}
                  variants={itemVariants}
                  className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  } transition-colors`}
                >
                  {editingWardenId === warden.id ? (
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <input
                          className="w-full px-2 py-1 rounded-md mr-2"
                          value={editingWardenForm.name || ''}
                          onChange={(e) => setEditingWardenForm({ ...editingWardenForm, name: e.target.value })}
                          placeholder="Name"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <input
                          className="px-2 py-1 rounded-md"
                          value={editingWardenForm.designation || ''}
                          onChange={(e) => setEditingWardenForm({ ...editingWardenForm, designation: e.target.value })}
                          placeholder="Designation"
                        />
                        <input
                          className="px-2 py-1 rounded-md"
                          value={editingWardenForm.phone || ''}
                          onChange={(e) => setEditingWardenForm({ ...editingWardenForm, phone: e.target.value })}
                          placeholder="Phone"
                        />
                        <input
                          className="px-2 py-1 rounded-md"
                          value={editingWardenForm.email || ''}
                          onChange={(e) => setEditingWardenForm({ ...editingWardenForm, email: e.target.value })}
                          placeholder="Email"
                        />
                        <input
                          className="px-2 py-1 rounded-md"
                          value={editingWardenForm.experience || ''}
                          onChange={(e) => setEditingWardenForm({ ...editingWardenForm, experience: e.target.value })}
                          placeholder="Experience (years)"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveWarden(warden.id)}
                          disabled={actionLoading}
                          className="bg-green-500 text-white px-3 py-1 rounded-md"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditWarden}
                          disabled={actionLoading}
                          className="bg-gray-300 text-gray-800 px-3 py-1 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteWarden(warden.id)}
                          disabled={actionLoading}
                          className="bg-red-500 text-white px-3 py-1 rounded-md ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {(wardensPage - 1) * pageSize + index + 1}. {warden.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditWarden(warden)}
                            className="text-sm px-3 py-1 bg-yellow-400 rounded-md"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteWarden(warden.id)}
                            className="text-sm px-3 py-1 bg-red-500 text-white rounded-md"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {warden.designation && (
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          🏢 {warden.designation}
                        </p>
                      )}
                      {warden.email && (
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          📧 {warden.email}
                        </p>
                      )}
                      {warden.phone && (
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          📱 {warden.phone}
                        </p>
                      )}
                      {warden.experience && (
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          ⭐ {warden.experience} years experience
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                No wardens enrolled yet
              </p>
            )}
          </div>

          {/* Wardens Pagination Controls */}
          {totalWardensPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-600">
              <button
                onClick={handleWardensPreviousPage}
                disabled={wardensPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  wardensPage === 1
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'bg-orange-600 hover:bg-orange-500 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {wardensPage} of {totalWardensPages}
              </span>

              <button
                onClick={handleWardensNextPage}
                disabled={wardensPage === totalWardensPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  wardensPage === totalWardensPages
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'bg-orange-600 hover:bg-orange-500 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Caretakers */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-lg border-2 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Caretakers ({caretakersTotal})
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {caretakers.length > 0 ? (
              caretakers.map((caretaker, index) => (
                <motion.div
                  key={caretaker.id}
                  variants={itemVariants}
                  className={`p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  } transition-colors`}
                >
                  {editingCaretakerId === caretaker.id ? (
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <input
                          className="w-full px-2 py-1 rounded-md mr-2"
                          value={editingCaretakerForm.name || ''}
                          onChange={(e) => setEditingCaretakerForm({ ...editingCaretakerForm, name: e.target.value })}
                          placeholder="Name"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <input
                          className="px-2 py-1 rounded-md"
                          value={editingCaretakerForm.phone || ''}
                          onChange={(e) => setEditingCaretakerForm({ ...editingCaretakerForm, phone: e.target.value })}
                          placeholder="Phone"
                        />
                        <input
                          className="px-2 py-1 rounded-md"
                          value={editingCaretakerForm.email || ''}
                          onChange={(e) => setEditingCaretakerForm({ ...editingCaretakerForm, email: e.target.value })}
                          placeholder="Email"
                        />
                        <input
                          className="px-2 py-1 rounded-md"
                          value={editingCaretakerForm.address || ''}
                          onChange={(e) => setEditingCaretakerForm({ ...editingCaretakerForm, address: e.target.value })}
                          placeholder="Address"
                        />
                        <input
                          className="px-2 py-1 rounded-md"
                          value={editingCaretakerForm.experience || ''}
                          onChange={(e) => setEditingCaretakerForm({ ...editingCaretakerForm, experience: e.target.value })}
                          placeholder="Experience (years)"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveCaretaker(caretaker.id)}
                          disabled={actionLoading}
                          className="bg-green-500 text-white px-3 py-1 rounded-md"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditCaretaker}
                          disabled={actionLoading}
                          className="bg-gray-300 text-gray-800 px-3 py-1 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteCaretaker(caretaker.id)}
                          disabled={actionLoading}
                          className="bg-red-500 text-white px-3 py-1 rounded-md ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {(caretakersPage - 1) * pageSize + index + 1}. {caretaker.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditCaretaker(caretaker)}
                            className="text-sm px-3 py-1 bg-yellow-400 rounded-md"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCaretaker(caretaker.id)}
                            className="text-sm px-3 py-1 bg-red-500 text-white rounded-md"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {caretaker.phone && (
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          📱 {caretaker.phone}
                        </p>
                      )}
                      {caretaker.email && (
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          📧 {caretaker.email}
                        </p>
                      )}
                      {caretaker.address && (
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          🏠 {caretaker.address}
                        </p>
                      )}
                      {caretaker.experience && (
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          ⭐ {caretaker.experience} years experience
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                No caretakers enrolled yet
              </p>
            )}
          </div>

          {/* Caretakers Pagination Controls */}
          {totalCaretakersPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-600">
              <button
                onClick={handleCaretakersPreviousPage}
                disabled={caretakersPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  caretakersPage === 1
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {caretakersPage} of {totalCaretakersPages}
              </span>

              <button
                onClick={handleCaretakersNextPage}
                disabled={caretakersPage === totalCaretakersPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  caretakersPage === totalCaretakersPages
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StaffManagementOverview;
