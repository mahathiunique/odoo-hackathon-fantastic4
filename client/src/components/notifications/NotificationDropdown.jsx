import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import useNotifications from '../../hooks/useNotifications';
import NotificationItem from './NotificationItem';
import EmptyState from '../common/EmptyState';
import LoadingSkeleton from '../common/LoadingSkeleton';

export default function NotificationDropdown({ onClose }) {
  const { items, unread, loading, markRead, markAll, refresh } = useNotifications();

  return (
    <div className="absolute right-0 top-12 z-30 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-white shadow-xl">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Bell size={16} />
          Notifications
          {unread > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-xs text-white">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            title="Refresh notifications"
            onClick={() => refresh()}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <RefreshCw size={16} />
          </button>
          <button
            title="Mark all as read"
            onClick={() => markAll()}
            disabled={!unread}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <CheckCheck size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {loading && !items.length ? (
          <div className="p-4">
            <LoadingSkeleton />
          </div>
        ) : items.length ? (
          items.map((n) => (
            <NotificationItem key={n._id} notification={n} onMarkRead={markRead} onNavigate={onClose} />
          ))
        ) : (
          <EmptyState title="No notifications yet" description="We'll let you know when something needs your attention." />
        )}
      </div>

      <Link
        to="/notifications"
        onClick={onClose}
        className="block border-t p-3 text-center text-sm font-semibold text-primary-600 hover:bg-slate-50"
      >
        View all notifications
      </Link>
    </div>
  );
}
