
import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import UpgradePlanDialog from "./UpgradePlanDialog";

interface UpgradeRequiredProps {
  featureName: string;
  role: string;
  onBack: () => void;
}

const UpgradeRequired = ({ featureName, role, onBack }: UpgradeRequiredProps) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isAdmin = role === 'admin';
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const orgName = localStorage.getItem("org_name") || "Your Institution";

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl shadow-xl border ${
          theme === 'dark' ? 'bg-card border-border' : 'bg-white border-gray-100'
        }`}
      >
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="text-primary w-10 h-10" />
        </div>
        <h2 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-foreground' : 'text-gray-900'}`}>
          {isAdmin ? "Upgrade Required" : "Feature Restricted"}
        </h2>
        <p className={`text-lg mb-8 max-w-md ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
          {isAdmin ? (
            <>The <span className="font-bold text-primary capitalize">{featureName.replace(/-/g, ' ')}</span> feature is exclusive to our Pro and Advance plans.</>
          ) : (
            <>The <span className="font-bold text-primary capitalize">{featureName.replace(/-/g, ' ')}</span> feature is restricted. Please contact your Institution Admin for a plan upgrade.</>
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          {isAdmin && (
            <Button 
              onClick={() => setIsUpgradeOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white px-8 h-12 text-lg rounded-xl"
            >
              View Plans
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={onBack}
            className={`px-8 h-12 text-lg rounded-xl ${
              theme === 'dark' ? 'border-border' : 'border-gray-200'
            }`}
          >
            {isAdmin ? "Back to Dashboard" : "Return to Home"}
          </Button>
        </div>
        <div className="mt-12 p-4 rounded-xl bg-gray-50 dark:bg-muted/50 border border-dashed border-gray-200 dark:border-border">
          <p className="text-sm text-gray-500 dark:text-muted-foreground italic">
            "Neuro-Campus: Empowering institutions with next-gen AI governance."
          </p>
        </div>
      </motion.div>

      <UpgradePlanDialog 
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        orgName={orgName}
        currentPlan={localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).org_plan : "basic"}
      />
    </>
  );
};

export default UpgradeRequired;
