import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { manageRooms, manageHostels, manageHostelStudents } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface Hostel {
  id: number;
  name: string;
}

interface Room {
  id: number;
  no: string;
  name: string;
  room_type: 'S' | 'D' | 'P' | 'B';
  vacant: boolean;
  hostel: number;
  hostel_name?: string;
  student_count?: number;  // Added: Count of students in this room
  student?: {
    id: number;
    name: string;
    usn: string;
    user_email?: string;
    branch_name?: string;
  };
}

const RoomManagement: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [roomStudentCounts, setRoomStudentCounts] = useState<{ [key: number]: number }>({});
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [formData, setFormData] = useState({
    no: '',
    name: '',
    room_type: 'S' as 'S' | 'D' | 'P' | 'B',
    vacant: true,
    hostel: 0
  });
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [nextRoomNumberForFloor, setNextRoomNumberForFloor] = useState<number>(1);
  const { toast } = useToast();
  const { theme } = useTheme();

  // Only fetch hostels on component mount
  useEffect(() => {
    fetchHostels();
  }, []);

  // Fetch rooms when hostel is selected
  useEffect(() => {
    if (selectedHostel) {
      fetchRoomsByHostel(selectedHostel);
    }
  }, [selectedHostel]);

  const fetchStudents = async (roomId: number) => {
    setIsLoadingStudents(true);
    try {
      // Fetch only students assigned to this specific room (only on edit click)
      const response = await manageHostelStudents(undefined, undefined, 'GET', { room: roomId });
      if (response.success && response.results) {
        setRoomStudents(response.results);
      } else {
        setRoomStudents([]);
      }
    } catch (error) {
      console.error('Failed to fetch room students:', error);
      setRoomStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const fetchRoomsByHostel = async (hostelId: number) => {
    setIsLoadingRooms(true);
    try {
      // Pass hostel parameter to backend for server-side filtering
      const response = await manageRooms(undefined, undefined, 'GET', { hostel: hostelId });
      if (response.success && response.results) {
        setRooms(response.results);
        
        // Populate student counts from room response (no extra API call needed)
        const countsMap: { [key: number]: number } = {};
        response.results.forEach(room => {
          countsMap[room.id] = room.student_count || 0;
        });
        setRoomStudentCounts(countsMap);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to fetch rooms",
        });
      }
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const response = await manageRooms();
      if (response.success && response.results) {
        setRooms(response.results);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to fetch rooms",
        });
      }
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchHostels = async () => {
    try {
      const response = await manageHostels();
      if (response.success && response.results) {
        setHostels(response.results);
        // Auto-select first hostel
        if (response.results.length > 0) {
          setSelectedHostel(response.results[0].id);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to fetch hostels",
        });
      }
    } catch (error) {
      console.error('Failed to fetch hostels:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingRoom ? 'PUT' : 'POST';
    const response = await manageRooms(formData, editingRoom?.id, method);

    if (response.success) {
      // Update local state instead of refetching
      const updatedRoom = response.data as Room | undefined;
      if (updatedRoom) {
        if (editingRoom) {
          // Update existing room
          setRooms(prevRooms =>
            prevRooms.map(room =>
              room.id === editingRoom.id ? updatedRoom : room
            )
          );
        } else {
          // Add new room to the list
          setRooms(prevRooms => [...prevRooms, updatedRoom]);
        }
      }

      setIsDialogOpen(false);
      setEditingRoom(null);
      setRoomStudents([]);
      setSelectedFloor(null);
      setFormData({ no: '', name: '', room_type: 'S', vacant: true, hostel: 0 });
      toast({
        title: "Success",
        description: `Room ${editingRoom ? 'updated' : 'created'} successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.message || "Failed to save room",
      });
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      no: room.no,
      name: room.name,
      room_type: room.room_type,
      vacant: room.vacant,
      hostel: room.hostel
    });
    
    // Fetch students only for this specific room when edit dialog opens
    fetchStudents(room.id);
    
    setIsDialogOpen(true);
  };

  const loadRoomStudents = () => {
    // This is now handled in handleEdit directly
  };

  // Clean up useEffect that was trying to load roomStudents
  // No longer needed since students are fetched in handleEdit

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this room?')) {
      const response = await manageRooms(undefined, id, 'DELETE');
      if (response.success) {
        // Update local state instead of refetching
        setRooms(prevRooms => prevRooms.filter(room => room.id !== id));
        toast({
          title: "Success",
          description: "Room deleted successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to delete room",
        });
      }
    }
  };

  const getRoomTypeLabel = (type: string) => {
    const labels = {
      'S': 'Single',
      'D': 'Double',
      'P': 'Scholar',
      'B': 'Both'
    };
    return labels[type as keyof typeof labels] || type;
  };

  // Get room capacity based on room type
  const getRoomCapacity = (roomType: 'S' | 'D' | 'P' | 'B'): number => {
    const capacities = {
      'S': 1, // Single Occupancy - 1 person
      'D': 2, // Double Occupancy - 2 persons
      'P': 1, // Scholar - 1 person (reserved)
      'B': 2  // Both - 2 persons (flexible)
    };
    return capacities[roomType] || 1;
  };

  // Determine room occupancy status
  const getRoomStatus = (room: Room, studentCount: number) => {
    const capacity = getRoomCapacity(room.room_type);
    
    if (studentCount === 0) {
      return { status: 'empty', color: 'green', label: 'Empty' };
    } else if (studentCount < capacity) {
      return { status: 'partial', color: 'yellow', label: 'Partial' };
    } else if (studentCount >= capacity) {
      return { status: 'full', color: 'red', label: 'Full' };
    }
    return { status: 'empty', color: 'green', label: 'Empty' };
  };

  // Get room color classes based on status
  const getRoomColorClasses = (status: string) => {
    switch (status) {
      case 'green':
        return theme === 'dark'
          ? 'bg-green-900/20 border-green-500 hover:bg-green-900/40'
          : 'bg-green-50 border-green-500 hover:bg-green-100';
      case 'yellow':
        return theme === 'dark'
          ? 'bg-yellow-900/20 border-yellow-500 hover:bg-yellow-900/40'
          : 'bg-yellow-50 border-yellow-500 hover:bg-yellow-100';
      case 'red':
        return theme === 'dark'
          ? 'bg-red-900/20 border-red-500 hover:bg-red-900/40'
          : 'bg-red-50 border-red-500 hover:bg-red-100';
      default:
        return theme === 'dark'
          ? 'bg-gray-900/20 border-gray-500 hover:bg-gray-900/40'
          : 'bg-gray-50 border-gray-500 hover:bg-gray-100';
    }
  };

  // Get text color for status
  const getStatusTextColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'text-green-700 dark:text-green-400';
      case 'yellow':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'red':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  };

  const getFloorFromRoomNo = (roomNo: string): number => {
    return Math.floor(parseInt(roomNo) / 100) || 0;
  };

  const hostelRooms = selectedHostel ? rooms.filter(r => r.hostel === selectedHostel) : [];
  const floors = [...new Set(hostelRooms.map(r => getFloorFromRoomNo(r.no)))].sort((a, b) => a - b);
  const hostelName = hostels.find(h => h.id === selectedHostel)?.name || 'Hostel';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Room Management</span>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setRoomStudents([]);
                setEditingRoom(null);
                setSelectedFloor(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingRoom(null);
                  setRoomStudents([]);
                  setSelectedFloor(null);
                  setFormData({ 
                    no: '', 
                    name: '', 
                    room_type: 'S', 
                    vacant: true, 
                    hostel: selectedHostel || 0 
                  });
                }} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" /> Add Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="floor">Floor *</Label>
                    <Select 
                      value={selectedFloor !== null ? selectedFloor.toString() : ''} 
                      onValueChange={(value) => {
                        const floor = parseInt(value);
                        setSelectedFloor(floor);
                        
                        // Get existing rooms for this floor
                        const hostelId = formData.hostel || selectedHostel;
                        const hostelRooms = rooms.filter(r => r.hostel === hostelId);
                        const floorRooms = hostelRooms.filter(r => {
                          const roomFloor = Math.floor(parseInt(r.no) / 100) || 0;
                          return roomFloor === floor;
                        });
                        
                        // Calculate next room number for this floor
                        let nextNum = 1;
                        if (floorRooms.length > 0) {
                          const lastRoomNo = Math.max(...floorRooms.map(r => parseInt(r.no) % 100));
                          nextNum = lastRoomNo + 1;
                        }
                        setNextRoomNumberForFloor(nextNum);
                        
                        // Auto-generate room number and name
                        const roomNo = floor * 100 + nextNum;
                        const hostelName = hostels.find(h => h.id === hostelId)?.name || 'H1';
                        const roomName = `${hostelName}-${String(roomNo).padStart(3, '0')}`;
                        setFormData(prev => ({
                          ...prev,
                          no: String(roomNo),
                          name: roomName
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select floor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Ground Floor</SelectItem>
                        <SelectItem value="1">1st Floor</SelectItem>
                        <SelectItem value="2">2nd Floor</SelectItem>
                        <SelectItem value="3">3rd Floor</SelectItem>
                        <SelectItem value="4">4th Floor</SelectItem>
                        <SelectItem value="5">5th Floor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="no">Room Number</Label>
                    <Input
                      id="no"
                      value={formData.no}
                      onChange={(e) => setFormData({ ...formData, no: e.target.value })}
                      placeholder="Auto-generated"
                      disabled={selectedFloor !== null}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Room Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Auto-generated"
                      disabled={selectedFloor !== null}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="room_type">Room Type</Label>
                    <Select value={formData.room_type} onValueChange={(value: 'S' | 'D' | 'P' | 'B') => setFormData({ ...formData, room_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">Single Occupancy</SelectItem>
                        <SelectItem value="D">Double Occupancy</SelectItem>
                        <SelectItem value="P">Reserved for Research Scholars</SelectItem>
                        <SelectItem value="B">Both Single and Double Occupancy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hostel">Hostel</Label>
                    <Select value={formData.hostel.toString()} onValueChange={(value) => setFormData({ ...formData, hostel: parseInt(value) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hostels.map((hostel) => (
                          <SelectItem key={hostel.id} value={hostel.id.toString()}>
                            {hostel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="vacant"
                      checked={formData.vacant}
                      onChange={(e) => setFormData({ ...formData, vacant: e.target.checked })}
                    />
                    <Label htmlFor="vacant">Vacant</Label>
                  </div>

                  {/* Room Capacity Information - Show when editing a room */}
                  {editingRoom && (
                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold text-sm mb-3 text-primary">Room Capacity</h3>
                      <div className="bg-gray-50 dark:bg-gray-900/30 p-3 rounded space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Room Type:</span>
                          <span className="text-sm font-medium">{getRoomTypeLabel(formData.room_type)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Max Capacity:</span>
                          <span className="text-sm font-medium">{getRoomCapacity(formData.room_type)} {getRoomCapacity(formData.room_type) === 1 ? 'person' : 'persons'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Currently Assigned:</span>
                          <span className="text-sm font-medium">{roomStudents?.length || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Available Seats:</span>
                          <span className={`text-sm font-medium ${
                            (roomStudents?.length || 0) >= getRoomCapacity(formData.room_type)
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {getRoomCapacity(formData.room_type) - (roomStudents?.length || 0)}
                          </span>
                        </div>
                        {(roomStudents?.length || 0) > 0 && (roomStudents?.length || 0) < getRoomCapacity(formData.room_type) && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-yellow-500 h-2 rounded-full transition-all"
                                style={{
                                  width: `${((roomStudents?.length || 0) / getRoomCapacity(formData.room_type)) * 100}%`
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">⚠️ Room is partially filled</p>
                          </div>
                        )}
                        {(roomStudents?.length || 0) >= getRoomCapacity(formData.room_type) && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-red-500 h-2 rounded-full"
                                style={{
                                  width: `100%`
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-red-700 dark:text-red-400 mt-1">🔴 Room is full - no more seats available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Student Information - Show when editing a room */}
                  {editingRoom && (
                    <div className="border-t pt-4 mt-4">
                      {isLoadingStudents ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="space-y-3 w-full text-center">
                            <div className="inline-block">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Loading student data...</p>
                          </div>
                        </div>
                      ) : roomStudents && roomStudents.length > 0 ? (
                        <>
                          <h3 className="font-semibold text-sm mb-3 text-primary">
                            Assigned Student(s) ({roomStudents.length})
                          </h3>
                          <div className="space-y-3">
                            {roomStudents.map((student, index) => (
                              <div key={student.id} className="bg-gray-50 dark:bg-gray-900/30 p-3 rounded border-l-4 border-primary">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-semibold text-primary">Student {index + 1}</span>
                                  {student.room_allotted && (
                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                                      Allotted
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Name:</span>
                                    <span className="text-sm font-medium">{student.name}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">USN:</span>
                                    <span className="text-sm font-medium">{student.usn}</span>
                                  </div>
                                  {student.user_email && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600 dark:text-gray-400">Email:</span>
                                      <span className="text-sm font-medium">{student.user_email}</span>
                                    </div>
                                  )}
                                  {student.branch_name && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600 dark:text-gray-400">Branch:</span>
                                      <span className="text-sm font-medium">{student.branch_name}</span>
                                    </div>
                                  )}
                                  {student.course_name && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600 dark:text-gray-400">Course:</span>
                                      <span className="text-sm font-medium">{student.course_name}</span>
                                    </div>
                                  )}
                                  {student.no_dues !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-gray-600 dark:text-gray-400">No Dues:</span>
                                      <span className={`text-sm font-medium ${student.no_dues ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {student.no_dues ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded">
                          <p className="text-xs text-green-800 dark:text-green-200">✓ This room is vacant and available for assignment.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    {editingRoom ? 'Update' : 'Create'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Hostel Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Hostel</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedHostel?.toString() || ''} onValueChange={(value) => setSelectedHostel(parseInt(value))}>
            <TabsList className={`grid gap-2 ${hostels.length <= 4 ? `grid-cols-${hostels.length}` : 'grid-cols-4'}`}>
              {hostels.map((hostel) => (
                <TabsTrigger 
                  key={hostel.id} 
                  value={hostel.id.toString()}
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  {hostel.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Room Matrix View */}
      {selectedHostel && (
        <>
          {isLoadingRooms ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-12">
                  <div className="space-y-4 text-center">
                    <div className="inline-block">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Loading rooms...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : floors.length > 0 ? (
            <div className="space-y-6">
              {floors.map((floor) => {
                const floorRooms = hostelRooms.filter(r => getFloorFromRoomNo(r.no) === floor).sort((a, b) => parseInt(a.no) - parseInt(b.no));
                return (
                  <Card key={floor}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Floor {floor === 0 ? 'Ground' : floor}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {floorRooms.map((room) => {
                          const studentCount = roomStudentCounts[room.id] || 0;
                          const capacity = getRoomCapacity(room.room_type);
                          const roomStatus = getRoomStatus(room, studentCount);
                          const colorClasses = getRoomColorClasses(roomStatus.color);
                          const textColor = getStatusTextColor(roomStatus.color);
                          
                          return (
                            <div
                              key={room.id}
                              className={`relative p-4 rounded-lg border-2 transition-all hover:shadow-lg cursor-pointer group ${colorClasses}`}
                            >
                              <div className="text-center">
                                <div className={`text-sm font-semibold ${textColor}`}>
                                  {room.name}
                                </div>
                                <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {getRoomTypeLabel(room.room_type)}
                                </div>
                                <div className={`text-xs font-semibold mt-2 ${textColor}`}>
                                  {studentCount}/{capacity}
                                </div>
                                <div className={`text-xs font-semibold mt-1 ${textColor}`}>
                                  {roomStatus.label}
                                </div>
                              </div>

                              {/* Hidden Actions - Show on Hover */}
                              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(room)}
                                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(room.id)}
                                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  <p>No rooms found for this hostel.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend - Room Occupancy Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded border-2 ${theme === 'dark' ? 'bg-green-900/20 border-green-500' : 'bg-green-50 border-green-500'}`}></div>
              <div>
                <span className="text-sm font-medium">Empty</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">0 students assigned</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded border-2 ${theme === 'dark' ? 'bg-yellow-900/20 border-yellow-500' : 'bg-yellow-50 border-yellow-500'}`}></div>
              <div>
                <span className="text-sm font-medium">Partially Filled</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">Has students but under capacity</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded border-2 ${theme === 'dark' ? 'bg-red-900/20 border-red-500' : 'bg-red-50 border-red-500'}`}></div>
              <div>
                <span className="text-sm font-medium">Full</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">At maximum capacity</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              <strong>Room Types & Capacity:</strong>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>S (Single) = 1 person</div>
              <div>D (Double) = 2 persons</div>
              <div>P (Scholar) = 1 person</div>
              <div>B (Both) = 2 persons</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoomManagement;