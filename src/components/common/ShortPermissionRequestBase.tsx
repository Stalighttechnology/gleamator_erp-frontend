import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { SkeletonList } from "../ui/skeleton";
import { useToast } from "../../hooks/use-toast";
import { createShortPermission, getMyShortPermissions, ShortPermissionItem } from "@/utils/short_permission_api";

const statusClass: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const ShortPermissionRequestBase = ({ title }: { title: string }) => {
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ShortPermissionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMyShortPermissions({ page, page_size: 8 });
      const payload = res?.results || res;
      const data = payload?.data || [];
      setItems(data);
      const count = Number(res?.count || 0);
      const pageSize = 8;
      setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
      setHasNext(Boolean(res?.next));
      setHasPrev(Boolean(res?.previous));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{title}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
            <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
          </div>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
          <Button
            disabled={submitting || !requestDate || !fromTime || !toTime || !reason.trim()}
            onClick={async () => {
              setSubmitting(true);
              try {
                const res = await createShortPermission({
                  request_date: requestDate,
                  from_time: fromTime,
                  to_time: toTime,
                  reason: reason.trim(),
                });
                if (res?.success) {
                  setReason("");
                  toast({ title: "Request submitted", description: "Short permission request created successfully." });
                  setPage(1);
                  await load();
                } else {
                  toast({ variant: "destructive", title: "Submission failed", description: res?.message || "Failed to submit request" });
                }
              } catch (e: any) {
                toast({ variant: "destructive", title: "Error", description: e?.message || "Something went wrong" });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Request History</h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonList items={4} />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <>
              <div className="space-y-2">
                {items.map((r) => (
                  <div key={r.id} className="rounded-xl border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="text-sm">
                      <div className="font-medium">{r.request_date} | {r.from_time} - {r.to_time}</div>
                      <div className="text-muted-foreground">{r.reason}</div>
                      {r.remarks ? <div className="text-xs mt-1">Remarks: {r.remarks}</div> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusClass[r.status] || "bg-gray-100 text-gray-700"}>{r.status}</Badge>
                      {r.approved_at ? <span className="text-xs text-muted-foreground">{new Date(r.approved_at).toLocaleString()}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <Button size="sm" variant="outline" disabled={!hasPrev || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <Button size="sm" variant="outline" disabled={!hasNext || loading} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShortPermissionRequestBase;
