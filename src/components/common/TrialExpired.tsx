import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ShieldAlert, CreditCard, ArrowRight, Mail, Check, X, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINT } from "@/utils/config";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { toast } from "sonner";

import UpgradePlanDialog from "@/components/common/UpgradePlanDialog";

const TrialExpired = () => {
  const navigate = useNavigate();
  const orgName = localStorage.getItem("org_name") || "Your Organization";
  const role = localStorage.getItem("role");
  const isAdmin = role === "admin" || role === "principal";
  
  const [isSubscription] = useState(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      return userData.org_plan && userData.org_plan !== "basic";
    } catch (e) {
      return false;
    }
  });

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-12 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/30"
          >
            <Clock className="w-12 h-12 text-white" />
          </motion.div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            {isSubscription ? "Subscription Expired" : "Trial Period Expired"}
          </h1>
          <p className="text-indigo-100 text-lg max-w-md mx-auto">
            {isSubscription 
              ? `The annual subscription for `
              : `The 2-hour trial for `
            }
            <span className="font-semibold text-white">{orgName}</span> has come to an end.
          </p>
        </div>
        
        <div className="p-12">
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <ShieldAlert className="w-8 h-8 text-indigo-600 mb-4" />
              <h3 className="font-bold text-slate-900 mb-2">Access Restricted</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Your data is safe, but administrative and faculty features are temporarily locked until the plan is upgraded.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <CreditCard className="w-8 h-8 text-indigo-600 mb-4" />
              <h3 className="font-bold text-slate-900 mb-2">Upgrade to Continue</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Choose from our Pro or Advance plans to unlock full institutional management features.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAdmin ? (
              <Button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl text-base font-semibold transition-all group"
              >
                Renew & Upgrade Now
                <Zap className="ml-2 w-4 h-4 fill-white" />
              </Button>
            ) : (
              <Button 
                disabled
                className="bg-slate-100 text-slate-400 px-8 h-12 rounded-xl text-base font-semibold cursor-not-allowed"
              >
                Contact Admin to Renew
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={() => window.location.href = "mailto:support@stalight.in"}
              className="border-slate-200 text-slate-700 px-8 h-12 rounded-xl text-base font-semibold hover:bg-slate-50"
            >
              <Mail className="mr-2 w-4 h-4" />
              Contact Support
            </Button>
          </div>
          
          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-indigo-600 text-sm font-medium transition-colors"
            >
              Logout and return to home
            </button>
          </div>
        </div>
      </motion.div>

      <UpgradePlanDialog 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        orgName={orgName}
        currentPlan={localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).org_plan : "basic"}
        onSuccess={() => {
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        }}
      />
    </div>
  );
};

export default TrialExpired;
