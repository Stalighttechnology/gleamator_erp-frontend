import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { SkeletonList } from "../ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { getAdminShortPermissions, ShortPermissionItem, updateAdminShortPermission } from "@/utils/short_permission_api";

const statusClass: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const ShortPermissionsManagement: React.FC<{ setError: any; toast: any }> = ({ setError, toast }) => {
  const [items, setItems] = useState<ShortPermissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [role, setRole] = useState<"ALL" | "teacher" | "hod" | "mis">("ALL");
  const [requestDate, setRequestDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [actionStatus, setActionStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminShortPermissions({ status, role, request_date: requestDate || undefined, page, page_size: 10 });
      const payload = res?.results || res;
      setItems(payload?.data || []);
      const count = Number(res?.count || 0);
      const pageSize = 10;
      setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
      setHasNext(Boolean(res?.next));
      setHasPrev(Boolean(res?.previous));
    } catch (e: any) {
      setError?.(e?.message || "Failed to load short permissions");
      toast?.({ variant: "destructive", title: "Load failed", description: e?.message || "Failed to load short permissions" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, role, requestDate, page]);

  const act = async () => {
    if (!selectedId) return;
    setActing(true);
    const res = await updateAdminShortPermission(selectedId, actionStatus, remarks);
    if (res?.success) {
      toast?.({ title: `Request ${actionStatus.toLowerCase()}`, description: "Attendance sync applied for approved requests." });
      setRemarksOpen(false);
      setRemarks("");
      setSelectedId(null);
      await load();
      setActing(false);
      return;
    }
    setError?.(res?.message || "Failed to update request");
    toast?.({ variant: "destructive", title: "Update failed", description: res?.message || "Failed to update request" });
    setActing(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Short Permissions</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select className="h-10 rounded-md border px-3" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select className="h-10 rounded-md border px-3" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="ALL">All Roles</option>
              <option value="teacher">Faculty</option>
              <option value="hod">HOD</option>
              <option value="mis">MIS</option>
            </select>
            <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            <Button onClick={() => { setPage(1); load(); }}>Refresh</Button>
          </div>

          {loading ? (
            <SkeletonList items={5} />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests found.</p>
          ) : (
            <div className="space-y-2">
              {items.map((r) => (
                <div key={r.id} className="rounded-xl border p-3 hover:bg-muted/30 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-2 font-medium">{r.user_name || "-"}</div>
                    <div className="md:col-span-1 text-sm">{r.role || "-"}</div>
                    <div className="md:col-span-3 text-sm">{r.request_date} | {r.from_time} - {r.to_time}</div>
                    <div className="md:col-span-3 text-sm truncate" title={r.reason}>{r.reason}</div>
                    <div className="md:col-span-1">
                      <Badge className={statusClass[r.status] || "bg-gray-100 text-gray-700"}>{r.status}</Badge>
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2">
                      {r.status === "PENDING" ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedId(r.id);
                              setActionStatus("APPROVED");
                              setRemarks("");
                              setRemarksOpen(true);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedId(r.id);
                              setActionStatus("REJECTED");
                              setRemarks("");
                              setRemarksOpen(true);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.approved_at ? new Date(r.approved_at).toLocaleString() : "-"}</span>
                      )}
                    </div>
                  </div>
                  {r.remarks ? <p className="text-xs text-muted-foreground mt-2">Remarks: {r.remarks}</p> : null}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-3">
            <Button size="sm" variant="outline" disabled={!hasPrev || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={!hasNext || loading} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
      <Dialog open={remarksOpen} onOpenChange={setRemarksOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionStatus === "APPROVED" ? "Approve Request" : "Reject Request"}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Add remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarksOpen(false)} disabled={acting}>Cancel</Button>
            <Button
              variant={actionStatus === "REJECTED" ? "destructive" : "default"}
              onClick={act}
              disabled={acting}
            >
              {acting ? "Updating..." : actionStatus === "APPROVED" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShortPermissionsManagement;
