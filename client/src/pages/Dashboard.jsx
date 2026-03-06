import { useState, useEffect } from 'react';
import api from '../api/axios';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <p className="text-red-500">{error}</p>;

  const occupancyPct = data.totalFlats
    ? Math.round((data.occupiedFlats / data.totalFlats) * 100)
    : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of all your properties</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total Buildings"
          value={data.totalBuildings}
          icon="🏢"
          color="blue"
        />
        <StatCard
          title="Total Flats"
          value={data.totalFlats}
          icon="🏠"
          color="purple"
          subtitle={`${data.occupiedFlats} occupied · ${data.vacantFlats} vacant`}
        />
        <StatCard
          title="Active Tenants"
          value={data.totalTenants}
          icon="👥"
          color="green"
        />
        <StatCard
          title="Pending Dues"
          value={`₹${(data.pendingAmount || 0).toLocaleString()}`}
          icon="💰"
          color="red"
          subtitle={`${data.pendingRents + data.overdueRents} payments outstanding`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy bar */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Occupancy Status</h2>
          <div className="space-y-5">
            {[
              { label: 'Occupied', count: data.occupiedFlats, color: 'bg-green-500' },
              { label: 'Vacant',   count: data.vacantFlats,   color: 'bg-orange-400' },
            ].map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium text-gray-900">
                    {count}/{data.totalFlats}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`${color} h-2.5 rounded-full transition-all`}
                    style={{
                      width: data.totalFlats
                        ? `${(count / data.totalFlats) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-4 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-600">{occupancyPct}%</p>
                <p className="text-sm text-gray-500 mt-1">Occupancy Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rent status this month */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Rent Status — This Month</h2>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            {[
              { label: 'Paid',    count: data.paidThisMonth, bg: 'bg-green-50',  text: 'text-green-600'  },
              { label: 'Pending', count: data.pendingRents,  bg: 'bg-yellow-50', text: 'text-yellow-600' },
              { label: 'Overdue', count: data.overdueRents,  bg: 'bg-red-50',    text: 'text-red-600'    },
            ].map(({ label, count, bg, text }) => (
              <div key={label} className={`${bg} rounded-xl p-4`}>
                <p className={`text-3xl font-bold ${text}`}>{count}</p>
                <p className={`text-xs mt-1 font-medium ${text}`}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent payments */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Payments</h2>
          {data.recentPayments?.length === 0 ? (
            <p className="text-gray-400 text-sm">No payments recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recentPayments?.map((p) => (
                <div key={p._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.tenant?.name}</p>
                    <p className="text-xs text-gray-400">
                      {p.building?.name} · Flat {p.flat?.flatNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      ₹{p.amount?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.paidDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due in 7 days */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Due in Next 7 Days</h2>
          {data.upcomingDue?.length === 0 ? (
            <p className="text-gray-400 text-sm">No upcoming dues this week.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.upcomingDue?.map((p) => (
                <div key={p._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.tenant?.name}</p>
                    <p className="text-xs text-gray-400">
                      {p.building?.name} · Flat {p.flat?.flatNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">
                      ₹{p.amount?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-400">
                      Due {new Date(p.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
