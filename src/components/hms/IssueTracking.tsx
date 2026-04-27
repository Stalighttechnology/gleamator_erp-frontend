import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle, Loader, ChevronDown, Filter } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../hooks/use-toast';
import {
  getHostelIssues,
  updateIssueStatus,
  getIssueDetail
} from '../../utils/hms_api';

interface Issue {
  id: number;
  student_name: string;
  enrollment_no: string;
  hostel_name: string;
  room_name: string;
  title: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  update_count: number;
}

interface DetailedIssue extends Issue {
  description: string;
  resolved_at?: string;
  updates: any[];
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  waiting_for_workers: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
};

const STATUS_ICONS = {
  pending: AlertCircle,
  in_progress: Clock,
  waiting_for_workers: Loader,
  completed: CheckCircle
};

const IssueTracking = ({ hostelId }: { hostelId: number }) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<DetailedIssue | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingIssueId, setUpdatingIssueId] = useState<number | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchIssues();
  }, [hostelId, statusFilter, currentPage]);

  const fetchIssues = async () => {
    setLoading(true);
    setPermissionError(null);
    try {
      const response = await getHostelIssues(hostelId, statusFilter !== 'all' ? statusFilter : undefined, currentPage);
      
      // Check for permission error (403)
      if (!response.success && response.message?.includes('You do not have permission') || response.message?.includes('Only wardens')) {
        setPermissionError(response.message || 'You do not have permission to view hostel issues. Only wardens and admins can access this page.');
        setIssues([]);
      } else if (response.success) {
        // Handle paginated response
        if (response.results) {
          setIssues(response.results);
          setTotalCount(response.count || response.results.length);
        } else if (Array.isArray(response.data)) {
          setIssues(response.data);
          setTotalCount(response.data.length);
        }
      } else if (!response.success) {
        // Generic error
        toast({
          title: 'Error',
          description: response.message || 'Failed to load issues',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Error fetching issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load issues',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleIssueClick = async (issue: Issue) => {
    try {
      const response = await getIssueDetail(issue.id);
      if (response.success && response.data) {
        setSelectedIssue(response.data);
      }
    } catch (error) {
      console.error('Error fetching issue details:', error);
    }
  };

  const handleStatusChange = async (issueId: number, newStatus: string, note: string) => {
    setUpdatingIssueId(issueId);
    try {
      const response = await updateIssueStatus(issueId, {
        status: newStatus,
        note: note || undefined
      });

      if (response.success && response.data) {
        toast({
          title: 'Success',
          description: 'Issue status updated successfully',
          variant: 'default'
        });
        
        // Update the issues list optimistically from the response
        setIssues(prevIssues =>
          prevIssues.map(issue =>
            issue.id === issueId
              ? {
                  ...issue,
                  status: newStatus,
                  updated_at: new Date().toISOString(),
                  update_count: (issue.update_count || 0) + 1
                }
              : issue
          )
        );
        
        // Update the selected issue optimistically from the response
        if (selectedIssue?.id === issueId) {
          setSelectedIssue({
            ...selectedIssue,
            status: newStatus,
            updated_at: new Date().toISOString(),
            update_count: (selectedIssue.update_count || 0) + 1,
            updates: response.data.updates || selectedIssue.updates || []
          });
        }
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to update issue',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to update issue',
        variant: 'destructive'
      });
    } finally {
      setUpdatingIssueId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="animate-spin mb-4 text-2xl">⚙️</div>
          <p>Loading issues...</p>
        </div>
      </div>
    );
  }

  // Show permission error if present
  if (permissionError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`p-6 rounded-lg border-2 border-red-500 ${
          theme === 'dark'
            ? 'bg-red-900/20 text-red-300'
            : 'bg-red-50 text-red-700'
        }`}>
          <AlertCircle className="w-12 h-12 mb-4 mx-auto" />
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-sm">{permissionError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filter */}
      <div className={`p-4 rounded-lg border ${
        theme === 'dark'
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-2xl font-bold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Hostel Issues Tracking
        </h2>
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'in_progress', 'waiting_for_workers', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Filter className="w-4 h-4 inline mr-2" />
              {status === 'all' ? 'All' : status.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Grid */}
      {issues.length === 0 ? (
        <div className={`p-8 rounded-lg border-2 border-dashed text-center ${
          theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700 text-gray-400'
            : 'bg-gray-50 border-gray-300 text-gray-600'
        }`}>
          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No issues found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {issues.map((issue) => {
            const StatusIcon = STATUS_ICONS[issue.status as keyof typeof STATUS_ICONS] || AlertCircle;
            return (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  theme === 'dark'
                    ? selectedIssue?.id === issue.id
                      ? 'bg-blue-900/30 border-blue-600'
                      : 'bg-slate-700/50 border-slate-600'
                    : selectedIssue?.id === issue.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200'
                }`}
                onClick={() => handleIssueClick(issue)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className="w-5 h-5" />
                      <h3 className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {issue.title}
                      </h3>
                    </div>
                    
                    <div className={`text-sm mb-3 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <p>Room {issue.room_name} • {issue.student_name} ({issue.enrollment_no})</p>
                      <p className="text-xs mt-1">Raised: {formatDate(issue.created_at)}</p>
                    </div>

                    <div className="flex gap-2 items-center flex-wrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS]
                      }`}>
                        {issue.status_display}
                      </span>
                      {issue.update_count > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          theme === 'dark'
                            ? 'bg-slate-700 text-gray-300'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {issue.update_count} update{issue.update_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronDown className={`w-5 h-5 transition-transform ${
                    selectedIssue?.id === issue.id ? 'rotate-180' : ''
                  } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Issue Detail View */}
      {selectedIssue && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-lg border-2 ${
            theme === 'dark'
              ? 'bg-slate-800 border-blue-600'
              : 'bg-blue-50 border-blue-300'
          }`}
        >
          <h3 className={`text-xl font-bold mb-3 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Issue Details
          </h3>

          {/* Description */}
          <div className="mb-4">
            <p className={`text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Description:
            </p>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedIssue.description}
            </p>
          </div>

          {/* Status Update (for wardens) */}
          <div className="mb-4 p-4 rounded-lg bg-opacity-50 bg-gray-100 dark:bg-slate-700/50">
            <p className={`text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Update Status:
            </p>
            <div className="flex flex-wrap gap-2">
              {['pending', 'in_progress', 'waiting_for_workers', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(selectedIssue.id, status, '')}
                  disabled={
                    updatingIssueId === selectedIssue.id ||
                    selectedIssue.status === status ||
                    selectedIssue.status === 'completed'
                  }
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    selectedIssue.status === status
                      ? STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                      : theme === 'dark'
                      ? 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={selectedIssue.status === 'completed' ? 'Completed issues cannot be changed' : undefined}
                >
                  {updatingIssueId === selectedIssue.id ? '...' : status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            {selectedIssue.status === 'completed' && (
              <p className={`text-xs mt-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                ✅ This issue is completed and cannot be reopened.
              </p>
            )}
          </div>

          {/* Updates Timeline */}
          {selectedIssue.updates && selectedIssue.updates.length > 0 && (
            <div>
              <p className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Updates:
              </p>
              <div className="space-y-2">
                {selectedIssue.updates.map((update: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${
                      theme === 'dark'
                        ? 'bg-slate-700/50 text-gray-300'
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium">
                        {update.old_status_display} → {update.new_status_display}
                      </p>
                      <span className={`text-xs ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {formatDate(update.created_at)}
                      </span>
                    </div>
                    {update.note && (
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {update.note}
                      </p>
                    )}
                    {update.updated_by_name && (
                      <p className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        By: {update.updated_by_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default IssueTracking;
