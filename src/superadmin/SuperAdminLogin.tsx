import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { useToast } from "../hooks/use-toast";
import { ShieldAlert } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface Props {
  setIsAuthenticated: (val: boolean) => void;
}

const SuperAdminLogin = ({ setIsAuthenticated }: Props) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/superadmin/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("superadmin_token", data.access);
        localStorage.setItem("superadmin_refresh", data.refresh);
        localStorage.setItem("superadmin_role", data.role);
        
        setIsAuthenticated(true);
        navigate("/neurocampus/admin/dashboard");
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: data.error || "Invalid credentials",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-gray-50'}`}>
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <ShieldAlert className="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Super Admin Portal</CardTitle>
          <CardDescription className="text-md">
            Restricted Access. Authorized personnel only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Admin Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Login to System"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t py-4 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Stalight - Neuro Campus
        </CardFooter>
      </Card>
    </div>
  );
};

export default SuperAdminLogin;
