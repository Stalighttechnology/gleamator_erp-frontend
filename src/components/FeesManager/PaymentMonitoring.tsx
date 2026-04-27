import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Calendar,
  IndianRupee,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Download
} from 'lucide-react';

interface Payment {
  id: number;
  invoice: {
    id: number;
    invoice_number: string;
    student: {
      id: number;
      name: string;
      usn: string;
      department: string;
      semester: number;
    };
    fee_assignment: {
      template: {
        name: string;
        fee_type: string;
      };
    };
  };
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentStats {
  total_payments: number;
  total_amount: number;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  refunded_amount: number;
  today_payments: number;
  today_amount: number;
  monthly_payments: number;
  monthly_amount: number;
}

const PaymentMonitoring: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // Helper to normalize amounts (cents or direct amounts) to rupees
  const toRupees = (centsOrAmount: any) => {
    if (centsOrAmount === null || centsOrAmount === undefined) return 0;
    if (Number.isInteger(centsOrAmount)) return centsOrAmount / 100;
    const n = Number(centsOrAmount);
    return isNaN(n) ? 0 : n;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      // Fetch payments and stats in parallel
      const [paymentsRes, statsRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/fees-manager/payments/', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('http://127.0.0.1:8000/api/fees-manager/payment-stats/', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!paymentsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch payment data');
      }

      const [paymentsData, statsData] = await Promise.all([
        paymentsRes.json(),
        statsRes.json(),
      ]);

      // Normalize monetary fields from cents when present
      const normalize = (p: any) => ({
        ...p,
        amount: toRupees(p.amount_cents ?? p.amount),
        payment_method: p.mode ?? p.payment_method ?? 'N/A',
        payment_date: p.timestamp ?? p.payment_date ?? p.created_at ?? null,
        created_at: p.created_at ?? p.timestamp ?? null,
        updated_at: p.updated_at ?? p.timestamp ?? null,
      });

      const normalizedPayments = (paymentsData.data || []).map((p: any) => normalize(p));

      const s = statsData.data || {};
      const normalizedStats = {
        ...s,
        total_amount: toRupees(s.total_amount_cents ?? s.total_amount),
        today_amount: toRupees(s.today_amount_cents ?? s.today_amount),
        monthly_amount: toRupees(s.monthly_amount_cents ?? s.monthly_amount),
        refunded_amount: toRupees(s.refunded_amount_cents ?? s.refunded_amount),
      };

      setPayments(normalizedPayments || []);
      setStats(normalizedStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentDetails = async (paymentId: number) => {
    // Open dialog immediately so the button always responds and user sees loading
    console.debug('fetchPaymentDetails start for', paymentId);
    setSelectedPayment(null);
    setIsDetailLoading(true);
    setIsDetailsDialogOpen(true);
    try {
      console.debug('fetchPaymentDetails called for', paymentId);
      const token = localStorage.getItem('access_token');

      const response = await fetch(`http://127.0.0.1:8000/api/fees-manager/payments/${paymentId}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Failed to fetch payment details', response.status, text);
        throw new Error(`Failed to fetch payment details: ${response.status}`);
      }

      const rawText = await response.text();
      console.debug('payment detail raw response text:', rawText);
      let data = null;
      try { data = rawText ? JSON.parse(rawText) : null; } catch (e) { data = null; }
      // Normalize detail response to match UI expectations
      const p = (data && data.data) ? data.data : (data ?? {});
      const normalized = {
        ...p,
        amount: toRupees(p.amount_cents ?? p.amount),
        payment_method: p.mode ?? p.payment_method ?? 'N/A',
        payment_date: p.timestamp ?? p.payment_date ?? p.created_at ?? null,
        created_at: p.created_at ?? p.timestamp ?? null,
        updated_at: p.updated_at ?? p.timestamp ?? null,
      };
      // Ensure invoice and nested fields exist to avoid render crashes
      if (!normalized.invoice) {
        normalized.invoice = {
          id: null,
          invoice_number: 'N/A',
          student: { id: null, name: 'N/A', usn: '', department: '', semester: '' },
          fee_assignment: { template: { name: 'N/A', fee_type: '' } },
        } as any;
      } else {
        normalized.invoice.student = normalized.invoice.student || { id: null, name: 'N/A', usn: '', department: '', semester: '' };
        normalized.invoice.fee_assignment = normalized.invoice.fee_assignment || { template: { name: 'N/A', fee_type: '' } };
        normalized.invoice.student.department = normalized.invoice.student.department || normalized.invoice.student.branch || '';
        normalized.invoice.student.semester = normalized.invoice.student.semester || '';
      }

      console.debug('normalized payment detail:', normalized);
      setSelectedPayment(normalized);
      setIsDetailLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment details');
      // Close the dialog if we couldn't fetch details
      setIsDetailLoading(false);
      setIsDetailsDialogOpen(false);
    }
  };

  // debug: log when dialog open state or selected payment changes
  useEffect(() => {
    console.debug('Details dialog open:', isDetailsDialogOpen, 'selectedPayment:', selectedPayment, 'loading:', isDetailLoading);
  }, [isDetailsDialogOpen, selectedPayment, isDetailLoading]);

  const processRefund = async (paymentId: number) => {
    if (!confirm('Are you sure you want to process a refund for this payment?')) return;

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`http://127.0.0.1:8000/api/fees-manager/payments/${paymentId}/refund/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process refund');
      }

      await fetchData();
      alert('Refund processed successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    }
  };

  const downloadReceipt = async (paymentId: number) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`http://127.0.0.1:8000/api/fees-manager/payments/${paymentId}/receipt/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to download receipt');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download receipt');
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.invoice.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.invoice.student.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (payment.transaction_id && payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;

    let matchesDate = true;
    if (dateRange !== 'all') {
      const paymentDate = new Date(payment.payment_date);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 3600 * 24));

      switch (dateRange) {
        case 'today':
          matchesDate = daysDiff === 0;
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesMethod && matchesDate;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, label: 'Completed', color: 'text-green-600' },
      pending: { variant: 'secondary' as const, label: 'Pending', color: 'text-yellow-600' },
      failed: { variant: 'destructive' as const, label: 'Failed', color: 'text-red-600' },
      refunded: { variant: 'outline' as const, label: 'Refunded', color: 'text-gray-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMethodBadge = (method: string) => {
    const methodConfig = {
      stripe: { label: 'Stripe', color: 'bg-purple-100 text-purple-800' },
      cash: { label: 'Cash', color: 'bg-green-100 text-green-800' },
      bank_transfer: { label: 'Bank Transfer', color: 'bg-blue-100 text-blue-800' },
      cheque: { label: 'Cheque', color: 'bg-orange-100 text-orange-800' },
    };

    const config = methodConfig[method as keyof typeof methodConfig] || { label: method, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading payment data...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Monitoring</h1>
          <p className="text-muted-foreground mt-2">Track and manage all fee payments and transactions</p>
        </div>
        <Button onClick={fetchData} className="bg-primary hover:bg-primary/90 text-white">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_payments}</p>
                  <p className="text-sm text-green-600 font-semibold">{formatCurrency(stats.total_amount)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{stats.successful_payments}</p>
                  <p className="text-sm text-muted-foreground">payments completed</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.today_amount)}</p>
                  <p className="text-sm text-muted-foreground">{stats.today_payments} payments</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.monthly_amount)}</p>
                  <p className="text-sm text-muted-foreground">{stats.monthly_payments} payments</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending_payments}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed Payments</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed_payments}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Refunded Amount</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.refunded_amount)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by student, invoice, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Transactions ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">No Payments Found</h3>
              <p className="text-muted-foreground">
                {payments.length === 0
                  ? "No payments have been recorded yet"
                  : "No payments match your search criteria"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.invoice.invoice_number}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{payment.invoice.student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.invoice.student.usn}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{getMethodBadge(payment.payment_method)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.transaction_id ? payment.transaction_id.substring(0, 8) + '...' : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchPaymentDetails(payment.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payment.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadReceipt(payment.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {payment.status === 'completed' && payment.payment_method === 'stripe' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => processRefund(payment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Refund
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </DialogTitle>
                <DialogDescription className="sr-only">Details for the selected payment</DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              {/* Payment Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Student Information</h3>
                  <p className="text-foreground"><strong>Name:</strong> {selectedPayment.invoice.student.name}</p>
                  <p className="text-foreground"><strong>USN:</strong> {selectedPayment.invoice.student.usn}</p>
                  <p className="text-foreground"><strong>Department:</strong> {selectedPayment.invoice.student.department}</p>
                  <p className="text-foreground"><strong>Semester:</strong> {selectedPayment.invoice.student.semester}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Payment Information</h3>
                  <div className="text-foreground"><strong>Invoice:</strong> {selectedPayment.invoice?.invoice_number || 'N/A'}</div>
                  <div className="text-foreground"><strong>Fee Type:</strong> {selectedPayment.invoice?.fee_assignment?.template?.name || 'N/A'}</div>
                  <div className="text-foreground"><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</div>
                  <div className="text-foreground"><strong>Status:</strong> {getStatusBadge(selectedPayment.status)}</div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">Payment Method</Label>
                    <div className="mt-1">{getMethodBadge(selectedPayment.payment_method)}</div>
                  </div>
                  <div>
                    <Label className="text-foreground">Payment Date</Label>
                    <p className="mt-1 text-foreground">{new Date(selectedPayment.payment_date).toLocaleString()}</p>
                  </div>
                </div>

                {selectedPayment.transaction_id && (
                  <div>
                    <Label className="text-foreground">Transaction ID</Label>
                    <p className="mt-1 font-mono text-sm text-foreground">{selectedPayment.transaction_id}</p>
                  </div>
                )}

                {selectedPayment.stripe_payment_intent_id && (
                  <div>
                    <Label className="text-foreground">Stripe Payment Intent ID</Label>
                    <p className="mt-1 font-mono text-sm text-foreground">{selectedPayment.stripe_payment_intent_id}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">Created At</Label>
                    <p className="mt-1 text-foreground">{new Date(selectedPayment.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-foreground">Last Updated</Label>
                    <p className="mt-1 text-foreground">{new Date(selectedPayment.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                  Close
                </Button>
                {selectedPayment.status === 'completed' && (
                  <Button onClick={() => downloadReceipt(selectedPayment.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </Button>
                )}
                {selectedPayment.status === 'completed' && selectedPayment.payment_method === 'stripe' && (
                  <Button
                    variant="destructive"
                    onClick={() => processRefund(selectedPayment.id)}
                  >
                    Process Refund
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMonitoring;