import { Link } from 'react-router-dom';

const priorityDot = (notification) => {
  if (notification.isRead) return 'bg-slate-300';
  if (notification.priority === 'Critical') return 'bg-red-500';
  if (notification.priority === 'High') return 'bg-amber-500';
  return 'bg-primary-500';
};

export default function NotificationItem({ notification, onMarkRead, onNavigate }) {
  const { _id, title, message, type, isRead, createdAt, actionUrl, priority } = notification;
  const Wrapper = actionUrl ? Link : 'div';
  const wrapperProps = actionUrl ? { to: actionUrl, onClick: () => onNavigate?.() } : {};

  return (
    <Wrapper
      {...wrapperProps}
      onClick={() => !isRead && onMarkRead(_id)}
      className={`flex items-start gap-3 border-b p-4 text-left text-sm transition hover:bg-slate-50 ${
        !isRead ? 'bg-indigo-50/60' : ''
      }`}
    >
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${priorityDot(notification)}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <b className="text-sm text-slate-900">{title}</b>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{type}</span>
        </div>
        <p className="mt-1 text-xs text-slate-600">{message}</p>
        <time className="mt-1 block text-[11px] text-slate-400">
          {createdAt ? new Date(createdAt).toLocaleString() : ''}
        </time>
      </div>
    </Wrapper>
  );
}
