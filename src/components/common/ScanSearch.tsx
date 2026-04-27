import React, { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Search, QrCode, User, Mail, Phone, BookOpen, GitBranch } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

interface ScanSearchProps {
  role: "admin" | "hod";
  setError: (error: string | null) => void;
}

const ScanSearch: React.FC<ScanSearchProps> = ({ role, setError }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { theme } = useTheme();

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setError(null);
    try {
      // Mock search for now - in real implementation, call an API like /api/users/search/?q=...
      setTimeout(() => {
        if (searchQuery.toLowerCase().includes("student") || searchQuery.length > 5) {
          setResult({
            type: "Student",
            name: "John Doe",
            id: "STU12345",
            email: "john@example.com",
            phone: "+91 9876543210",
            batch: "2021-2025",
            branch: "Computer Science",
            status: "Active"
          });
        } else if (searchQuery.toLowerCase().includes("faculty")) {
          setResult({
            type: "Faculty",
            name: "Dr. Smith",
            id: "FAC987",
            email: "smith@example.com",
            phone: "+91 9998887776",
            branch: "Information Technology",
            designation: "Associate Professor"
          });
        } else {
          setError("No user found with this ID.");
          setResult(null);
        }
        setLoading(false);
      }, 800);
    } catch (err) {
      setError("Failed to fetch user info.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className={theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-200 shadow-lg'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="text-primary" />
            {role === 'admin' ? 'Universal User Search' : 'Student / Faculty Lookup'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Enter Student ID, Faculty ID, or Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={theme === 'dark' ? 'pl-10' : 'pl-10 border-gray-300'}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Scan QR
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className={theme === 'dark' ? 'bg-card border-border overflow-hidden' : 'bg-white border-gray-200 shadow-xl overflow-hidden'}>
              <div className="bg-primary/10 p-6 flex items-center justify-between border-b border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{result.name}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold uppercase">
                      {result.type}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono font-bold text-lg">{result.id}</p>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground w-20">Email:</span>
                      <span className="font-medium">{result.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground w-20">Phone:</span>
                      <span className="font-medium">{result.phone}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <GitBranch className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground w-20">Branch:</span>
                      <span className="font-medium">{result.branch}</span>
                    </div>
                    {result.type === 'Student' ? (
                      <div className="flex items-center gap-3 text-sm">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground w-20">Batch:</span>
                        <span className="font-medium">{result.batch}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm">
                        <User className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground w-20">Role:</span>
                        <span className="font-medium">{result.designation}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-border flex gap-3">
                  <Button variant="outline" size="sm">View Full Profile</Button>
                  <Button variant="outline" size="sm">Attendance History</Button>
                  {result.type === 'Student' && <Button variant="outline" size="sm">Academic Marks</Button>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScanSearch;
