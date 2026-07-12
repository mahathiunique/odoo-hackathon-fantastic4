import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { unread, refresh } = useNotifications();
  const ref = useRef(null);

  // Refresh (deduplicated notifications) whenever the dropdown opens.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Notifications"
        className="relative rounded-lg p-2 hover:bg-slate-100"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] text-white">
            {unread}
          </span>
        )}
      </button>
      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
