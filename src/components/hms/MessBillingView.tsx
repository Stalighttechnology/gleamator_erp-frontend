import React, { useState, useEffect } from 'react';
import {
  getMessBilling,
  getHostelMessStats,
  getHostels,
} from '../../utils/hms_api';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../hooks/use-toast';
import {
  Receipt,
  TrendingUp,
  Users,
  Utensils,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface MessBilling {
  id: number;
  student_name: string;
  enrollment_no: string;
  hostel_name: string;
  month: string;
  month_display: string;
  total_meals: number;
  meals_consumed: number;
  meals_skipped: number;
  total_cost: number;
  discounted_cost: number;
  paid: boolean;
  paid_date?: string;
}

interface Hostel {
  id: number;
  name: string;
}

interface HostelStats {
  hostel: string;
  month: string;
  statistics: {
    total_students: number;
    total_meals_planned: number;
    total_meals_consumed: number;
    total_meals_skipped: number;
    total_revenue: number;
    paid_amount: number;
  };
}

const MessBillingView: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const isDark = theme === 'dark';

  const [billing, setBilling] = useState<MessBilling[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [stats, setStats] = useState<HostelStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState<string>('');
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedHostel) {
      loadHostelStats(parseInt(selectedHostel));
    }
  }, [selectedHostel]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [billingRes, hostelsRes] = await Promise.all([
        getMessBilling(),
        getHostels(),
      ]);

      if (billingRes.success && billingRes.results) setBilling(billingRes.results);
      if (hostelsRes.success && hostelsRes.results) {
        setHostels(hostelsRes.results);
        if (hostelsRes.results.length > 0) {
          setSelectedHostel(hostelsRes.results[0].id.toString());
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load billing data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHostelStats = async (hostelId: number) => {
    try {
      const response = await getHostelMessStats(hostelId);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load hostel stats:', error);
    }
  };

  const getFilteredBilling = () => {
    let filtered = billing;

    if (selectedHostel) {
      filtered = filtered.filter((b) => b.hostel_name === hostels.find((h) => h.id === parseInt(selectedHostel))?.name);
    }

    if (filterPaid === 'paid') {
      filtered = filtered.filter((b) => b.paid);
    } else if (filterPaid === 'unpaid') {
      filtered = filtered.filter((b) => !b.paid);
    }

    return filtered;
  };

  const filteredBilling = getFilteredBilling();

  const totalRevenue = filteredBilling.reduce((sum, b) => sum + b.discounted_cost, 0);
  const paidAmount = filteredBilling.filter((b) => b.paid).reduce((sum, b) => sum + b.discounted_cost, 0);
  const unpaidAmount = filteredBilling.filter((b) => !b.paid).reduce((sum, b) => sum + b.discounted_cost, 0);

  return (
    <div className={`rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} p-6 shadow-sm`}>
      <div className="mb-6 flex items-center gap-3">
        <Receipt className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Mess Billing Management
        </h2>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div
            className={`rounded-lg border ${
              isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
            } p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Students
                </p>
                <p className={`mt-1 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.statistics.total_students}
                </p>
              </div>
              <Users className={`h-8 w-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
          </div>

          <div
            className={`rounded-lg border ${
              isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
            } p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Revenue
                </p>
                <p className={`mt-1 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ₹{stats.statistics.total_revenue?.toLocaleString() || '0'}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            </div>
          </div>

          <div
            className={`rounded-lg border ${
              isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
            } p-4`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Meals Consumed
                </p>
                <p className={`mt-1 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.statistics.total_meals_consumed}
                </p>
              </div>
              <Utensils className={`h-8 w-8 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Select Hostel
          </label>
          <select
            value={selectedHostel}
            onChange={(e) => setSelectedHostel(e.target.value)}
            className={`mt-1 w-full rounded-lg border ${
              isDark
                ? 'border-slate-600 bg-slate-900 text-white'
                : 'border-gray-300 bg-white text-gray-900'
            } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500`}
          >
            {hostels.map((hostel) => (
              <option key={hostel.id} value={hostel.id}>
                {hostel.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Payment Status
          </label>
          <select
            value={filterPaid}
            onChange={(e) => setFilterPaid(e.target.value as 'all' | 'paid' | 'unpaid')}
            className={`mt-1 w-full rounded-lg border ${
              isDark
                ? 'border-slate-600 bg-slate-900 text-white'
                : 'border-gray-300 bg-white text-gray-900'
            } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500`}
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Total Amount
          </label>
          <div className={`mt-1 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-900' : 'border-gray-300 bg-gray-50'} px-3 py-2`}>
            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ₹{totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className={`mb-6 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'} p-4`}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Paid</p>
            <p className={`mt-1 text-lg font-bold text-green-600`}>₹{paidAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
            <p className={`mt-1 text-lg font-bold text-red-600`}>₹{unpaidAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Collection Rate</p>
            <p className={`mt-1 text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {totalRevenue > 0 ? ((paidAmount / totalRevenue) * 100).toFixed(1) : '0'}%
            </p>
          </div>
        </div>
      </div>

      {/* Billing Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className={`h-8 w-8 animate-spin rounded-full border-4 ${isDark ? 'border-slate-700 border-t-green-400' : 'border-gray-300 border-t-green-600'}`} />
        </div>
      ) : filteredBilling.length === 0 ? (
        <div className={`rounded-lg border-2 border-dashed ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-300 bg-gray-50'} py-8 text-center`}>
          <AlertCircle className={`mx-auto h-12 w-12 ${isDark ? 'text-slate-600' : 'text-gray-400'}`} />
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No billing records found for the selected filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <th className="px-4 py-3 text-left font-semibold">Student</th>
                <th className="px-4 py-3 text-left font-semibold">Enrollment</th>
                <th className="px-4 py-3 text-right font-semibold">Meals</th>
                <th className="px-4 py-3 text-right font-semibold">Cost</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBilling.map((bill) => (
                <tr key={bill.id} className={`border-b ${isDark ? 'border-slate-700 hover:bg-slate-900' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {bill.student_name}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {bill.month_display}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{bill.enrollment_no}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {bill.meals_consumed}/{bill.total_meals}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ₹{bill.discounted_cost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      bill.paid
                        ? isDark
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-green-100 text-green-700'
                        : isDark
                          ? 'bg-red-900/30 text-red-300'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {bill.paid ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MessBillingView;
