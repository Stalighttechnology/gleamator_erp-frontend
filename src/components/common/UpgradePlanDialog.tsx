
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { toast } from "sonner";

interface UpgradePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
  onSuccess?: () => void;
  currentPlan?: string;
}

const UpgradePlanDialog = ({ isOpen, onClose, orgName = "Your Organization", onSuccess, currentPlan = "basic" }: UpgradePlanDialogProps) => {
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "advance" | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const isBasic = currentPlan.toLowerCase().includes('basic');
  const isPro = currentPlan.toLowerCase().includes('pro');

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    
    setIsUpgrading(true);
    try {
      const response = await fetchWithTokenRefresh(`${API_ENDPOINT}/organizations/upgrade-plan/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const result = await response.json();
      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else if (result.success) {
        toast.success(`Successfully upgraded to ${selectedPlan.toUpperCase()} plan!`);
        
        // Update local storage user data if possible
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            user.org_plan = selectedPlan;
            localStorage.setItem("user", JSON.stringify(user));
          } catch (e) {
            console.error("Failed to update local user plan", e);
          }
        }

        if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
        onClose();
      } else {
        toast.error(result.message || "Upgrade failed");
      }
    } catch (error) {
      toast.error("An error occurred during upgrade");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Select Your New Plan</h2>
                <p className="text-slate-500 text-sm">Upgrade <span className="font-medium text-indigo-600">{orgName}</span> to continue</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className={`p-8 grid gap-8 ${isBasic ? 'md:grid-cols-2' : 'max-w-md mx-auto w-full'}`}>
              {/* Pro Plan - Only show if current plan is basic */}
              {isBasic && (
                <div 
                  onClick={() => setSelectedPlan("pro")}
                  className={`relative p-8 rounded-2xl border-2 transition-all cursor-pointer group ${
                    selectedPlan === "pro" 
                      ? "border-indigo-600 bg-indigo-50/30" 
                      : "border-slate-100 hover:border-indigo-200"
                  }`}
                >
                  {selectedPlan === "pro" && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="mb-6">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">Most Popular</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro Plan</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-slate-900">₹99,999</span>
                    <span className="text-slate-500">/year</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {["All Basic features", "Unlimited Students", "AI Exam Proctoring", "Face Recognition Attendance", "Priority 24/7 Support"].map((feat, i) => (
                      <li key={i} className="flex items-center text-slate-600 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 mr-3 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advance Plan - Show for both Basic and Pro */}
              <div 
                onClick={() => setSelectedPlan("advance")}
                className={`relative p-8 rounded-2xl border-2 transition-all cursor-pointer group ${
                  selectedPlan === "advance" 
                    ? "border-violet-600 bg-violet-50/30" 
                    : "border-slate-100 hover:border-violet-200"
                } ${!isBasic ? 'w-full' : ''}`}
              >
                {selectedPlan === "advance" && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="mb-6">
                  <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full uppercase tracking-wider flex items-center w-fit">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Enterprise Power
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Advance Plan</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-slate-900">₹3,00,000</span>
                  <span className="text-slate-500">/year</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {["Everything in Pro", "White-label Branding", "Custom API Integrations", "On-premise Deployment", "Dedicated Account Manager"].map((feat, i) => (
                    <li key={i} className="flex items-center text-slate-600 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 mr-3 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-slate-500 text-sm">
                Your organization will be upgraded instantly.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="outline"
                  onClick={onClose}
                  className="h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={!selectedPlan || isUpgrading}
                  onClick={handleUpgrade}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-8 rounded-xl font-semibold shadow-lg shadow-indigo-200"
                >
                  {isUpgrading ? "Upgrading..." : `Confirm & Upgrade to ${selectedPlan ? selectedPlan.toUpperCase() : ""}`}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpgradePlanDialog;
