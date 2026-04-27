import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_ENDPOINT } from "@/utils/config";

const OnboardingSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setStatus("error");
        return;
      }

      try {
        // We use the existing payment status endpoint but it might need to handle org signup
        const response = await fetch(`${API_ENDPOINT}/payments/status/${sessionId}/`);
        const data = await response.json();
        
        if (data.payment_status === "paid") {
          setStatus("success");
          setDetails(data);
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full bg-primary/40 animate-pulse mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 animate-pulse">Verifying Payment...</h1>
        <p className="text-gray-500 animate-pulse">Please do not close this window.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
          <CheckCircle2 size={40} className="rotate-180" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
        <p className="text-gray-600 mb-8 max-w-md">
          We couldn't verify your payment. If the amount was deducted, your account will be activated shortly.
        </p>
        <Button onClick={() => navigate("/")} variant="outline">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-12 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[hsl(var(--primary))] to-violet-500" />
        
        <div className="w-24 h-24 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-8 text-green-600 relative">
          <PartyPopper size={48} />
          <motion.div 
            className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <CheckCircle2 size={16} />
          </motion.div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">Institution Activated!</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Your institution has been successfully registered and activated. 
          A confirmation email with your administrator login credentials has been sent to your registered email address.
        </p>

        <div className="bg-slate-50 rounded-2xl p-6 mb-10 text-left space-y-3 border border-slate-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Payment Status</span>
            <span className="text-green-600 font-bold uppercase tracking-wider text-xs bg-green-100 px-2 py-0.5 rounded-full">Success</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount Paid</span>
            <span className="text-gray-900 font-semibold">₹{details?.amount_total?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Plan Activated</span>
            <span className="text-primary font-semibold uppercase tracking-wider text-xs">Annual Subscription</span>
          </div>
        </div>

        <Button 
          onClick={() => navigate("/")}
          className="w-full bg-primary hover:bg-primary/90 h-14 rounded-2xl text-white font-bold text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Login to Campus Portal
          <ArrowRight className="ml-2" size={20} />
        </Button>
        
        <p className="mt-8 text-sm text-gray-400">
          Welcome to the future of campus management.
        </p>
      </motion.div>
    </div>
  );
};

export default OnboardingSuccess;
