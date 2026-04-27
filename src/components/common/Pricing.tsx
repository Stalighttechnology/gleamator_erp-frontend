import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, Zap, Shield, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Basic",
      price: "Trial",
      duration: "2 Hours",
      description: "Perfect for exploring the core features of NeuroCampus.",
      features: [
        "Student & Faculty MGMT",
        "Attendance Tracking",
        "Marks & Grading",
        "Timetable & Resources"
      ],
      icon: <Zap className="text-blue-500" size={24} />,
      color: "blue",
      link: "/neurocampus/basic"
    },
    {
      name: "Pro",
      price: "₹99,999",
      duration: "/year",
      description: "Advanced tools for growing institutions with full AI power.",
      features: [
        "All Basic Features",
        "Fees Management",
        "Advanced Reports",
        "Promotion Tools",
        "AI General Assistance"
      ],
      icon: <Shield className="text-primary" size={24} />,
      color: "purple",
      link: "/neurocampus/pro",
      popular: true
    },
    {
      name: "Advance",
      price: "₹3,00,000",
      duration: "/year",
      description: "Complete digital transformation for large universities.",
      features: [
        "All Pro Features",
        "AI Study Mode (PDF Bot)",
        "AI Mock Interviews",
        "Hostel Management (HMS)",
        "Outcome Based Education"
      ],
      icon: <Crown className="text-amber-500" size={24} />,
      color: "gold",
      link: "/neurocampus/advance"
    }
  ];

  return (
    <div className="min-h-screen bg-white py-20 px-4">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-primary font-semibold tracking-wide uppercase mb-3"
        >
          Pricing Plans
        </motion.h2>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
        >
          Choose the right plan for <br />your institution
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600 text-lg max-w-2xl mx-auto"
        >
          Whether you're a small coaching center or a large university, we have a plan that fits your needs and budget.
        </motion.p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
            className={`relative p-8 rounded-3xl border ${
              plan.popular ? 'border-primary shadow-xl shadow-primary/10' : 'border-gray-100 shadow-lg shadow-gray-100'
            } bg-white flex flex-col`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
            )}
            
            <div className="mb-8">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                {plan.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-500 text-sm mb-6">{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500 font-medium">{plan.duration}</span>
              </div>
            </div>

            <div className="space-y-4 mb-10 flex-grow">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate(plan.link)}
              className={`w-full h-12 rounded-xl text-lg font-semibold transition-all ${
                plan.popular 
                  ? 'bg-primary hover:bg-primary/90 text-white' 
                  : 'bg-gray-900 hover:bg-gray-800 text-white'
              }`}
            >
              Get Started
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </motion.div>
        ))}
      </div>
      {/* Detailed Feature Comparison Section */}
      <div className="max-w-7xl mx-auto mt-24 mb-32 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Detailed Feature Comparison</h2>
          <p className="text-gray-600">See exactly what each plan includes and find the perfect fit for your institution's specific requirements.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="overflow-x-auto"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-6 px-4 text-sm font-semibold text-gray-400 uppercase tracking-wider w-1/2">Features & Capabilities</th>
                <th className="py-6 px-4 text-center text-[#3b82f6] font-bold text-xs uppercase tracking-widest">Basic</th>
                <th className="py-6 px-4 text-center text-primary font-bold text-xs uppercase tracking-widest">Pro</th>
                <th className="py-6 px-4 text-center text-[#ff59f8] font-bold text-xs uppercase tracking-widest">Advance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { name: "Academic Management", basic: true, pro: true, advance: true },
                { name: "Attendance & Marks", basic: true, pro: true, advance: true },
                { name: "Timetable & Resources", basic: true, pro: true, advance: true },
                { name: "Fees Management", basic: false, pro: true, advance: true },
                { name: "Administrative Reports", basic: false, pro: true, advance: true },
                { name: "Promotion Management", basic: false, pro: true, advance: true },
                { name: "AI Study Mode (PDF Bot)", basic: false, pro: false, advance: true },
                { name: "AI Mock Interviews", basic: false, pro: false, advance: true },
                { name: "Hostel Management (HMS)", basic: false, pro: false, advance: true },
                { name: "Outcome Based Education", basic: false, pro: false, advance: true },
                { name: "Bulk Data Import", basic: false, pro: false, advance: true },
              ].map((row, i) => (
                <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-5 px-4 text-gray-700 font-medium">{row.name}</td>
                  <td className="py-5 px-4 text-center">
                    {row.basic ? <Check className="mx-auto text-blue-500" size={20} /> : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="py-5 px-4 text-center">
                    {row.pro ? <Check className="mx-auto text-primary" size={20} /> : <span className="text-gray-200">—</span>}
                  </td>
                  <td className="py-5 px-4 text-center">
                    {row.advance ? <Check className="mx-auto text-[#ff59f8]" size={20} /> : <span className="text-gray-200">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;
