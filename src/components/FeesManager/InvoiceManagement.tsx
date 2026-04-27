import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Eye,
  Search,
  Calendar,
  IndianRupee,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Printer
} from 'lucide-react';

interface Invoice {
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
    id: number;
    template: {
      name: string;
      fee_type: string;
    };
    academic_year: string;
  } | null;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  due_date: string;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  created_at: string;
  updated_at: string;
  academic_year?: string;
}

interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id?: string;
  status: string;
}

const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesMeta, setInvoicesMeta] = useState<any | null>(null);
  const [statsData, setStatsData] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    fetchInvoices(1);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/fees-manager/stats/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const d = await res.json();
      // backend returns totals and counts; prefer *_cents keys for amounts
      let sd = d.data || d || null;

      // If server stats don't include pending/overdue monetary sums, fetch fees_reports summary
      const needsPending = !(sd && (sd.pending_amount !== undefined || sd.pending_amount_cents !== undefined));
      const needsOverdue = !(sd && (sd.overdue_amount !== undefined || sd.overdue_amount_cents !== undefined));

      if ((needsPending || needsOverdue)) {
        try {
          const rr = await fetch('http://127.0.0.1:8000/api/fees-manager/fees-reports/?date_range=all', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (rr.ok) {
            const rd = await rr.json();
            const summary = rd?.summary || rd?.data?.summary || rd?.report_data?.summary || rd?.report_data || rd;
            if (summary) {
              sd = sd || {};
              if (summary.pending_amount !== undefined) sd.pending_amount = summary.pending_amount;
              if (summary.overdue_amount !== undefined) sd.overdue_amount = summary.overdue_amount;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // normalize to cents where useful
      if (sd) {
        if (sd.pending_amount !== undefined && sd.pending_amount_cents === undefined) sd.pending_amount_cents = Math.round(Number(sd.pending_amount) * 100);
        if (sd.overdue_amount !== undefined && sd.overdue_amount_cents === undefined) sd.overdue_amount_cents = Math.round(Number(sd.overdue_amount) * 100);
        if (sd.total_revenue !== undefined && sd.total_revenue_cents === undefined) sd.total_revenue_cents = Math.round(Number(sd.total_revenue) * 100);
      }

      setStatsData(sd);
    } catch (e) {
      // ignore
    }
  };

  const fetchInvoices = async (page: number = 1, page_size: number = 50) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const url = `http://127.0.0.1:8000/api/fees-manager/invoices/?page=${page}&page_size=${page_size}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      // Normalize monetary fields: prefer *_cents when present
      const toRupees = (centsOrAmount: any) => {
        if (centsOrAmount === null || centsOrAmount === undefined) return 0;
        if (Number.isInteger(centsOrAmount)) return centsOrAmount / 100;
        const n = Number(centsOrAmount);
        return isNaN(n) ? 0 : n;
      };
      // Support different response shapes:
      // - { data: [...], meta: {...} }
      // - { invoices: [...], meta: {...} } (safe view)
      const list = data.data ?? data.invoices ?? [];
      const meta = data.meta ?? null;

      const normalized = (list || []).map((inv: any) => ({
        ...inv,
        total_amount: toRupees(inv.total_amount_cents ?? inv.total_amount),
        paid_amount: toRupees(inv.paid_amount_cents ?? inv.paid_amount),
        pending_amount: toRupees(inv.pending_amount_cents ?? inv.pending_amount),
      }));

      setInvoices(normalized);
      setInvoicesMeta(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoicesPageChange = (newPage: number) => {
    const page = Math.max(1, newPage);
    fetchInvoices(page);
  };

  const fetchInvoiceDetails = async (invoiceId: number) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`http://127.0.0.1:8000/api/fees-manager/invoices/${invoiceId}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoice details');
      }

      const data = await response.json();
      // Normalize invoice and payments amounts
      const toRupees = (centsOrAmount: any) => {
        if (centsOrAmount === null || centsOrAmount === undefined) return 0;
        if (Number.isInteger(centsOrAmount)) return centsOrAmount / 100;
        const n = Number(centsOrAmount);
        return isNaN(n) ? 0 : n;
      };
      // invoice detail may be returned as { data: {...} } or { ... }
      const inv = data.data ?? data ?? {};
      const normalizedInvoice = {
        ...inv,
        total_amount: toRupees(inv.total_amount_cents ?? inv.total_amount),
        paid_amount: toRupees(inv.paid_amount_cents ?? inv.paid_amount),
        pending_amount: toRupees(inv.pending_amount_cents ?? inv.pending_amount),
      };

      const normalizedPayments = (inv.payments || []).map((p: any) => ({
        ...p,
        amount: toRupees(p.amount_cents ?? p.amount),
        payment_date: p.payment_date,
      }));

      setSelectedInvoice(normalizedInvoice);
      setPayments(normalizedPayments || []);
      setIsDetailsDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice details');
    }
  };

  const downloadInvoice = async (invoiceId: number) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`http://127.0.0.1:8000/api/fees-manager/invoices/${invoiceId}/download/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download invoice');
    }
  };

  const sendInvoiceReminder = async (invoiceId: number) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`http://127.0.0.1:8000/api/fees-manager/invoices/${invoiceId}/remind/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      // Show success message
      alert('Reminder sent successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminder');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.student.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    let matchesDate = true;
    if (dateRange !== 'all') {
      const invoiceDate = new Date(invoice.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - invoiceDate.getTime()) / (1000 * 3600 * 24));

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
        case 'overdue':
          matchesDate = invoice.status === 'overdue';
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      unpaid: { variant: 'destructive' as const, label: 'Unpaid' },
      partially_paid: { variant: 'secondary' as const, label: 'Partially Paid' },
      paid: { variant: 'default' as const, label: 'Paid' },
      overdue: { variant: 'destructive' as const, label: 'Overdue' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusStats = () => {
    const stats = {
      total: invoices.length,
      paid: invoices.filter(i => i.status === 'paid').length,
      unpaid: invoices.filter(i => i.status === 'unpaid').length,
      partially_paid: invoices.filter(i => i.status === 'partially_paid').length,
      overdue: invoices.filter(i => i.status === 'overdue').length,
    };
    return stats;
  };

  const stats = statsData
    ? {
        // prefer server-provided invoice count, otherwise use paginator count or client list length
        total: statsData.total_invoices ?? invoicesMeta?.count ?? invoices.length,
        paid: statsData.completed_payments ?? invoices.filter(i => i.status === 'paid').length,
        unpaid: invoices.filter(i => i.status === 'unpaid').length,
        partially_paid: invoices.filter(i => i.status === 'partially_paid').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
      }
    : getStatusStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading invoices...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice Management</h1>
          <p className="text-muted-foreground mt-2">Manage student fee invoices and payment tracking</p>
        </div>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
          
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unpaid</p>
                {statsData && (statsData.outstanding_amount_cents ?? statsData.outstanding_amount) ? (
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(((statsData.outstanding_amount_cents ?? statsData.outstanding_amount) || 0) / 100)}</p>
                ) : (
                  <p className="text-2xl font-bold text-red-600">{stats.unpaid}</p>
                )}
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Partial</p>
                {/* show pending monetary total when available, otherwise show count */}
                {statsData && (statsData.pending_amount_cents ?? statsData.pending_amount) ? (
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(((statsData.pending_amount_cents ?? statsData.pending_amount) || 0) / 100)}</p>
                ) : (
                  <p className="text-2xl font-bold text-yellow-600">{stats.partially_paid}</p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                {statsData && (statsData.overdue_amount_cents ?? statsData.overdue_amount) ? (
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(((statsData.overdue_amount_cents ?? statsData.overdue_amount) || 0) / 100)}</p>
                ) : (
                  <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by student name, USN, or invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="overdue">Overdue Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices ({filteredInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">No Invoices Found</h3>
              <p className="text-muted-foreground">
                {invoices.length === 0
                  ? "No invoices have been generated yet"
                  : "No invoices match your search criteria"
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
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Pending Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{invoice.student.name}</TableCell>
                      <TableCell className="text-muted-foreground">{invoice.student.usn}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {invoice.fee_assignment?.template?.name || '-'}
                          </p>
                          {invoice.fee_assignment?.template?.fee_type ? (
                            <p className="text-sm text-muted-foreground">
                              {invoice.fee_assignment.template.fee_type}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(invoice.total_amount)}
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {formatCurrency(invoice.paid_amount)}
                      </TableCell>
                      <TableCell className="text-red-600 font-semibold">
                        {formatCurrency(invoice.pending_amount)}
                      </TableCell>
                      <TableCell>
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchInvoiceDetails(invoice.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadInvoice(invoice.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {invoice.status !== 'paid' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendInvoiceReminder(invoice.id)}
                            >
                              <Mail className="h-4 w-4" />
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

      {/* Pagination controls for invoices (placed under the table) */}
      {invoicesMeta && (
        <div className="flex items-center justify-end gap-2 p-4 mt-4 container mx-auto">
          <div className="text-sm text-muted-foreground mr-auto">Total: {invoicesMeta.count}</div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleInvoicesPageChange((invoicesMeta.page || 1) - 1)}
            disabled={!invoicesMeta.has_previous}
          >
            Prev
          </Button>
          <div className="px-3 text-sm">Page {invoicesMeta.page} of {invoicesMeta.total_pages}</div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleInvoicesPageChange((invoicesMeta.page || 1) + 1)}
            disabled={!invoicesMeta.has_next}
          >
            Next
          </Button>
        </div>
      )}

      {/* Invoice Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details - {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Student Information</h3>
                  <p className="text-foreground"><strong>Name:</strong> {selectedInvoice.student.name}</p>
                  <p className="text-foreground"><strong>USN:</strong> {selectedInvoice.student.usn}</p>
                  <p className="text-foreground"><strong>Department:</strong> {selectedInvoice.student.department}</p>
                  <p className="text-foreground"><strong>Semester:</strong> {selectedInvoice.student.semester}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Invoice Information</h3>
                  <p className="text-foreground"><strong>Invoice #:</strong> {selectedInvoice.invoice_number}</p>
                  <p className="text-foreground"><strong>Fee Type:</strong> {selectedInvoice.fee_assignment?.template?.name || 'N/A'}</p>
                  <p className="text-foreground"><strong>Academic Year:</strong> {selectedInvoice.fee_assignment?.academic_year || selectedInvoice.academic_year || 'N/A'}</p>
                  <p className="text-foreground"><strong>Created:</strong> {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(selectedInvoice.total_amount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(selectedInvoice.paid_amount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium text-muted-foreground">Pending Amount</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(selectedInvoice.pending_amount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="font-semibold mb-4 text-foreground">Payment History</h3>
                {payments.length === 0 ? (
                  <p className="text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>{payment.payment_method}</TableCell>
                          <TableCell>{payment.transaction_id || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => downloadInvoice(selectedInvoice.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {selectedInvoice.status !== 'paid' && (
                  <Button onClick={() => sendInvoiceReminder(selectedInvoice.id)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminder
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

export default InvoiceManagement;