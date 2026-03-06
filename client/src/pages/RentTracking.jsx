import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const THIS_MONTH = new Date().getMonth() + 1;
const THIS_YEAR  = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => THIS_YEAR - 2 + i);

const STATUS_STYLES = {
  paid:    { badge: 'badge-green',  row: '' },
  pending: { badge: 'badge-yellow', row: '' },
  overdue: { badge: 'badge-red',    row: 'bg-red-50/30' },
};

function SummaryBox({ label, count, amount, bg, text }) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <p className={`text-3xl font-bold ${text}`}>{count}</p>
      <p className={`text-xs font-semibold uppercase tracking-wide ${text} mt-0.5`}>{label}</p>
      <p className={`text-xs ${text} opacity-80 mt-1`}>₹{(amount || 0).toLocaleString()}</p>
    </div>
  );
}

export default function RentTracking() {
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [filterMonth, setFilterMonth]       = useState(THIS_MONTH);
  const [filterYear, setFilterYear]         = useState(THIS_YEAR);
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');

  // Mark-paid modal
  const [payModal, setPayModal]               = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [payForm, setPayForm]                 = useState({
    amount: '',
    paidDate: new Date().toISOString().split('T')[0],
  });

  // Add record modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm]   = useState({
    tenant: '', flat: '', building: '',
    amount: '', dueDate: '',
    month: THIS_MONTH, year: THIS_YEAR, notes: '',
  });
  const [tenantMap, setTenantMap] = useState({});

  // ── Fetch ─────────────────────────────────────────────
  const fetchPayments = useCallback(() => {
    const p = new URLSearchParams();
    if (filterMonth)    p.append('month',    filterMonth);
    if (filterYear)     p.append('year',     filterYear);
    if (filterBuilding) p.append('building', filterBuilding);
    if (filterStatus)   p.append('status',   filterStatus);

    api
      .get(`/rent?${p}`)
      .then((res) => setPayments(res.data))
      .finally(() => setLoading(false));
  }, [filterMonth, filterYear, filterBuilding, filterStatus]);

  useEffect(() => {
    api.get('/buildings').then((res) => setBuildings(res.data));
    api.get('/tenants?isActive=true').then((res) => {
      setTenants(res.data);
      const map = {};
      res.data.forEach((t) => { map[t._id] = t; });
      setTenantMap(map);
    });
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── Actions ───────────────────────────────────────────
  const handleGenerate = async () => {
    if (
      !confirm(
        `Generate rent records for ${MONTHS[filterMonth - 1]} ${filterYear}?\n` +
        'Existing records for this period will be skipped.'
      )
    )
      return;

    setGenerating(true);
    try {
      const res = await api.post('/rent/generate', {
        month: Number(filterMonth),
        year: Number(filterYear),
      });
      toast.success(
        `Created ${res.data.created} record${res.data.created !== 1 ? 's' : ''}.` +
        (res.data.skipped ? ` Skipped ${res.data.skipped} (already exist).` : '')
      );
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error generating payments');
    } finally {
      setGenerating(false);
    }
  };

  const openPayModal = (payment) => {
    setSelectedPayment(payment);
    setPayForm({
      amount: payment.amount,
      paidDate: new Date().toISOString().split('T')[0],
    });
    setPayModal(true);
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/rent/${selectedPayment._id}/pay`, payForm);
      toast.success('Payment marked as paid');
      setPayModal(false);
      fetchPayments();
    } catch (err) {
      toast.error('Error recording payment');
    }
  };

  const handleTenantSelect = (tenantId) => {
    const t = tenantMap[tenantId];
    if (t) {
      setAddForm((f) => ({
        ...f,
        tenant: tenantId,
        flat: t.flat._id,
        building: t.building._id,
        amount: t.rentAmount,
      }));
    } else {
      setAddForm((f) => ({ ...f, tenant: tenantId }));
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rent', { ...addForm, month: Number(addForm.month), year: Number(addForm.year) });
      toast.success('Payment record added');
      setAddModal(false);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding record');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      await api.delete(`/rent/${id}`);
      toast.success('Record deleted');
      fetchPayments();
    } catch (err) {
      toast.error('Error deleting record');
    }
  };

  // ── Summaries ─────────────────────────────────────────
  const summary = ['paid', 'pending', 'overdue'].map((s) => {
    const filtered = payments.filter((p) => p.status === s);
    return {
      status: s,
      count: filtered.length,
      amount: filtered.reduce((sum, p) => sum + (p.amount || 0), 0),
    };
  });

  const summaryConfig = {
    paid:    { bg: 'bg-green-50',  text: 'text-green-700'  },
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    overdue: { bg: 'bg-red-50',    text: 'text-red-700'    },
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rent Tracking</h1>
          <p className="text-gray-500 mt-1">Track and manage monthly rent payments</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setAddModal(true)} className="btn-secondary">
            + Add Record
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary"
          >
            {generating ? 'Generating…' : 'Generate Monthly'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="input-field w-auto"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          className="input-field w-auto"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="input-field w-auto"
          value={filterBuilding}
          onChange={(e) => setFilterBuilding(e.target.value)}
        >
          <option value="">All Buildings</option>
          {buildings?.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        <select
          className="input-field w-auto"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Summary boxes */}
      {payments?.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {summary.map(({ status, count, amount }) => (
            <SummaryBox
              key={status}
              label={status}
              count={count}
              amount={amount}
              bg={summaryConfig[status].bg}
              text={summaryConfig[status].text}
            />
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Spinner />
      ) : payments?.length === 0 ? (
        <div className="card text-center py-20">
          <p className="text-5xl mb-4">💰</p>
          <p className="text-gray-500 font-medium">No payment records found</p>
          <p className="text-gray-400 text-sm mt-1">
            Click &ldquo;Generate Monthly&rdquo; to create records for all active tenants
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Tenant', 'Property', 'Period', 'Amount', 'Due Date', 'Paid On', 'Status', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments?.map((p) => (
                  <tr
                    key={p._id}
                    className={`hover:bg-gray-50/70 transition-colors ${
                      STATUS_STYLES[p.status]?.row || ''
                    }`}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{p.tenant?.name}</p>
                      <p className="text-xs text-gray-400">{p.tenant?.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{p.building?.name}</p>
                      <p className="text-xs text-gray-400">Flat {p.flat?.flatNumber}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {MONTHS[p.month - 1]} {p.year}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                      ₹{p.amount?.toLocaleString() || 0}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {new Date(p.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {p.paidDate ? new Date(p.paidDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={STATUS_STYLES[p.status]?.badge || 'badge-gray'}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => openPayModal(p)}
                            className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 font-medium transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium transition-colors"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Mark Paid Modal ── */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Record Payment">
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-800">{selectedPayment?.tenant?.name}</p>
            <p className="text-blue-600 text-xs mt-0.5">
              {selectedPayment && MONTHS[selectedPayment.month - 1]} {selectedPayment?.year} ·{' '}
              {selectedPayment?.building?.name} Flat {selectedPayment?.flat?.flatNumber}
            </p>
          </div>
          <div>
            <label className="label">Amount Received (₹) *</label>
            <input
              className="input-field"
              type="number"
              min="0"
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Payment Date *</label>
            <input
              className="input-field"
              type="date"
              value={payForm.paidDate}
              onChange={(e) => setPayForm({ ...payForm, paidDate: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setPayModal(false)} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary">
              Confirm Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Add Record Modal ── */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Payment Record">
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div>
            <label className="label">Tenant *</label>
            <select
              className="input-field"
              value={addForm.tenant}
              onChange={(e) => handleTenantSelect(e.target.value)}
              required
            >
              <option value="">Select Tenant</option>
              {tenants?.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} — {t.building?.name} Flat {t.flat?.flatNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Month *</label>
              <select
                className="input-field"
                value={addForm.month}
                onChange={(e) => setAddForm({ ...addForm, month: e.target.value })}
                required
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Year *</label>
              <select
                className="input-field"
                value={addForm.year}
                onChange={(e) => setAddForm({ ...addForm, year: e.target.value })}
                required
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (₹) *</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                required
                placeholder="Auto-filled from tenant"
              />
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input
                className="input-field"
                type="date"
                value={addForm.dueDate}
                onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input
              className="input-field"
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              placeholder="Optional note"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setAddModal(false)} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary">
              Add Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
