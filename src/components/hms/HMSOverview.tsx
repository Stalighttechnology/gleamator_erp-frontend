import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Users, Grid3X3, Shield, AlertCircle, Loader } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { getDashboardStats, getRoomsByHostelId } from "../../utils/hms_api";
import { useTheme } from "../../context/ThemeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Hostel {
  id: number;
  name: string;
  capacity: number;
  warden?: number;
  caretaker?: number;
}

interface Room {
  id: number;
  hostel: number;
  hostel_name?: string;
  room_number: string;
  room_type: 'S' | 'D' | 'P' | 'B';
  capacity: number;
  student_count: number;
}

interface Stats {
  totalHostels: number;
  totalRooms: number;
  totalStudents: number;
  totalWardens: number;
  totalCaretakers: number;
  occupancyRate: number;
}

const HMSOverview = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalHostels: 0,
    totalRooms: 0,
    totalStudents: 0,
    totalWardens: 0,
    totalCaretakers: 0,
    occupancyRate: 0,
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<number | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>([]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Fetch rooms when hostel is selected
  useEffect(() => {
    if (selectedHostel) {
      fetchHostelRooms(selectedHostel);
    } else {
      setRooms([]);
    }
  }, [selectedHostel]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await getDashboardStats();

      if (response.success && response.data) {
        const { statistics, data } = response.data;

        setHostels(data.hostels);

        setStats({
          totalHostels: statistics.total_hostels,
          totalRooms: statistics.total_rooms,
          totalStudents: statistics.total_students,
          totalWardens: statistics.total_wardens,
          totalCaretakers: statistics.total_caretakers,
          occupancyRate: statistics.occupancy_rate,
        });

        // Set first hostel as selected
        if (data.hostels && data.hostels.length > 0) {
          setSelectedHostel(data.hostels[0].id);
        }
      } else {
        throw new Error(response.message || "Failed to fetch dashboard stats");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHostelRooms = async (hostelId: number) => {
    setLoadingRooms(true);
    try {
      const response = await getRoomsByHostelId(hostelId);

      if (response.success && response.data?.rooms) {
        setRooms(response.data.rooms);
      } else {
        setRooms([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load hostel rooms",
        variant: "destructive",
      });
    } finally {
      setLoadingRooms(false);
    }
  };

  const getRoomColor = (occupied: number, capacity: number) => {
    const occupancyPercent = (occupied / capacity) * 100;
    if (occupancyPercent === 100) return "bg-red-500"; // Full
    if (occupancyPercent >= 50) return "bg-yellow-500"; // Half full
    return "bg-green-500"; // Available
  };

  const getRoomStatusLabel = (occupied: number, capacity: number) => {
    const occupancyPercent = (occupied / capacity) * 100;
    if (occupancyPercent === 100) return "FULL";
    if (occupancyPercent >= 50) return "HALF";
    return "AVAIL";
  };

  // Helper: derive floor number from room_number like H1-101 -> 1, H1-001 -> 0
  const getFloorFromRoomNumber = (roomNumber: string) => {
    if (!roomNumber) return 0;
    const m = roomNumber.match(/(\d+)$/);
    if (!m) return 0;
    const num = parseInt(m[1], 10);
    if (isNaN(num)) return 0;
    return Math.floor(num / 100);
  };

  // Group rooms by floor for display and sort within floors
  const roomsByFloor = rooms.reduce((acc, room) => {
    const floor = getFloorFromRoomNumber(room.room_number || room.name || '');
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  // Ensure rooms in each floor are sorted by room_number
  Object.keys(roomsByFloor).forEach((f) => {
    roomsByFloor[Number(f)].sort((a, b) => (a.room_number || a.name).localeCompare(b.room_number || b.name, undefined, {numeric: true}));
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="animate-spin mb-4">⚙️</div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">HMS Dashboard</h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          Real-time hostel management statistics
        </p>
      </div>

      {/* Statistics Cards - Matrix Style */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
        variants={containerVariants}
      >
        {/* Total Hostels */}
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
                Hostels
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>
                {stats.totalHostels}
              </p>
            </div>
            <Building2 className={`w-12 h-12 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
        </motion.div>

        {/* Total Rooms */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-lg border-2 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-purple-900 to-purple-800 border-purple-700'
              : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300'
          } hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                Rooms
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-purple-900'}`}>
                {stats.totalRooms}
              </p>
            </div>
            <Grid3X3 className={`w-12 h-12 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-500'}`} />
          </div>
        </motion.div>

        {/* Total Students */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-lg border-2 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-green-900 to-green-800 border-green-700'
              : 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
          } hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-green-300' : 'text-green-600'}`}>
                Students
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-green-900'}`}>
                {stats.totalStudents}
              </p>
            </div>
            <Users className={`w-12 h-12 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
          </div>
        </motion.div>

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
                Wardens
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-orange-900'}`}>
                {stats.totalWardens}
              </p>
            </div>
            <Shield className={`w-12 h-12 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`} />
          </div>
        </motion.div>

        {/* Occupancy Rate */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-lg border-2 ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-red-900 to-red-800 border-red-700'
              : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
          } hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>
                Occupancy
              </p>
              <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-red-900'}`}>
                {stats.occupancyRate}%
              </p>
            </div>
            <AlertCircle className={`w-12 h-12 ${theme === 'dark' ? 'text-red-400' : 'text-red-500'}`} />
          </div>
        </motion.div>
      </motion.div>

      {/* Room Matrix Visualization - BookMyShow Style */}
      <motion.div
        variants={itemVariants}
        className={`p-6 rounded-lg border-2 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Room Booking Matrix</h2>

          {/* Hostel Filter */}
          <div className="mb-6">
            <label className={`text-sm font-medium block mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Hostel
            </label>
            <Select
              value={selectedHostel?.toString() || 'all'}
              onValueChange={(v) => setSelectedHostel(v === 'all' ? null : Number(v))}
            >
              <SelectTrigger className={`w-full md:w-64 border-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}>
                <SelectValue placeholder="All Hostels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hostels</SelectItem>
                {hostels.map((hostel) => (
                  <SelectItem key={hostel.id} value={hostel.id.toString()}>
                    {hostel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded-md"></div>
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-500 rounded-md"></div>
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Half Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded-md"></div>
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Full</span>
            </div>
          </div>

          {/* Room Matrix */}
          <motion.div
            className="grid gap-4"
            variants={containerVariants}
          >
            {loadingRooms ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin mr-2" />
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Loading rooms...
                </span>
              </div>
            ) : selectedHostel ? (
              // Show selected hostel's rooms only
              Object.keys(roomsByFloor).length > 0 ? (
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                    {hostels.find((h) => h.id === selectedHostel)?.name}
                  </h3>
                      <div className="space-y-6">
                        {Object.keys(roomsByFloor)
                          .map((k) => Number(k))
                          .sort((a, b) => a - b)
                          .map((floorNum) => (
                            <div key={floorNum}>
                              <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Floor {floorNum === 0 ? 'Ground' : floorNum}
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {roomsByFloor[floorNum].map((room) => (
                                  <motion.div
                                    key={room.id}
                                    variants={itemVariants}
                                    className={`p-3 rounded-lg border-2 text-center cursor-pointer hover:scale-105 transition-transform ${getRoomColor(
                                      room.student_count,
                                      room.capacity
                                    )} ${
                                      room.student_count === room.capacity ? 'border-red-700' : 'border-opacity-50'
                                    } text-white font-semibold`}
                                    title={`${room.room_number}: ${room.student_count}/${room.capacity}`}
                                  >
                                    <div className="text-xs mb-1">{room.room_number}</div>
                                    <div className="text-sm">
                                      {room.student_count}/{room.capacity}
                                    </div>
                                    <div className="text-xs mt-1 font-bold opacity-80">
                                      {getRoomStatusLabel(room.student_count, room.capacity)}
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                </div>
              ) : (
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  No rooms available for this hostel
                </p>
              )
            ) : (
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Select a hostel to view rooms
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HMSOverview;
    </motion.div>
  );
};

export default HMSOverview;
