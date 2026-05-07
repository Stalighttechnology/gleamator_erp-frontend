import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Clock, Check, X, User, Calendar, Filter } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { SkeletonTable } from "../ui/skeleton";

interface PermissionRequest {
  id: number;
  user_name: string;
  user_role: string;
  type: "1hr" | "2hr";
  reason: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submitted_at: string;
}

const ShortPermissionsManagement: React.FC<{ setError: any, toast: any }> = ({ setError, toast }) => {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Mock API call: get /api/short-permissions/
      setTimeout(() => {
        setRequests([
          {
            id: 1,
            user_name: "John Counselor",
            user_role: "Counselor",
            type: "1hr",
            reason: "Personal bank work during lunch break extend",
            date: "2026-04-27",
            status: "PENDING",
            submitted_at: "2026-04-27T10:30:00Z"
          },
          {
            id: 2,
            user_name: "Sarah MIS",
            user_role: "Counselor",
            type: "2hr",
            reason: "Hospital appointment for family member",
            date: "2026-04-27",
            status: "PENDING",
            submitted_at: "2026-04-27T09:15:00Z"
          }
        ]);
        setLoading(false);
      }, 800);
    } catch (err) {
      setError("Failed to fetch requests.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: number, status: "APPROVED" | "REJECTED") => {
    // API Call: patch /api/short-permissions/{id}/
    setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
    toast({
      title: `Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
      description: `The permission request has been ${status.toLowerCase()} successfully.`
    });
  };

  return (
    <div className="space-y-6">
      <Card className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-sm'}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Clock className="text-primary" />
              Short Permission Approvals
            </CardTitle>
            <p className="text-muted-foreground">Manage 1hr/2hr permission requests from Counselor and MIS staff</p>
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : requests.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">No pending requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 px-4 font-semibold text-sm">Staff Member</th>
                    <th className="py-4 px-4 font-semibold text-sm">Type</th>
                    <th className="py-4 px-4 font-semibold text-sm">Reason</th>
                    <th className="py-4 px-4 font-semibold text-sm">Submitted</th>
                    <th className="py-4 px-4 font-semibold text-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.filter(r => r.status === 'PENDING').map((req) => (
                    <tr key={req.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {req.user_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{req.user_name}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{req.user_role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={req.type === '1hr' ? 'outline' : 'secondary'} className="font-bold">
                          {req.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm line-clamp-1 max-w-[200px]" title={req.reason}>
                          {req.reason}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col text-xs">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3" /> {req.date}
                          </span>
                          <span className="opacity-70 mt-0.5">
                            {new Date(req.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500 hover:text-white"
                            onClick={() => handleAction(req.id, "APPROVED")}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500 hover:text-white"
                            onClick={() => handleAction(req.id, "REJECTED")}
                          >
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recently Processed */}
      {requests.filter(r => r.status !== 'PENDING').length > 0 && (
        <Card className="opacity-70">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recently Processed</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-3">
               {requests.filter(r => r.status !== 'PENDING').map(req => (
                 <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{req.user_name}</span>
                      <Badge variant="outline" className="text-[10px] h-4">{req.type}</Badge>
                    </div>
                    <Badge className={req.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'}>
                      {req.status}
                    </Badge>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShortPermissionsManagement;
