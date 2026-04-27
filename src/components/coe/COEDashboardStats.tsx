import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { getCOEDashboardStats, DashboardStats } from "../../utils/coe_api";

const COEDashboardStats: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await getCOEDashboardStats();
      if (res.success && res.data) setStats(res.data);
      else setStats(null);
    } catch (e) {
      console.error("Error loading COE dashboard:", e);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "applied":
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-300 rounded" />
            ))}
          </div>
          <div className="h-64 bg-gray-300 rounded" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load dashboard statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_applications}</div>
            <div className="text-sm text-muted-foreground mt-1">Applications submitted</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Question Papers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qp_stats?.total_qps ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Total QPs</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending COE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.qp_stats?.pending_coe_qps ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Awaiting your review</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Published Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published_results_summary?.total_published_results ?? 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Finalized results</div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul
              className="space-y-3 overflow-y-auto"
              style={{ maxHeight: '220px' }}
            >
              {(stats.recent_activity || []).slice(0, 5).map((activity, idx) => (
                <li key={idx} className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-primary">{activity.description}</div>
                    <div className="text-xs text-muted-foreground">{activity.timestamp}</div>
                  </div>
                  <div className="ml-4">{getStatusBadge(activity.status)}</div>
                </li>
              ))}
            </ul>
            {(stats.recent_activity || []).length > 5 && (
              <div className="text-right mt-3">
                <a href="/coe/student-status" className="text-sm text-blue-600">View all</a>
              </div>
            )}
            {(stats.recent_activity || []).length === 0 && (
              <div className="text-center py-4 text-muted-foreground">No recent activity</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Published Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul
              className="space-y-3 overflow-y-auto"
              style={{ maxHeight: '220px' }}
            >
              {(stats.published_results_summary?.recent_published_results || []).slice(0, 5).map((pr, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{pr.student_name}</div>
                    <div className="text-xs text-muted-foreground">{pr.usn} • {pr.published_at}</div>
                  </div>
                </li>
              ))}
            </ul>
            {(stats.published_results_summary?.recent_published_results || []).length > 5 && (
              <div className="text-right mt-3">
                <a href="/coe/publish-results" className="text-sm text-blue-600">View all</a>
              </div>
            )}
            {(!stats.published_results_summary || stats.published_results_summary.recent_published_results.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">No recent published results</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default COEDashboardStats;
