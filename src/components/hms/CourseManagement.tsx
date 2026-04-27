import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { manageCourses } from '../../utils/hms_api';
import { useToast } from '../../hooks/use-toast';

interface Course {
  id: number;
  code: string;
  room_type: 'S' | 'D' | 'P' | 'B';
}

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    room_type: 'D' as 'S' | 'D' | 'P' | 'B'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const response = await manageCourses();
    if (response.success && response.results) {
      setCourses(response.results);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.message || "Failed to fetch courses",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingCourse ? 'PUT' : 'POST';
    const response = await manageCourses(formData, editingCourse?.id, method);

    if (response.success) {
      fetchCourses();
      setIsDialogOpen(false);
      setEditingCourse(null);
      setFormData({ code: '', room_type: 'D' });
      toast({
        title: "Success",
        description: `Course ${editingCourse ? 'updated' : 'created'} successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.message || "Failed to save course",
      });
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      room_type: course.room_type
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this course?')) {
      const response = await manageCourses(undefined, id, 'DELETE');
      if (response.success) {
        fetchCourses();
        toast({
          title: "Success",
          description: "Course deleted successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to delete course",
        });
      }
    }
  };

  const getRoomTypeLabel = (type: string) => {
    const labels = {
      'S': 'Single Occupancy',
      'D': 'Double Occupancy',
      'P': 'Reserved for Research Scholars',
      'B': 'Both Single and Double Occupancy'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Course Management
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCourse(null);
                setFormData({ code: '', room_type: 'D' });
              }}>
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCourse ? 'Edit Course' : 'Add Course'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="code">Course Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="room_type">Room Type Preference</Label>
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
                <Button type="submit">{editingCourse ? 'Update' : 'Create'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course Code</TableHead>
              <TableHead>Room Type Preference</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>{course.code}</TableCell>
                <TableCell>{getRoomTypeLabel(course.room_type)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(course)} className="mr-2">
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(course.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CourseManagement;