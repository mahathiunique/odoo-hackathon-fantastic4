import { CircleAlert, RefreshCw } from 'lucide-react';

export default function DashboardErrorState({ retry }) {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <CircleAlert className="text-red-500" size={40} />
      <p className="mt-3 font-semibold text-slate-800">We couldn't load your dashboard</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        Something went wrong while fetching live operational data. Please try again.
      </p>
      {retry && (
        <button onClick={retry} className="btn-secondary mt-4 flex items-center gap-2">
          <RefreshCw size={16} /> Try again
        </button>
      )}
    </div>
  );
}
