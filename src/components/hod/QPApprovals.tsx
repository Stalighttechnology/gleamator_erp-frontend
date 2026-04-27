import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Download } from "lucide-react";
import { SkeletonTable } from "../ui/skeleton";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../hooks/use-toast";
import { API_ENDPOINT } from "../../utils/config";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

interface QPPending {
  id: number;
  subject: string;
  test_type: string;
  faculty: string;
  submitted_at: string;
  branch?: { id: number | null; name: string | null };
  status?: string;
  current_holder?: string | null;
  last_action?: { actor?: string; role?: string; action?: string; comment?: string } | null;
}

interface QPDetail {
  id: number;
  subject: string;
  test_type: string;
  faculty: string;
  questions: Array<{
    question_number: string;
    co: string;
    blooms_level: string;
    subparts: Array<{
      subpart_label: string;
      content: string;
      max_marks: number;
    }>;
  }>;
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

const QPApprovals = () => {
  const [pendingQPs, setPendingQPs] = useState<QPPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQP, setSelectedQP] = useState<QPPending | null>(null);
  const [qpDetail, setQpDetail] = useState<QPDetail | null>(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const MySwal = withReactContent(Swal);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (key: string) => {
    setExpanded((p) => ({ ...p, [key]: !p[key] }));
  };

  // Ensure SweetAlert appears above the dialog and is interactive
  useEffect(() => {
    try {
      const styleId = 'swal2-global-fix';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .swal2-container, .swal2-popup {
            z-index: 99999 !important;
            pointer-events: auto !important;
          }
        `;
        document.head.appendChild(style);
      }
    } catch (e) {
      // ignore when DOM not available
    }
  }, []);

  useEffect(() => {
    fetchPendingQPs();
  }, []);

  const fetchPendingQPs = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/hod-pending/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setPendingQPs(data.data);
      }
    } catch (error) {
      console.error("Error fetching pending QPs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQPDetail = async (qpId: number) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/hod-detail/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const qp = data.data[0];
        // Transform the data to match our interface
        const transformedQP: QPDetail = {
          id: qp.id,
          subject: qp.subject,
          test_type: qp.test_type,
          faculty: qp.faculty,
          questions: qp.questions || []
        };
        setQpDetail(transformedQP);
      }
    } catch (error) {
      console.error("Error fetching QP detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!qpDetail) return;
    try {
      const jspdfModule: any = await import('jspdf');
      const jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default || jspdfModule;
      const doc: any = new jsPDF();
      let y = 14;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const maxWidth = pageWidth - margin * 2;

      doc.setFontSize(16);
      doc.text('Question Paper', margin, y);
      y += 10;

      doc.setFontSize(12);
      const headerLines = [
        `Subject: ${qpDetail.subject}`,
        `Test Type: ${qpDetail.test_type}`,
        `Faculty: ${qpDetail.faculty}`,
      ];
      headerLines.forEach((ln: string) => {
        const lines = doc.splitTextToSize(ln, maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * 6;
      });

      y += 4;

      let totalMarks = 0;
      (qpDetail.questions || []).forEach((q: any) => {
        (q.subparts || []).forEach((s: any) => {
          totalMarks += s.max_marks || 0;
        });
      });

      (qpDetail.questions || []).forEach((q: any) => {
        (q.subparts || []).forEach((s: any) => {
          const qLabel = `${q.question_number}${s.subpart_label}. `;
          const content = qLabel + (s.content || '');
          const contentLines = doc.splitTextToSize(content, maxWidth);

          // page break safety
          if (y + Math.max(1, contentLines.length) * 6 + 60 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            y = margin;
          }

          doc.setFontSize(12);
          const lineHeight = 6;

          if (contentLines.length > 0) {
            // write first line and place marks at the right end of the same line
            doc.text(contentLines[0], margin, y);
            try { doc.setFont(undefined, 'bold'); } catch (e) {}
            doc.text(`${s.max_marks}m`, pageWidth - margin, y, { align: 'right' });
            try { doc.setFont(undefined, 'normal'); } catch (e) {}
            y += lineHeight;
          }

          if (contentLines.length > 1) {
            const remaining = contentLines.slice(1);
            doc.text(remaining, margin, y);
            y += remaining.length * lineHeight;
          }

          // CO and Blooms on next line(s)
          doc.setFontSize(10);
          const metaText = `CO: ${q.co}  Blooms: ${q.blooms_level}`;
          const metaLines = doc.splitTextToSize(metaText, maxWidth);
          doc.text(metaLines, margin, y);
          y += metaLines.length * lineHeight + 6;
        });
      });

      if (y + 20 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(12);
      doc.text(`Total Marks: ${totalMarks}`, margin, y);
      const fileName = `qp-${(qpDetail.subject || 'qp').replace(/\s+/g, '_')}-${(qpDetail.test_type || 'test').replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({ title: 'Error', description: 'Failed to generate PDF.' });
    }
  };

  const handleReview = (qp: QPPending) => {
    setSelectedQP(qp);
    setQpDetail(null);
    setDialogOpen(true);
    fetchQPDetail(qp.id);
  };

  const handleApprove = async (qpId: number) => {
    const result = await MySwal.fire({
      title: 'Confirm approval',
      text: 'Are you sure you want to approve and forward this question paper to Admin?',
      icon: 'question',
      showCancelButton: true,
      showCloseButton: true,
      confirmButtonText: 'Yes, approve',
      cancelButtonText: 'Cancel',
      allowOutsideClick: true,
      allowEscapeKey: true,
      reverseButtons: true,
      target: document.body,
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      try { MySwal.close(); } catch (e) {}
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/hod-approve/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment }),
      });
      const data = await response.json();
      if (data.success) {
        try { MySwal.close(); } catch (e) {}
        const t = toast({ title: 'Approved', description: data.message || 'QP approved and forwarded to Admin.' });
        setTimeout(() => t.dismiss(), 3000);
        setPendingQPs(pendingQPs.filter(qp => qp.id !== qpId));
        setSelectedQP(null);
        setQpDetail(null);
        setComment("");
        setDialogOpen(false);
      } else {
        MySwal.fire('Error', data.message || 'Failed to approve QP.', 'error');
      }
    } catch (error) {
      console.error("Error approving QP:", error);
      toast({ title: 'Network error', description: 'Network error while approving QP.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (qpId: number) => {
    const result = await MySwal.fire({
      title: 'Confirm rejection',
      text: 'Are you sure you want to reject this question paper and send it back to Faculty?',
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
      reverseButtons: true,
      confirmButtonText: 'Yes, reject',
      cancelButtonText: 'Cancel',
      target: document.body,
    });

    if (!result || result.isDismissed || !result.isConfirmed) {
      try { MySwal.close(); } catch (e) {}
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/admin/qps/${qpId}/hod-reject/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment }),
      });
      const data = await response.json();
      if (data.success) {
        try { MySwal.close(); } catch (e) {}
        const t = toast({ title: 'Rejected', description: data.message || 'QP rejected and sent back to Faculty for edits.' });
        setTimeout(() => t.dismiss(), 3000);
        setPendingQPs(pendingQPs.filter(qp => qp.id !== qpId));
        setSelectedQP(null);
        setQpDetail(null);
        setComment("");
        setDialogOpen(false);
      } else {
        MySwal.fire('Error', data.message || 'Failed to reject QP.', 'error');
      }
    } catch (error) {
      console.error("Error rejecting QP:", error);
      toast({ title: 'Network error', description: 'Network error while rejecting QP.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <SkeletonTable rows={5} cols={4} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Question Paper Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingQPs.length === 0 ? (
            <p className="text-center text-muted-foreground">No pending QPs for approval.</p>
          ) : (
            <div className="space-y-4">
              {pendingQPs.map((qp) => (
                <Card key={qp.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{qp.subject} - {qp.test_type}</h3>
                        {qp.status && (
                          (() => {
                            const s = qp.status;
                            if (s === 'rejected') return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
                            if (s === 'approved') return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
                            if (s.startsWith('pending')) return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
                            return <Badge className="bg-gray-100 text-gray-800">{s}</Badge>;
                          })()
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Faculty: {qp.faculty}</p>
                      <p className="text-sm text-muted-foreground">Submitted: {new Date(qp.submitted_at).toLocaleDateString()}</p>
                      {qp.branch && (
                        <p className="text-sm text-muted-foreground">Branch: {qp.branch.name}</p>
                      )}
                      {qp.last_action ? (
                        <div>
                          <p className="text-sm text-muted-foreground">Last: {qp.last_action.action} by {qp.last_action.actor} ({qp.last_action.role})</p>
                          {qp.last_action.comment ? (
                            <p className="text-sm text-muted-foreground">Comment: {qp.last_action.comment}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReview(qp)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSelectedQP(null);
          setQpDetail(null);
          setComment("");
        }
        setDialogOpen(open);
      }}>
        <DialogContent
          onPointerDownOutside={() => {
            setDialogOpen(false);
            setSelectedQP(null);
            setQpDetail(null);
            setComment("");
          }}
          className={`${theme === 'dark' ? 'bg-card text-foreground border border-border' : 'bg-white text-gray-900 border border-gray-200'} max-w-[720px] w-[90vw] mx-4 rounded-lg flex flex-col max-h-[92vh]`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-foreground' : 'text-gray-900'}>Review QP: {selectedQP?.subject} - {selectedQP?.test_type}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto px-4 py-2 space-y-4 flex-1">
            {detailLoading ? (
              <div className="text-center py-4">Loading QP details...</div>
            ) : qpDetail ? (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-semibold mb-4">Question Paper Preview</h4>
                  <div className="space-y-4">
                    {qpDetail.questions.map((q, qIndex) => (
                      <div key={qIndex} className="space-y-3">
                        {q.subparts.map((s, sIndex) => {
                          const key = `${qIndex}-${sIndex}`;
                          const isExpanded = !!expanded[key];
                          const shortContent = (s.content || '').length > 160 ? (s.content || '').slice(0, 160) + '…' : (s.content || '');
                          return (
                            <div key={sIndex} className="border rounded-md p-3 bg-white dark:bg-gray-900">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-medium text-sm">
                                  {q.question_number}{s.subpart_label}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="text-sm text-gray-900 dark:text-gray-100 mb-1 flex-1">
                                      {isExpanded ? s.content : shortContent}
                                    </div>
                                    <div className="ml-2 flex-shrink-0">
                                      <Badge className="text-black font-semibold text-sm bg-transparent">{s.max_marks}m</Badge>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge className="text-black bg-transparent">CO: {q.co}</Badge>
                                    <Badge className="text-black bg-transparent">{q.blooms_level}</Badge>
                                    {((s.content || '').length > 160) && (
                                      <button onClick={() => toggleExpanded(key)} className="text-sm text-primary-600 dark:text-primary-400 ml-2">
                                        {isExpanded ? 'Show less' : 'Show more'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div className="font-semibold pt-2 border-t">
                      Total Marks: {qpDetail.questions.reduce((total, q) => 
                        total + q.subparts.reduce((subTotal, s) => subTotal + s.max_marks, 0), 0
                      )}
                    </div>
                  </div>
                </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Failed to load QP details
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment for the faculty..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => selectedQP && handleApprove(selectedQP.id)}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-600 text-white w-full sm:w-auto justify-center transition-none"
              >
                <CheckCircle className="w-4 h-4 mr-1 hidden sm:inline-block" />
                <span className="whitespace-normal">Approve</span>
              </Button>
              <Button
                onClick={() => selectedQP && handleReject(selectedQP.id)}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-600 text-white w-full sm:w-auto justify-center transition-none"
              >
                <XCircle className="w-4 h-4 mr-1 hidden sm:inline-block" />
                <span className="whitespace-normal">Reject</span>
              </Button>
            </div>
            <div className="ml-auto">
              <Button variant="outline" onClick={() => downloadPDF()} className="bg-transparent hover:bg-transparent w-full sm:w-auto justify-center transition-none">
                <Download className="w-4 h-4 mr-1 hidden sm:inline-block" />
                <span className="whitespace-normal">Download</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ConfirmDialog removed — using SweetAlert (MySwal) like Admin page */}
    </div>
  );
};

export default QPApprovals;