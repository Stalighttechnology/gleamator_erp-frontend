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
  Search,
  Users,
  IndianRupee,
  FileText,
  Eye,
  Download,
  Filter,
  User,
  GraduationCap,
  Building,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  getStudentFeeReport,
  getStudentsFeeReports,
  getFeesManagerBranches,
  getFeesManagerSemesters,
  getFeesManagerSections,
  StudentFeeReport,
  StudentFeeSummary,
  Branch,
  Semester,
  Section,
  sendFeeReminder
} from '../../utils/fees_manager_api';

const StudentFeeReports: React.FC = () => {
  // State for individual student search
  const [searchTerm, setSearchTerm] = useState('');
  const [usn, setUsn] = useState('');
  const [studentReport, setStudentReport] = useState<StudentFeeReport | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // State for bulk filtering
  const [branches, setBranches] = useState<Branch[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [bulkReports, setBulkReports] = useState<StudentFeeSummary[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [pageSize] = useState(50); // Default page size

  // UI state
  const [activeTab, setActiveTab] = useState('individual');
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');

  // Load branches when bulk tab is selected
  useEffect(() => {
    if (activeTab === 'bulk' && branches.length === 0) {
      loadBranches();
    }
  }, [activeTab, branches.length]);

  // Load semesters when branch changes
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'all') {
      loadSemesters(selectedBranch);
      setSelectedSemester('all');
      setSelectedSection('all');
      setSemesters([]);
      setSections([]);
    } else if (selectedBranch === 'all') {
      setSelectedSemester('all');
      setSelectedSection('all');
      setSemesters([]);
      setSections([]);
    }
  }, [selectedBranch]);

  // Load sections when semester changes
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'all' && selectedSemester && selectedSemester !== 'all') {
      loadSections(selectedBranch, selectedSemester);
      setSelectedSection('all');
      setSections([]);
    } else if (selectedSemester === 'all') {
      setSelectedSection('all');
      setSections([]);
    }
  }, [selectedSemester]);

  const loadBranches = async () => {
    const response = await getFeesManagerBranches();
    if (response.success) {
      setBranches(response.data);
    }
  };

  const loadSemesters = async (branchId: string) => {
    const response = await getFeesManagerSemesters(branchId);
    if (response.success) {
      setSemesters(response.data);
    }
  };

  const loadSections = async (branchId: string, semesterId: string) => {
    const response = await getFeesManagerSections(branchId, semesterId);
    if (response.success) {
      setSections(response.data);
    }
  };

  const handleIndividualSearch = async (usn?: string) => {
    const termToSearch = usn || searchTerm.trim();
    
    // Ensure termToSearch is a string
    const searchTermStr = typeof termToSearch === 'string' ? termToSearch : String(termToSearch);
    
    if (!searchTermStr.trim()) {
      setSearchError('Please enter a USN or student name');
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    setStudentReport(null);

    const response = await getStudentFeeReport(searchTermStr.trim());
    setSearchLoading(false);

    if (response.success) {
      setStudentReport(response.data);
      setShowStudentDetails(true);
      if (!usn) {
        // Only update searchTerm if it wasn't passed as a parameter
        setSearchTerm(searchTermStr.trim());
      }
    } else {
      setSearchError(response.message || 'Student not found');
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      handleBulkSearch(page);
    }
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
    handleBulkSearch(1);
  };

  const handleBulkSearch = async (page: number = 1) => {
    setBulkLoading(true);
    setBulkReports([]);

    const branchId = selectedBranch === 'all' ? undefined : selectedBranch;
    const semesterId = selectedSemester === 'all' ? undefined : selectedSemester;
    const sectionId = selectedSection === 'all' ? undefined : selectedSection;

    const response = await getStudentsFeeReports(branchId, semesterId, sectionId, page);

    setBulkLoading(false);

    if (response.success) {
      setBulkReports(response.data.results.students || []);
      setTotalStudents(response.data.results.total_students || 0);
      setTotalPages(Math.ceil((response.data.results.total_students || 0) / pageSize));
      setHasNext(response.data.next !== null);
      setHasPrevious(response.data.previous !== null);
      setCurrentPage(page);
    } else {
      // Handle error - maybe set an error state
      console.error('Failed to load bulk reports:', response.message);
    }
  };

  const handleSendReminder = async (studentId: number, studentName: string) => {
    setSendingReminder(true);
    setReminderMessage('');

    const response = await sendFeeReminder(studentId);

    setSendingReminder(false);

    if (response.success) {
      setReminderMessage(`Fee reminder sent successfully to ${studentName}`);
      // Clear message after 5 seconds
      setTimeout(() => setReminderMessage(''), 5000);
    } else {
      setReminderMessage(`Failed to send reminder: ${response.message}`);
      setTimeout(() => setReminderMessage(''), 5000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Fee Reports</h1>
          <p className="text-muted-foreground">Search individual students or view bulk reports by academic filters</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Individual Search
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Bulk Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Student
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="searchTerm">USN or Student Name</Label>
                  <Input
                    id="searchTerm"
                    placeholder="Enter USN or student name"
                    value={typeof searchTerm === 'string' ? searchTerm : ''}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleIndividualSearch()}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => handleIndividualSearch()}
                    disabled={searchLoading}
                    className="w-full"
                  >
                    {searchLoading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {searchError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{searchError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Student Details Dialog */}
          <Dialog open={showStudentDetails} onOpenChange={setShowStudentDetails}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Student Fee Report</DialogTitle>
              </DialogHeader>

              {studentReport && (
                <div className="space-y-6">
                  {/* Student Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Student Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Name</Label>
                          <p className="text-sm">{studentReport.student.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">USN</Label>
                          <p className="text-sm">{studentReport.student.usn}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Branch</Label>
                          <p className="text-sm">{studentReport.student.branch}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Semester</Label>
                          <p className="text-sm">{studentReport.student.semester}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fee Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IndianRupee className="w-5 h-5" />
                        Fee Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{formatCurrency(studentReport.fee_summary.total_fee)}</p>
                          <p className="text-sm text-muted-foreground">Total Fee</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(studentReport.fee_summary.total_paid)}</p>
                          <p className="text-sm text-muted-foreground">Total Paid</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">{formatCurrency(studentReport.fee_summary.total_pending)}</p>
                          <p className="text-sm text-muted-foreground">Pending Amount</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">{formatCurrency(studentReport.fee_summary.custom_fee_amount)}</p>
                          <p className="text-sm text-muted-foreground">Custom Fee</p>
                        </div>
                      </div>

                      {/* Send Notification Button - Only show if there's pending amount */}
                      {studentReport.fee_summary.total_pending > 0 && (
                        <div className="mt-4 flex justify-center">
                          <Button
                            onClick={() => handleSendReminder(studentReport.student.id, studentReport.student.name)}
                            disabled={sendingReminder}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            {sendingReminder ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Sending...
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Send Fee Reminder
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Reminder Message */}
                      {reminderMessage && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">{reminderMessage}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Semester-wise Breakdown */}
                  {studentReport.semester_wise_breakdown && studentReport.semester_wise_breakdown.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Semester-wise Fee Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {studentReport.semester_wise_breakdown.map((semester, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium text-lg">{semester.semester_name}</h4>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Total Fee: {formatCurrency(semester.total_fee)}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                  <p className="text-lg font-bold text-blue-600">{formatCurrency(semester.total_fee)}</p>
                                  <p className="text-xs text-muted-foreground">Total Fee</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                  <p className="text-lg font-bold text-green-600">{formatCurrency(semester.total_paid)}</p>
                                  <p className="text-xs text-muted-foreground">Paid</p>
                                </div>
                                <div className="text-center p-3 bg-red-50 rounded-lg">
                                  <p className="text-lg font-bold text-red-600">{formatCurrency(semester.total_pending)}</p>
                                  <p className="text-xs text-muted-foreground">Pending</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                  <p className="text-lg font-bold text-gray-600">{semester.invoices.length}</p>
                                  <p className="text-xs text-muted-foreground">Invoices</p>
                                </div>
                              </div>
                              
                              {/* Invoices for this semester */}
                              {semester.invoices.length > 0 && (
                                <div className="mt-4">
                                  <h5 className="font-medium mb-2">Invoices:</h5>
                                  <div className="space-y-2">
                                    {semester.invoices.map((invoice) => (
                                      <div key={invoice.id} className="border-l-4 border-blue-200 pl-4 py-2 bg-gray-50 rounded">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="font-medium text-sm">{invoice.invoice_number}</p>
                                            <p className="text-xs text-muted-foreground">{invoice.template_name}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-medium">{formatCurrency(invoice.total_amount)}</p>
                                            <p className="text-xs text-muted-foreground">Balance: {formatCurrency(invoice.balance_amount)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Payments for this semester */}
                              {semester.payments.length > 0 && (
                                <div className="mt-4">
                                  <h5 className="font-medium mb-2">Recent Payments:</h5>
                                  <div className="space-y-1">
                                    {semester.payments.slice(0, 3).map((payment) => (
                                      <div key={payment.id} className="flex justify-between text-sm">
                                        <span>{new Date(payment.payment_date).toLocaleDateString()}</span>
                                        <span className="font-medium">{formatCurrency(payment.amount)}</span>
                                        <span className="text-muted-foreground">{payment.payment_method}</span>
                                      </div>
                                    ))}
                                    {semester.payments.length > 3 && (
                                      <p className="text-xs text-muted-foreground">+{semester.payments.length - 3} more payments</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Invoices */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Invoices ({studentReport.invoices.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {studentReport.invoices.map((invoice) => (
                          <div key={invoice.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">{invoice.invoice_number}</h4>
                                <p className="text-sm text-muted-foreground">{invoice.template_name}</p>
                              </div>
                              {getStatusBadge(invoice.status)}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Total:</span> {formatCurrency(invoice.total_amount)}
                              </div>
                              <div>
                                <span className="font-medium">Paid:</span> {formatCurrency(invoice.paid_amount)}
                              </div>
                              <div>
                                <span className="font-medium">Balance:</span> {formatCurrency(invoice.balance_amount)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment History */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Payment History ({studentReport.payment_history.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Invoice</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentReport.payment_history.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                              <TableCell>{formatCurrency(payment.amount)}</TableCell>
                              <TableCell>{payment.payment_method}</TableCell>
                              <TableCell>{getStatusBadge(payment.status)}</TableCell>
                              <TableCell>{payment.invoice_number}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Students
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select
                    value={selectedSemester}
                    onValueChange={setSelectedSemester}
                    disabled={!selectedBranch}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Semesters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {semesters.map((semester) => (
                        <SelectItem key={semester.id} value={semester.id.toString()}>
                          Semester {semester.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={selectedSection}
                    onValueChange={setSelectedSection}
                    disabled={!selectedBranch || !selectedSemester}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id.toString()}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleFilterChange}
                    disabled={bulkLoading}
                    className="w-full"
                  >
                    {bulkLoading ? 'Loading...' : 'View Reports'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Reports Table */}
          {bulkReports.length > 0 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Student Fee Reports ({totalStudents} students)</span>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>USN</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Total Fee</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Invoices</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkReports.map((report) => (
                        <TableRow key={report.student.id}>
                          <TableCell className="font-medium">{report.student.usn}</TableCell>
                          <TableCell>{report.student.name}</TableCell>
                          <TableCell>{report.student.branch}</TableCell>
                          <TableCell>{report.student.semester}</TableCell>
                          <TableCell>{report.student.section || '-'}</TableCell>
                          <TableCell>{formatCurrency(report.fee_summary.total_fee)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(report.fee_summary.total_paid)}</TableCell>
                          <TableCell className={`font-medium ${report.fee_summary.total_pending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(report.fee_summary.total_pending)}
                          </TableCell>
                          <TableCell>{report.fee_summary.invoice_count}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveTab('individual');
                                handleIndividualSearch(report.student.usn);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Pagination Controls */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({totalStudents} total students)
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!hasPrevious || bulkLoading}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>

                      <span className="text-sm text-muted-foreground px-2">
                        {currentPage}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!hasNext || bulkLoading}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {bulkReports.length === 0 && !bulkLoading && (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No students found</h3>
                <p className="text-muted-foreground">Select filters and click "View Reports" to see student fee data</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentFeeReports;