import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { fetchWithTokenRefresh } from "@/utils/authService";
import { Eye, CheckCircle, XCircle, ChevronDown, ChevronUp, Archive, RefreshCw } from "lucide-react";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Question {
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

interface Assessment {
  id: number;
  title: string;
  duration_minutes: number;
  passing_percentage: number;
  total_questions?: number;
  question_count?: number;
  status: string;
  created_by: string;
  created_at: string;
  questions?: Question[];
  approval_notes?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
}

const AdminApproval = () => {
  const { toast } = useToast();
  const MySwal = withReactContent(Swal);

  const [activeTab, setActiveTab] = useState<'pending' | 'archived'>('pending');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [archivedAssessments, setArchivedAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [comment, setComment] = useState<Record<number, string>>({});
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingAssessments();
    } else {
      fetchArchivedAssessments();
    }
  }, [activeTab]);

  const fetchPendingAssessments = async () => {
    try {
      setLoading(true);
      const response = await fetchWithTokenRefresh('/api/assessment/assessments/?status=pending');
      if (!response.ok) throw new Error('Failed to fetch assessments');
      
      const data = await response.json();
      const pendingAssessments = data.results?.assessments || data.assessments || data.results || data;
      setAssessments(Array.isArray(pendingAssessments) ? pendingAssessments : []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending assessments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedAssessments = async () => {
    try {
      setLoading(true);
      // Fetch both approved and rejected assessments
      const [approvedResponse, rejectedResponse] = await Promise.all([
        fetchWithTokenRefresh('/api/assessment/assessments/?status=approved'),
        fetchWithTokenRefresh('/api/assessment/assessments/?status=rejected')
      ]);

      let archived: Assessment[] = [];
      
      if (approvedResponse.ok) {
        const approvedData = await approvedResponse.json();
        const approvedList = approvedData.results?.assessments || approvedData.assessments || approvedData.results || approvedData;
        archived = [...archived, ...(Array.isArray(approvedList) ? approvedList : [])];
      }
      
      if (rejectedResponse.ok) {
        const rejectedData = await rejectedResponse.json();
        const rejectedList = rejectedData.results?.assessments || rejectedData.assessments || rejectedData.results || rejectedData;
        archived = [...archived, ...(Array.isArray(rejectedList) ? rejectedList : [])];
      }

      // Sort by most recent first
      archived.sort((a, b) => {
        const dateA = new Date(a.approved_at || a.rejected_at || a.created_at).getTime();
        const dateB = new Date(b.approved_at || b.rejected_at || b.created_at).getTime();
        return dateB - dateA;
      });

      setArchivedAssessments(archived);
      setArchivedPage(1);
    } catch (error) {
      console.error('Error fetching archived assessments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load archived assessments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleAction = async (assessmentId: number, action: 'approve' | 'reject') => {
    const actionComment = comment[assessmentId]?.trim();

    if (action === 'reject' && !actionComment) {
      MySwal.fire('Comment Required', 'Please provide a comment when rejecting an assessment', 'warning');
      return;
    }

    const result = await MySwal.fire({
      title: `${action === 'approve' ? 'Approve' : 'Reject'} Assessment?`,
      text: `Are you sure you want to ${action} this assessment?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: action === 'approve' ? '#22c55e' : '#ef4444',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${action === 'approve' ? 'Approve' : 'Reject'}`,
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      setProcessingId(assessmentId);

      const response = await fetchWithTokenRefresh(`/api/assessment/assessments/${assessmentId}/${action}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: actionComment || '' }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} assessment`);

      toast({
        title: 'Success',
        description: `Assessment ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      // Remove from pending list
      setAssessments(prev => prev.filter(a => a.id !== assessmentId));
      setComment(prev => {
        const newComment = { ...prev };
        delete newComment[assessmentId];
        return newComment;
      });
      
      // Refresh archived if on that tab
      if (activeTab === 'archived') {
        fetchArchivedAssessments();
      }
    } catch (error) {
      console.error(`Error ${action}ing assessment:`, error);
      MySwal.fire('Error', `Failed to ${action} assessment. Please try again.`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'pending') {
      fetchPendingAssessments();
    } else {
      fetchArchivedAssessments();
    }
  };

  // Pagination logic
  const getCurrentPageData = () => {
    const data = activeTab === 'pending' ? assessments : archivedAssessments;
    const page = activeTab === 'pending' ? currentPage : archivedPage;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const data = activeTab === 'pending' ? assessments : archivedAssessments;
    return Math.ceil(data.length / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    if (activeTab === 'pending') {
      setCurrentPage(page);
    } else {
      setArchivedPage(page);
    }
    setExpandedId(null); // Collapse all when changing pages
  };

  const renderPagination = () => {
    const totalPages = getTotalPages();
    const currentActivePage = activeTab === 'pending' ? currentPage : archivedPage;
    
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentActivePage - 1 && i <= currentActivePage + 1)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => currentActivePage > 1 && handlePageChange(currentActivePage - 1)}
              className={currentActivePage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          
          {pages.map((page, idx) => (
            <PaginationItem key={idx}>
              {page === '...' ? (
                <span className="px-4">...</span>
              ) : (
                <PaginationLink
                  onClick={() => handlePageChange(page as number)}
                  isActive={currentActivePage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext
              onClick={() => currentActivePage < totalPages && handlePageChange(currentActivePage + 1)}
              className={currentActivePage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const renderAssessmentCard = (assessment: Assessment, isArchived: boolean = false) => (
    <Card key={assessment.id} className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{assessment.title}</h3>
              {isArchived && (
                <Badge variant={assessment.status === 'approved' ? 'default' : 'destructive'}>
                  {assessment.status === 'approved' ? 'Approved' : 'Rejected'}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>Created by: {assessment.created_by || 'Unknown'}</span>
              <span>•</span>
              <span>{new Date(assessment.created_at).toLocaleDateString()}</span>
              {isArchived && (assessment.approved_at || assessment.rejected_at) && (
                <>
                  <span>•</span>
                  <span>
                    {assessment.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                    {new Date(assessment.approved_at || assessment.rejected_at || '').toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleExpand(assessment.id)}
          >
            {expandedId === assessment.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Assessment Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <div className="text-xs text-muted-foreground">Questions</div>
            <div className="font-semibold">{assessment.question_count ?? assessment.total_questions ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Duration</div>
            <div className="font-semibold">{assessment.duration_minutes} min</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Passing %</div>
            <div className="font-semibold">{assessment.passing_percentage}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <Badge variant={isArchived ? (assessment.status === 'approved' ? 'default' : 'destructive') : 'outline'} className="text-xs">
              {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Archived Notes */}
        {isArchived && assessment.approval_notes && (
          <div className="p-3 bg-muted/30 rounded-lg border">
            <div className="text-xs text-muted-foreground mb-1">
              {assessment.status === 'approved' ? 'Approval' : 'Rejection'} Notes
              {(assessment.approved_by || assessment.rejected_by) && (
                <span> by {assessment.approved_by || assessment.rejected_by}</span>
              )}
            </div>
            <div className="text-sm">{assessment.approval_notes}</div>
          </div>
        )}

        {/* Expanded Questions View */}
        {expandedId === assessment.id && assessment.questions && (
          <div className="space-y-3 pt-2">
            <div className="font-semibold text-sm flex items-center gap-2">
              <Eye size={16} />
              Questions Preview
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {assessment.questions.map((q) => (
                <div key={q.question_number} className="p-3 border rounded-lg bg-background">
                  <div className="font-medium text-sm mb-2">
                    {q.question_number}. {q.question_text}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className={q.correct_answer === 'A' ? 'text-green-600 font-medium' : ''}>
                      A. {q.option_a}
                    </div>
                    <div className={q.correct_answer === 'B' ? 'text-green-600 font-medium' : ''}>
                      B. {q.option_b}
                    </div>
                    <div className={q.correct_answer === 'C' ? 'text-green-600 font-medium' : ''}>
                      C. {q.option_c}
                    </div>
                    <div className={q.correct_answer === 'D' ? 'text-green-600 font-medium' : ''}>
                      D. {q.option_d}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment Section - Only for pending */}
        {!isArchived && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`comment-${assessment.id}`}>
                Comment {expandedId === assessment.id && '(Required for rejection)'}
              </Label>
              <Textarea
                id={`comment-${assessment.id}`}
                placeholder="Add a comment (optional for approval, required for rejection)..."
                value={comment[assessment.id] || ''}
                onChange={(e) => setComment(prev => ({ ...prev, [assessment.id]: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => handleAction(assessment.id, 'approve')}
                disabled={processingId === assessment.id}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle size={16} className="mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => handleAction(assessment.id, 'reject')}
                disabled={processingId === assessment.id}
                variant="destructive"
                className="flex-1"
              >
                <XCircle size={16} className="mr-2" />
                Reject
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (loading && assessments.length === 0 && archivedAssessments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading assessments...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentData = getCurrentPageData();
  const totalCount = activeTab === 'pending' ? assessments.length : archivedAssessments.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Assessment Approvals</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === 'pending'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending
              {assessments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {assessments.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-2 font-medium transition-colors relative flex items-center gap-2 ${
                activeTab === 'archived'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Archive size={16} />
              Archived
              {archivedAssessments.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {archivedAssessments.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Content */}
          {currentData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {activeTab === 'pending' 
                ? 'No pending assessments to review' 
                : 'No archived assessments'}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {currentData.map((assessment) => 
                  renderAssessmentCard(assessment, activeTab === 'archived')
                )}
              </div>
              
              {/* Pagination */}
              {renderPagination()}
              
              {/* Results info */}
              <div className="text-center text-sm text-muted-foreground mt-4">
                Showing {((activeTab === 'pending' ? currentPage : archivedPage) - 1) * itemsPerPage + 1} to{' '}
                {Math.min((activeTab === 'pending' ? currentPage : archivedPage) * itemsPerPage, totalCount)} of{' '}
                {totalCount} assessments
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApproval;