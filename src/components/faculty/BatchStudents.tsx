import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { 
  getFacultyAssignments, 
  getProctorStudentsForStats as getFacultyStudents, 
  FacultyAssignment 
} from "../../utils/faculty_api";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Users, Search, Filter } from "lucide-react";

const BatchStudents = () => {
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [search, setSearch] = useState("");
  const { theme } = useTheme();

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const res = await getFacultyAssignments();
        console.log('getFacultyAssignments (BatchStudents):', res);
        if (res.success && res.data) {
          setAssignments(res.data);
          // Auto-select first assignment if available
          if (res.data.length > 0) {
            const first = res.data[0];
            setSelectedAssignmentKey(`${first.batch_id}-${first.section_id}`);
          }
        }
      } catch (error) {
        console.error("Failed to fetch assignments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      // We keep the selection UI but fetch the unified faculty student list
      setFetchingStudents(true);
      try {
        const res = await getFacultyStudents({ page: 1, page_size: 500 });
        const { normalizeStudents } = await import("@/utils/student_utils");
        const normalized = normalizeStudents(res);
        console.log(`getFacultyStudents (BatchStudents):`, res, 'normalized:', normalized);
        setStudents(normalized);
      } catch (error) {
        console.error("Failed to fetch students:", error);
        setStudents([]);
      } finally {
        setFetchingStudents(false);
      }
    };
    fetchStudents();
  }, [selectedAssignmentKey]);

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.usn || "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonTable rows={10} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
        <div className="w-full md:w-64">
          <label className={`text-sm font-medium mb-1.5 block ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-700'}`}>
            Select Batch & Section
          </label>
          <Select 
            value={selectedAssignmentKey} 
            onValueChange={setSelectedAssignmentKey}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select assignment" />
            </SelectTrigger>
            <SelectContent>
              {assignments.map((asg, idx) => (
                <SelectItem key={`${asg.batch_id}-${asg.section_id}-${idx}`} value={`${asg.batch_id}-${asg.section_id}`}>
                  {asg.batch} - Section {asg.section} ({asg.subject_name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-80 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by USN or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Student List
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              Total: {filteredStudents.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={`${theme === 'dark' ? 'bg-muted/50' : 'bg-gray-50'} text-muted-foreground font-medium border-b border-border/50`}>
                <tr>
                  <th className="px-6 py-3">USN</th>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">Batch</th>
                  <th className="px-6 py-3">Section</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {fetchingStudents ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className={`${theme === 'dark' ? 'hover:bg-muted/30' : 'hover:bg-gray-50/50'} transition-colors`}>
                      <td className="px-6 py-4 font-mono font-medium">{student.usn}</td>
                      <td className="px-6 py-4">{student.name}</td>
                      <td className="px-6 py-4">{student.batch || 'N/A'}</td>
                      <td className="px-6 py-4">{student.section || 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No students found for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchStudents;
