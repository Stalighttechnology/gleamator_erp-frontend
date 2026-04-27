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
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  Calendar,
  FileText,
  Users,
  IndianRupee,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';

interface ReportData {
  summary: {
    total_students: number;
    total_invoices: number;
    total_payments: number;
    total_revenue: number;
    pending_amount: number;
    overdue_amount: number;
  };
  department_wise: Array<{
    department: string;
    students: number;
    revenue: number;
    pending: number;
  }>;
  fee_type_wise: Array<{
    fee_type: string;
    count: number;
    revenue: number;
  }>;
  monthly_trends: Array<{
    month: string;
    revenue: number;
    payments: number;
  }>;
  overdue_invoices: Array<{
    invoice_number: string;
    student_name: string;
    usn: string;
    amount: number;
    due_date: string;
    days_overdue: number;
  }>;
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange, startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const params = new URLSearchParams({
        report_type: reportType,
        date_range: dateRange,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      });

      const response = await fetch(`http://127.0.0.1:8000/api/fees-manager/reports/?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const data = await response.json();
      // Ensure all required arrays exist with defaults
      const reportData = data.data || {};
      setReportData({
        summary: reportData.summary || {
          total_students: 0,
          total_invoices: 0,
          total_payments: 0,
          total_revenue: 0,
          pending_amount: 0,
          overdue_amount: 0,
        },
        department_wise: reportData.department_wise || [],
        fee_type_wise: reportData.fee_type_wise || [],
        monthly_trends: reportData.monthly_trends || [],
        overdue_invoices: reportData.overdue_invoices || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const token = localStorage.getItem('access_token');

      const params = new URLSearchParams({
        report_type: reportType,
        date_range: dateRange,
        format: format,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      });

      const response = await fetch(`http://127.0.0.1:8000/api/fees-manager/reports/download/?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fee_report_${reportType}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download report');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getDateRangeOptions = () => {
    const now = new Date();
    const options = [
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: 'quarter', label: 'This Quarter' },
      { value: 'year', label: 'This Year' },
      { value: 'custom', label: 'Custom Range' },
    ];
    return options;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Generating reports...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fee Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive insights into fee collection and payment trends</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => downloadReport('pdf')}
            className="bg-primary hover:bg-primary/90 text-white border-primary"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={() => downloadReport('excel')}
            className="bg-primary hover:bg-primary/90 text-white border-primary"
          >
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="department">Department-wise</SelectItem>
                  <SelectItem value="fee_type">Fee Type Analysis</SelectItem>
                  <SelectItem value="trends">Monthly Trends</SelectItem>
                  <SelectItem value="overdue">Overdue Invoices</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  {getDateRangeOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportData && (
        <Tabs value={reportType} onValueChange={setReportType} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="department">Departments</TabsTrigger>
            <TabsTrigger value="fee_type">Fee Types</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>

          {/* Summary Report */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(reportData.summary?.total_revenue || 0)}
                      </p>
                    </div>
                    <IndianRupee className="h-12 w-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Amount</p>
                      <p className="text-3xl font-bold text-yellow-600">
                        {formatCurrency(reportData.summary?.pending_amount || 0)}
                      </p>
                    </div>
                    <Clock className="h-12 w-12 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                      <p className="text-3xl font-bold text-red-600">
                        {formatCurrency(reportData.summary?.overdue_amount || 0)}
                      </p>
                    </div>
                    <AlertTriangle className="h-12 w-12 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                      <p className="text-3xl font-bold text-foreground">{reportData.summary?.total_students || 0}</p>
                    </div>
                    <Users className="h-12 w-12 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                      <p className="text-3xl font-bold text-foreground">{reportData.summary?.total_invoices || 0}</p>
                    </div>
                    <FileText className="h-12 w-12 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Payments</p>
                      <p className="text-3xl font-bold text-foreground">{reportData.summary?.total_payments || 0}</p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Department-wise Report */}
          <TabsContent value="department" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Department-wise Fee Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Pending Amount</TableHead>
                      <TableHead>Collection Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.department_wise && reportData.department_wise.length > 0 ? (
                      reportData.department_wise.map((dept, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{dept.department}</TableCell>
                          <TableCell>{dept.students}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(dept.revenue)}
                          </TableCell>
                          <TableCell className="font-semibold text-yellow-600">
                            {formatCurrency(dept.pending)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={dept.pending === 0 ? 'default' : 'secondary'}>
                              {dept.revenue > 0 ? Math.round(((dept.revenue - dept.pending) / dept.revenue) * 100) : 0}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No department data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fee Type Analysis */}
          <TabsContent value="fee_type" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fee Type Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Average Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.fee_type_wise && reportData.fee_type_wise.length > 0 ? (
                      reportData.fee_type_wise.map((feeType, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{feeType.fee_type}</TableCell>
                          <TableCell>{feeType.count}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(feeType.revenue)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(feeType.revenue / feeType.count)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No fee type data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Trends */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Payments Count</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Average per Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.monthly_trends && reportData.monthly_trends.length > 0 ? (
                      reportData.monthly_trends.map((trend, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{trend.month}</TableCell>
                          <TableCell>{trend.payments}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(trend.revenue)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(trend.payments > 0 ? trend.revenue / trend.payments : 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No monthly trend data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overdue Invoices */}
          <TabsContent value="overdue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Overdue Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.overdue_invoices && reportData.overdue_invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
                    <h3 className="text-lg font-semibold mb-2 text-foreground">No Overdue Invoices</h3>
                    <p className="text-muted-foreground">All invoices are up to date!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>USN</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.overdue_invoices && reportData.overdue_invoices.map((invoice, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{invoice.student_name}</TableCell>
                          <TableCell>{invoice.usn}</TableCell>
                          <TableCell className="font-semibold text-red-600">
                            {formatCurrency(invoice.amount)}
                          </TableCell>
                          <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {invoice.days_overdue} days
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">Overdue</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Reports;