import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Clock, Send, CheckCircle2, History, Calendar, Badge as BadgeIcon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "../ui/badge";
import api from "../../utils/api";

interface HistoryRequest {
  id: number;
  type: string;
  date: string;
  reason: string;
  status: string;
  submitted_at: string;
}

const ShortPermissionRequest: React.FC = () => {
  const [permissionType, setPermissionType] = useState<"1hr" | "2hr">("1hr");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<HistoryRequest[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();

  const fetchHistory = async () => {
    setFetchingHistory(true);
    try {
      const response = await api.get('/hod/short-permissions/submit/');
      if (response.data.success) {
        setHistory(response.data.results || response.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setFetchingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [submitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason required",
        description: "Please provide a reason for your request."
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/hod/short-permissions/submit/', {
        type: permissionType,
        reason: reason
      });
      
      if (response.data.success) {
        setSubmitted(true);
        toast({
          title: "Request Submitted",
          description: "Your permission request has been sent to the Center Manager for approval."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: response.data.message || "Failed to submit request."
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.message || "Failed to submit request. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-card rounded-2xl border border-border shadow-xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-14 h-14 text-green-500" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-3">Request Submitted!</h2>
        <p className="text-muted-foreground mb-8 max-w-md text-lg">
          Your <span className="font-bold text-primary">{permissionType}</span> permission request is pending approval from the Center Manager.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" size="lg" onClick={() => { setSubmitted(false); setReason(""); }}>
            Apply for Another
          </Button>
          <Button size="lg" onClick={() => setSubmitted(false)}>
            Back to Dashboard
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <Card className={theme === 'dark' ? 'bg-card border-border shadow-2xl overflow-hidden' : 'bg-white border-gray-200 shadow-2xl overflow-hidden'}>
            <CardHeader className="bg-primary/5 border-b border-primary/10 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold text-primary">
                    <Clock className="w-6 h-6" />
                    Short Permission
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Submit request for 1 or 2-hour permissions</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-none font-bold">New Request</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Permission Duration</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setPermissionType("1hr")}
                      className={`flex-1 py-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 relative overflow-hidden group ${
                        permissionType === "1hr"
                          ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10"
                          : "border-border bg-transparent hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <span className="text-2xl font-black">1 HOUR</span>
                      <span className="text-xs font-medium opacity-60">Brief / Emergency</span>
                      {permissionType === "1hr" && (
                         <motion.div layoutId="active-bg" className="absolute top-0 right-0 p-2">
                           <CheckCircle2 className="w-5 h-5 text-primary" />
                         </motion.div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermissionType("2hr")}
                      className={`flex-1 py-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 relative overflow-hidden group ${
                        permissionType === "2hr"
                          ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10"
                          : "border-border bg-transparent hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <span className="text-2xl font-black">2 HOURS</span>
                      <span className="text-xs font-medium opacity-60">Personal Work</span>
                      {permissionType === "2hr" && (
                         <motion.div layoutId="active-bg" className="absolute top-0 right-0 p-2">
                           <CheckCircle2 className="w-5 h-5 text-primary" />
                         </motion.div>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Detailed Reason</label>
                  <div className="relative">
                    <Textarea
                      placeholder="Please provide a valid reason for your short permission..."
                      className="min-h-[150px] resize-none rounded-2xl border-border focus:ring-primary/20 transition-all p-4 text-base"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md backdrop-blur-sm">
                      {reason.length} characters
                    </div>
                  </div>
                </div>

                <Button className="w-full h-16 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 group relative overflow-hidden" disabled={loading}>
                   <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                   <span className="relative flex items-center justify-center gap-3">
                    {loading ? "PROCESSING..." : (
                      <>
                        SUBMIT REQUEST <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                   </span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-dashed h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground font-bold">
                <History className="w-5 h-5" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fetchingHistory ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                   <BadgeIcon className="w-12 h-12 mx-auto mb-4" />
                   <p className="text-sm font-medium">No recent requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {history.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 rounded-2xl bg-card border border-border shadow-sm group hover:border-primary/30 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                           <Badge variant="secondary" className="font-bold text-[10px] h-5">{item.type.toUpperCase()}</Badge>
                           <Badge className={`font-bold text-[10px] h-5 ${
                             item.status === 'PENDING' ? 'bg-orange-500' : 
                             item.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
                           }`}>
                             {item.status}
                           </Badge>
                        </div>
                        <p className="text-sm font-medium line-clamp-1 mb-2">"{item.reason}"</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground border-t border-border/50 pt-2">
                           <span className="flex items-center gap-1 font-bold">
                             <Calendar className="w-3 h-3" /> {item.date}
                           </span>
                           <span className="flex items-center gap-1">
                             <Clock className="w-3 h-3" /> {new Date(item.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShortPermissionRequest;
