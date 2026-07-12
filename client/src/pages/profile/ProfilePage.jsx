import useAuth from '../../hooks/useAuth';
import PageHeader from '../../components/layout/PageHeader';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader title="My profile" description="View your authenticated account details from the backend." />
      <div className="grid gap-5 lg:grid-cols-3">
        <aside className="card text-center">
          <span className="mx-auto grid h-24 w-24 place-items-center rounded-2xl bg-primary-100 text-2xl font-bold text-primary-700">
            {user?.name?.split(' ').map((x) => x[0]).join('') || 'U'}
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-900">{user?.name}</h2>
          <p className="text-sm text-slate-500">{user?.role}</p>
          <span className="mt-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {user?.status || 'Active'} account
          </span>
        </aside>
        <div className="card lg:col-span-2">
          <h2 className="mb-5 font-semibold text-slate-900">Personal information</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full name</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{user?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{user?.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{user?.role || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{user?.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last login</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Not available yet'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account status</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{user?.status || '—'}</p>
            </div>
          </div>
          <div className="mt-8 border-t pt-5">
            <h3 className="font-semibold text-slate-800">Department information</h3>
            <p className="mt-1 text-sm text-slate-500">Department information will be connected during the Employee module stage.</p>
          </div>
        </div>
      </div>
    </>
  );
}
