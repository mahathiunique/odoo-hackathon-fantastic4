export default function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="card !p-4">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
            <div className="mt-4 h-6 w-16 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-72 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
