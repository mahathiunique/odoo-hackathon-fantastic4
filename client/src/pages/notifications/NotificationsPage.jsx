import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import useNotifications from '../../hooks/useNotifications';
import NotificationItem from '../../components/notifications/NotificationItem';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export default function NotificationsPage() {
  const { items, unread, loading, markRead, markAll, refresh } = useNotifications();

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unread} unread notification${unread === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2" onClick={() => refresh()}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => markAll()}
              disabled={!unread}
            >
              <CheckCheck size={16} /> Mark all as read
            </button>
          </div>
        }
      />

      {loading && !items.length ? (
        <div className="card">
          <LoadingSkeleton />
        </div>
      ) : items.length ? (
        <div className="overflow-hidden rounded-xl border bg-white shadow-card">
          {items.map((x) => (
            <NotificationItem key={x._id} notification={x} onMarkRead={markRead} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<Bell size={40} />}
            title="You're all caught up"
            description="New notifications about allocations, bookings and system events will appear here."
          />
        </div>
      )}
    </>
  );
}
