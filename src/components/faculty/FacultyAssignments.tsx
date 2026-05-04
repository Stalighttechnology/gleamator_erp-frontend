import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { SkeletonTable } from "../ui/skeleton";
import { useTheme } from "../../context/ThemeContext";
import { FacultyAssignmentsProvider, useFacultyAssignments } from "../../context/FacultyAssignmentsContext";

const FacultyAssignmentsView: React.FC = () => {
  const { assignments, loading } = useFacultyAssignments();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const facultyId = user?.id || user?.pk || user?.faculty_id || user?.username;

  const myAssignments = Array.isArray(assignments)
    ? assignments.filter((a: any) => String(a.faculty_id) === String(facultyId))
    : [];

  const { theme } = useTheme();

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'bg-background text-foreground' : 'bg-gray-50 text-gray-900'}`}>
      <Card className={theme === 'dark' ? 'bg-card text-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <CardTitle>Your Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable rows={5} cols={4} />
          ) : myAssignments.length === 0 ? (
            <div className={`text-center p-6 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>No assignments found.</div>
          ) : (
            <div className={`rounded-md overflow-x-auto ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
              <table className="w-full text-sm">
                <thead className={theme === 'dark' ? 'bg-card sticky top-0 z-10 border-border' : 'bg-gray-100 sticky top-0 z-10 border-gray-300'}>
                  <tr className="border-b">
                    <th className="text-left p-2">Course</th>
                    <th className="text-left p-2">Section</th>
                    <th className="text-left p-2">Semester</th>
                    <th className="text-left p-2">Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {myAssignments.map((assignment: any) => (
                    <tr key={assignment.id} className={`border-b ${theme === 'dark' ? 'border-border' : 'border-gray-300'}`}>
                      <td className="p-2">{assignment.subject}</td>
                      <td className="p-2">{assignment.section}</td>
                      <td className="p-2">{assignment.semester}</td>
                      <td className="p-2">{assignment.branch_name || assignment.branch || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const FacultyAssignments: React.FC = () => {
  return (
    <FacultyAssignmentsProvider>
      <FacultyAssignmentsView />
    </FacultyAssignmentsProvider>
  );
};

export default FacultyAssignments;
