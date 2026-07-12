export default function LoadingSkeleton(){return <div className="card animate-pulse space-y-3">{[1,2,3,4].map(x=><div key={x} className="h-12 rounded bg-slate-100"/>)}</div>}
