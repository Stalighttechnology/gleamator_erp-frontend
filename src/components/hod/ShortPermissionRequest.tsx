import React, { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Clock, Send, CheckCircle2, History } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { motion } from "framer-motion";

const ShortPermissionRequest: React.FC = () => {
  const [permissionType, setPermissionType] = useState<"1hr" | "2hr">("1hr");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();

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
      // API Call would go here: post /api/short-permissions/
      setTimeout(() => {
        setLoading(false);
        setSubmitted(true);
        toast({
          title: "Request Submitted",
          description: "Your permission request has been sent to the Center Manager for approval."
        });
      }, 1000);
    } catch (err) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit request. Please try again."
      });
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4"
        >
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Request Submitted Successfully!</h2>
        <p className="text-muted-foreground mb-6">
          Your {permissionType} request is pending approval from the Center Manager.
        </p>
        <Button onClick={() => { setSubmitted(false); setReason(""); }}>
          Submit Another Request
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className={theme === 'dark' ? 'bg-card border-border shadow-xl' : 'bg-white border-gray-200 shadow-xl'}>
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Clock className="w-5 h-5" />
            Short Permission Request
          </CardTitle>
          <p className="text-sm text-muted-foreground">Apply for 1-hour or 2-hour permissions (Requires Manager Approval)</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold">Permission Duration</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPermissionType("1hr")}
                  className={`flex-1 py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    permissionType === "1hr"
                      ? "border-primary bg-primary/10 text-primary shadow-inner"
                      : "border-border bg-transparent hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl font-bold">1 Hour</span>
                  <span className="text-xs opacity-70">Emergency / Brief</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPermissionType("2hr")}
                  className={`flex-1 py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    permissionType === "2hr"
                      ? "border-primary bg-primary/10 text-primary shadow-inner"
                      : "border-border bg-transparent hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl font-bold">2 Hours</span>
                  <span className="text-xs opacity-70">Standard Personal Work</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Reason for Permission</label>
              <Textarea
                placeholder="Briefly explain why you need this permission..."
                className="min-h-[120px] resize-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <Button className="w-full h-12 text-lg font-bold" disabled={loading}>
              {loading ? "Submitting..." : (
                <span className="flex items-center gap-2">
                  Submit Request <Send className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={theme === 'dark' ? 'bg-card/50' : 'bg-gray-50 border-dashed'}>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <History className="w-4 h-4" />
            Recent Request Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-sm italic text-muted-foreground">
            No recent requests found in the last 7 days.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShortPermissionRequest;
