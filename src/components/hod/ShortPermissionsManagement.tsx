import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Clock, Check, X, User, Calendar, Filter, History } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { SkeletonTable } from "../ui/skeleton";
import api from "../../utils/api";

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

const ShortPermissionsManagement: React.FC<{ setError: any }> = ({ setError }) => {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/hod/short-permissions/');
      if (response.data.success) {
        setRequests(response.data.results || response.data.data || []);
      } else {
        setError(response.data.message || "Failed to fetch requests.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: number, status: "APPROVED" | "REJECTED") => {
    try {
      const response = await api.patch('/hod/short-permissions/', { id, status });
      if (response.data.success) {
        setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
        toast({
          title: `Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
          description: `The permission request has been ${status.toLowerCase()} successfully.`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.data.message || "Action failed."
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.message || "Action failed."
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className={theme === 'dark' ? 'bg-card border-border shadow-xl' : 'bg-white border-gray-200 shadow-xl'}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-primary/5 border-b border-primary/10">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
              <Clock className="w-6 h-6" />
              Short Permission Approvals
            </CardTitle>
            <p className="text-muted-foreground text-sm">Manage 1hr/2hr permission requests from Counselor, Faculty, and MIS staff</p>
          </div>
          <Button variant="outline" size="icon" className="rounded-full">
            <Filter className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : requests.filter(r => r.status === 'PENDING').length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/20">
              <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium text-lg">No pending requests found</p>
              <p className="text-muted-foreground/60 text-sm">All requests have been processed</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="py-4 px-4 font-semibold text-sm">Staff Member</th>
                    <th className="py-4 px-4 font-semibold text-sm text-center">Type</th>
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
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                            {req.user_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{req.user_name}</p>
                            <Badge variant="outline" className="text-[10px] h-4 bg-primary/5 uppercase tracking-tighter">
                              {req.user_role}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge 
                          variant={req.type === '1hr' ? 'outline' : 'secondary'} 
                          className={`font-bold px-3 py-1 rounded-full ${req.type === '1hr' ? 'border-primary/50 text-primary' : 'bg-primary/10 text-primary border-none'}`}
                        >
                          {req.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm line-clamp-2 max-w-[250px] italic text-muted-foreground" title={req.reason}>
                          "{req.reason}"
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col text-xs">
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Calendar className="w-3 h-3 text-primary" /> {req.date}
                          </span>
                          <span className="opacity-70 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(req.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-600 hover:text-white rounded-full px-4"
                            onClick={() => handleAction(req.id, "APPROVED")}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-600 hover:text-white rounded-full px-4"
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
        <Card className="border-dashed bg-muted/10">
          <CardHeader className="py-4 border-b border-border/50">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <History className="w-4 h-4" />
              Recently Processed
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {requests.filter(r => r.status !== 'PENDING').slice(0, 6).map(req => (
                 <div key={req.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${req.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {req.user_name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold truncate">{req.user_name}</p>
                        <p className="text-[10px] text-muted-foreground">{req.type} • {req.date}</p>
                      </div>
                    </div>
                    <Badge className={req.status === 'APPROVED' ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-red-500/10 text-red-600 border-red-200'} variant="outline">
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
