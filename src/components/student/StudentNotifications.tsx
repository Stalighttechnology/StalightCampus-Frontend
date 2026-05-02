import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Megaphone, Bell } from "lucide-react";
import { useStudentNotificationsQuery } from "@/hooks/useApiQueries";
import { useTheme } from "@/context/ThemeContext";
import { useVirtualizer } from '@tanstack/react-virtual';
import { SkeletonList } from "../ui/skeleton";

interface Notification {
  id: number;
  title: string;
  message: string;
  created_at: string;
}

// Virtualized Notifications List Component
const VirtualizedNotificationsList = React.memo(({ 
  notifications, 
  theme 
}: { 
  notifications: Notification[]; 
  theme: string 
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated notification item height
    overscan: 3,
  });

  if (notifications.length === 0) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
        <Bell className="mx-auto h-8 w-8 mb-2" />
        <p>No notifications available</p>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="h-96 overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div 
        style={{ 
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = notifications[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              className={`rounded-lg border p-4 transition-colors ${theme === 'dark' ? 'border-border hover:bg-accent' : 'border-gray-200 hover:bg-gray-50'}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <h3 className={`font-medium ${theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}`}>{item.title}</h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}>
                    {item.message}
                  </p>
                </div>
                <Badge variant="secondary" className={`text-xs shrink-0 ${theme === 'dark' ? 'bg-muted text-muted-foreground' : 'bg-gray-100 text-gray-800'}`}>
                  New
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const StudentNotifications = () => {
  const { theme } = useTheme();
  const { data: notificationsResponse, isLoading, error, infiniteScroll } = useStudentNotificationsQuery();

  // Extract notifications from response
  const notifications = notificationsResponse?.notifications || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              <CardTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>Notifications</CardTitle>
            </div>
            <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
              View all recent updates from your institution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SkeletonList items={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="text-red-500">Error loading notifications</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={theme === 'dark' ? 'bg-card text-card-foreground border-border' : 'bg-white text-gray-900 border-gray-200'}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            <CardTitle className={theme === 'dark' ? 'text-card-foreground' : 'text-gray-900'}>Notifications</CardTitle>
          </div>
          <CardDescription className={theme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}>
            View all recent updates from your institution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VirtualizedNotificationsList notifications={notifications} theme={theme} />
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentNotifications;