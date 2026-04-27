import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { manageHostelStudents, manageRooms, getRoomsByHostel } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';

interface HostelStudent {
  id: number;
  name: string;
  usn: string;
  user_email: string;
  branch_name: string;
  course_name: string;
  room: number | null;
  room_name?: string;
  room_hostel_name?: string;
  room_allotted: boolean;
  no_dues: boolean;
}

interface Batch {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Semester {
  id: string;
  number: number;
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<HostelStudent[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomsForHostel, setRoomsForHostel] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<HostelStudent | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [selectedHostelInDialog, setSelectedHostelInDialog] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    room: null as number | null,
    room_allotted: false,
    no_dues: true
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    batch: '',
    branch: '',
    semester: '',
    search: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchBatches();
    fetchBranches();
    fetchHostels();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, filters]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [filters.batch, filters.branch, filters.semester]);

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/hms/students/get_batches/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter out any items with empty values
        setBatches(data.results.filter((batch: any) => batch.id && batch.name));
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/hms/students/get_branches/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter out any items with empty values
        setBranches(data.results.filter((branch: any) => branch.id && branch.name));
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchHostels = async () => {
    try {
      const response = await fetch('/api/hms/hostels/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response
        const hostelsData = data.results || data;
        setHostels(Array.isArray(hostelsData) ? hostelsData : []);
      }
    } catch (error) {
      console.error('Failed to fetch hostels:', error);
    }
  };

  const getRoomsForHostel = async (hostelId: number) => {
    setIsLoadingRooms(true);
    try {
      const response = await getRoomsByHostel(hostelId);
      if (response.success && response.results) {
        setRoomsForHostel(response.results);
      } else {
        setRoomsForHostel([]);
      }
    } catch (error) {
      console.error('Failed to fetch rooms for hostel:', error);
      setRoomsForHostel([]);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchSemesters = async (branchId?: string) => {
    if (!branchId) {
      setSemesters([]);
      return;
    }
    try {
      const response = await fetch(`/api/student/semesters/?branch_id=${branchId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const semestersData = data.data;
        if (Array.isArray(semestersData)) {
          setSemesters(semestersData);
        } else {
          console.error('Semesters data is not an array:', semestersData);
          setSemesters([]);
        }
      } else {
        console.error('Failed to fetch semesters, status:', response.status);
        setSemesters([]);
      }
    } catch (error) {
      console.error('Failed to fetch semesters:', error);
    }
  };

  const fetchStudents = async () => {
    // Only fetch students if all required filters are selected
    if (!filters.batch || !filters.branch || !filters.semester) {
      setStudents([]);
      setTotalCount(0);
      setNextPage(null);
      setPreviousPage(null);
      return;
    }

    const params: Record<string, any> = {
      page: currentPage,
      page_size: pageSize,
    };

    // Add filters
    if (filters.batch) params.batch = filters.batch;
    if (filters.branch) params.branch = filters.branch;
    if (filters.semester) params.semester = filters.semester;
    if (filters.search) params.search = filters.search;

    const response = await manageHostelStudents(undefined, undefined, 'GET', params);
    if (response.success && response.results) {
      setStudents(response.results);
      setTotalCount(response.count || 0);
      setNextPage(response.next);
      setPreviousPage(response.previous);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.message || "Failed to fetch students",
      });
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change

    // If branch changes, fetch semesters for that branch
    if (key === 'branch') {
      fetchSemesters(value);
      setFilters(prev => ({ ...prev, semester: '' })); // Reset semester when branch changes
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const response = await manageHostelStudents(formData, editingStudent.id, 'PUT');

    if (response.success) {
      // Update local state with the response data (single object for PUT)
      const updatedStudent = response.data as HostelStudent | undefined;
      if (updatedStudent) {
        setStudents(prevStudents =>
          prevStudents.map(student =>
            student.id === editingStudent.id
              ? { ...student, ...updatedStudent }
              : student
          )
        );
      }

      setIsDialogOpen(false);
      setEditingStudent(null);
      setFormData({
        room: null,
        room_allotted: false,
        no_dues: true
      });
      setSelectedHostelInDialog(null);
      setRoomsForHostel([]);
      toast({
        title: "Success",
        description: "Student HMS details updated successfully",
      });
    } else {
      // Check if it's a "room full" error
      const isRoomFullError = response.message?.includes('full capacity') || response.message?.includes('room is full') || response.message?.includes('Room');
      
      toast({
        variant: "destructive",
        title: isRoomFullError ? "Room Capacity Exceeded" : "Error",
        description: response.message || "Failed to update student",
      });
    }
  };

  const handleEdit = (student: HostelStudent) => {
    setEditingStudent(student);
    setFormData({
      room: student.room,
      room_allotted: student.room_allotted,
      no_dues: student.no_dues
    });

    // If student has a room assigned, extract hostel from room_hostel_name and pre-select it
    if (student.room && student.room_hostel_name) {
      // Find hostel ID by matching name
      const hostel = hostels.find(h => h.name === student.room_hostel_name);
      if (hostel) {
        setSelectedHostelInDialog(hostel.id);
        getRoomsForHostel(hostel.id);
      }
    } else {
      setSelectedHostelInDialog(null);
      setRoomsForHostel([]);
    }

    setIsDialogOpen(true);
  };

  const handleHostelSelect = (hostelId: string) => {
    const id = parseInt(hostelId);
    setSelectedHostelInDialog(id);
    getRoomsForHostel(id);
    // Reset room selection when hostel changes
    setFormData(prev => ({ ...prev, room: null }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Student Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by name, USN, or email"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="batch">Batch</Label>
            <Select value={filters.batch || "all"} onValueChange={(value) => handleFilterChange('batch', value === "all" ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id.toString()}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="branch">Branch</Label>
            <Select value={filters.branch || "all"} onValueChange={(value) => handleFilterChange('branch', value === "all" ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="semester">Semester</Label>
            <Select
              value={filters.semester || "all"}
              onValueChange={(value) => handleFilterChange('semester', value === "all" ? '' : value)}
              disabled={!filters.branch}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    Semester {semester.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ batch: '', branch: '', semester: '', search: '' });
                setCurrentPage(1);
                setSemesters([]);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <Dialog 
          open={isDialogOpen} 
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              // Clear state when dialog closes
              setEditingStudent(null);
              setFormData({
                room: null,
                room_allotted: false,
                no_dues: true
              });
              setSelectedHostelInDialog(null);
              setRoomsForHostel([]);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Student HMS Details</DialogTitle>
            </DialogHeader>
              {editingStudent && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold mb-2">Student Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Name:</strong> {editingStudent.name}</div>
                    <div><strong>USN:</strong> {editingStudent.usn}</div>
                    <div><strong>Email:</strong> {editingStudent.user_email}</div>
                    <div><strong>Branch:</strong> {editingStudent.branch_name}</div>
                    <div><strong>Course:</strong> {editingStudent.course_name}</div>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hostel">Hostel *</Label>
                    <Select value={selectedHostelInDialog ? selectedHostelInDialog.toString() : ''} onValueChange={handleHostelSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select hostel" />
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
                  <div>
                    <Label htmlFor="room">Room</Label>
                    {isLoadingRooms ? (
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ) : !selectedHostelInDialog ? (
                      <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center px-3 text-sm text-gray-500">
                        Select a hostel first
                      </div>
                    ) : (
                      <Select value={formData.room ? formData.room.toString() : 'none'} onValueChange={(value) => setFormData({ ...formData, room: value === 'none' ? null : value ? parseInt(value) : null })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Room</SelectItem>
                          {roomsForHostel.map((room) => {
                            const isCurrent = editingStudent?.room === room.id;
                            const isFull = room.student_count >= room.capacity;
                            return (
                              <SelectItem 
                                key={room.id} 
                                value={room.id.toString()}
                                disabled={isFull && !isCurrent}
                              >
                                {room.name} ({room.student_count}/{room.capacity}) 
                                {isCurrent && ' ✓ Currently Assigned'} 
                                {isFull && !isCurrent && ' (FULL)'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="room_allotted"
                      checked={formData.room_allotted}
                      onChange={(e) => setFormData({ ...formData, room_allotted: e.target.checked })}
                    />
                    <Label htmlFor="room_allotted">Room Allotted</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="no_dues"
                      checked={formData.no_dues}
                      onChange={(e) => setFormData({ ...formData, no_dues: e.target.checked })}
                    />
                    <Label htmlFor="no_dues">No Dues</Label>
                  </div>
                </div>
                <Button type="submit">{editingStudent ? 'Update' : 'Create'}</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>USN</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Room Allotted</TableHead>
                <TableHead>No Dues</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (!filters.batch || !filters.branch || !filters.semester) ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Please select Batch, Branch, and Semester to load students
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.usn}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.branch_name}</TableCell>
                    <TableCell>{student.room_name ? `${student.room_hostel_name} - ${student.room_name}` : 'Not Assigned'}</TableCell>
                    <TableCell>{student.room_allotted ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{student.no_dues ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(student)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {students.length > 0 && totalCount > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} students
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!previousPage}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!nextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
  );
};

export default StudentManagement;