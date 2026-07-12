import { useEffect, useState, useCallback } from 'react';
import * as I from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import DashboardSkeleton from '../../components/dashboard/DashboardSkeleton';
import DashboardErrorState from '../../components/dashboard/DashboardErrorState';
import ModuleIntegrationNotice from '../../components/dashboard/ModuleIntegrationNotice';
import PersonalizedDashboard from '../../components/dashboard/PersonalizedDashboard';
import { dashboardService } from '../../services/dashboardService';
import useAuth from '../../hooks/useAuth';

const colors = ['#4f46e5', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

const Chart = ({ title, data, pie = false }) => {
  if (!data || !data.length) return null;
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          {pie ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80}>
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" radius={[5, 5, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await dashboardService.getOverview();
      setData(res?.data || null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <><PageHeader title="Dashboard" description="Loading live operational data..." /><DashboardSkeleton /></>;
  if (error) return <><PageHeader title="Dashboard" description="Something went wrong." /><DashboardErrorState retry={load} /></>;

  const firstName = user?.name?.split(' ')[0] || 'there';
  const { kpis = [], charts = {}, recent = {}, integrations = {}, employee = null, unreadNotifications = 0 } = data || {};

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what's happening across your organization today."
        action={
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <I.RefreshCw size={16} /> Refresh
          </button>
        }
      />

      <ModuleIntegrationNotice integrations={integrations} />

      {employee && <PersonalizedDashboard employee={employee} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => {
          const Icon = I[k.icon] || I.Package;
          return (
            <div className="card !p-4" key={k.key}>
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-50 text-primary-600">
                  <Icon size={18} />
                </span>
                <span className="text-xs font-semibold text-emerald-600">Live</span>
              </div>
              <p className="mt-4 text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="mt-1 text-xs text-slate-500">{k.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Chart title="Assets by lifecycle status" data={charts.assetsByLifecycle} pie />
        <Chart title="Assets by category" data={charts.assetsByCategory} />
        <Chart title="Assets by department" data={charts.assetsByDepartment} />
        <Chart title="Allocations by status" data={charts.allocationsByStatus} />
        <Chart title="Bookings by status" data={charts.bookingsByStatus} />
        {charts.maintenanceByStatus?.length > 0 && (
          <Chart title="Maintenance by status" data={charts.maintenanceByStatus} />
        )}
        {charts.auditsByStatus?.length > 0 && (
          <Chart title="Audits by status" data={charts.auditsByStatus} />
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="card xl:col-span-1">
          <h3 className="mb-4 font-semibold text-slate-900">Recently added assets</h3>
          <div className="divide-y">
            {(recent.assets || []).map((a) => (
              <div className="flex items-center justify-between py-3" key={a._id}>
                <div>
                  <b className="text-sm text-slate-800">{a.name}</b>
                  <p className="text-xs text-slate-500">
                    {a.assetTag} · {a.department || a.category || '—'}
                  </p>
                </div>
                <StatusBadge status={a.lifecycleStatus} />
              </div>
            ))}
            {!recent.assets?.length && <p className="py-3 text-sm text-slate-400">No assets yet.</p>}
          </div>
        </div>

        <div className="card xl:col-span-1">
          <h3 className="mb-4 font-semibold text-slate-900">Upcoming bookings</h3>
          <div className="divide-y">
            {(recent.bookings || []).map((b) => (
              <div className="flex items-center justify-between py-3" key={b._id}>
                <div>
                  <b className="text-sm text-slate-800">{b.title}</b>
                  <p className="text-xs text-slate-500">
                    {b.resourceName} · {b.bookedByName || '—'}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
            {!recent.bookings?.length && <p className="py-3 text-sm text-slate-400">No bookings yet.</p>}
          </div>
        </div>

        <div className="card xl:col-span-1">
          <h3 className="mb-4 font-semibold text-slate-900">Recent activity</h3>
          <div className="space-y-4">
            {(recent.activity || []).map((x) => (
              <div className="flex gap-3 text-sm" key={x._id}>
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                <div>
                  <p className="text-slate-700">{x.description}</p>
                  <small className="text-slate-400">
                    {x.userName} · {new Date(x.createdAt).toLocaleString()}
                  </small>
                </div>
              </div>
            ))}
            {!recent.activity?.length && <p className="py-3 text-sm text-slate-400">No activity yet.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
