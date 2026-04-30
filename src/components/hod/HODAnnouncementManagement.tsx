import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  fetchAnnouncements,
  markAnnouncementRead,
  Announcement,
} from "@/utils/announcements_api";
import AnnouncementSections from "@/components/common/AnnouncementSections";

const HODAnnouncementManagement = () => {
  const [receivedAnnouncements, setReceivedAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);
    const response = await fetchAnnouncements(1, 50);

    if (response.success && response.data) {
      setReceivedAnnouncements(response.data.received_announcements.results || []);
      setError(null);
    } else {
      setError(response.message || "Failed to load announcements");
      setReceivedAnnouncements([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleMarkRead = async (announcementId: number) => {
    try {
      const response = await markAnnouncementRead(announcementId);
      if (response.success) {
        setReceivedAnnouncements((prev) =>
          prev.map((a) => (a.id === announcementId ? { ...a, is_read: true } : a))
        );
      }
    } catch (error: any) {
      console.error("Failed to mark as read:", error);
    }
  };

  return (
    <div className="w-full max-w-none mx-auto space-y-6">
      <Card className={`${theme === 'dark' ? 'bg-card text-foreground border-border shadow-sm' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">Announcements</CardTitle>
            <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
              View announcements from the administration
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Announcement Sections */}
      {!loading && !error && (
        <AnnouncementSections
          receivedAnnouncements={receivedAnnouncements}
          onMarkRead={handleMarkRead}
          loading={loading}
          showActions={false}
        />
      )}
    </div>
  );
};

export default HODAnnouncementManagement;
