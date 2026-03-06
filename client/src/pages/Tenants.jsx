import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const ID_TYPES = ['Aadhar', 'PAN', 'Passport', 'Driving License', 'Voter ID', 'Other'];

const emptyForm = {
  name: '', phone: '', email: '', address: '',
  idType: 'Aadhar', idNumber: '',
  building: '', flat: '',
  moveInDate: '', securityDeposit: '', rentAmount: '', rentDueDay: 1,
};

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [allFlats, setAllFlats] = useState([]);
  const [availableFlats, setAvailableFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterActive, setFilterActive] = useState('true');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTenants = useCallback(() => {
    const params = filterActive !== '' ? `?isActive=${filterActive}` : '';
    api
      .get(`/tenants${params}`)
      .then((res) => setTenants(res.data))
      .finally(() => setLoading(false));
  }, [filterActive]);

  const fetchFlats = () => api.get('/flats').then((res) => setAllFlats(res.data));

  useEffect(() => {
    api.get('/buildings').then((res) => setBuildings(res.data));
    fetchFlats();
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleBuildingChange = (buildingId) => {
    setForm((f) => ({ ...f, building: buildingId, flat: '', rentAmount: '' }));
    const vacants = allFlats.filter(
      (f) => f.building._id === buildingId && f.status === 'vacant'
    );
    setAvailableFlats(vacants);
  };

  const handleFlatChange = (flatId) => {
    const flat = allFlats.find((f) => f._id === flatId);
    setForm((f) => ({ ...f, flat: flatId, rentAmount: flat?.rentAmount ?? '' }));
  };

  const openAdd = () => {
    setForm(emptyForm);
    setAvailableFlats([]);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tenants', form);
      toast.success('Tenant added successfully');
      setModalOpen(false);
      fetchTenants();
      fetchFlats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveOut = async (id) => {
    if (!confirm('Confirm move-out for this tenant? The flat will be marked vacant.')) return;
    try {
      await api.patch(`/tenants/${id}/moveout`, { moveOutDate: new Date() });
      toast.success('Tenant moved out');
      fetchTenants();
      fetchFlats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing move out');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this tenant and all their payment records?')) return;
    try {
      await api.delete(`/tenants/${id}`);
      toast.success('Tenant deleted');
      fetchTenants();
      fetchFlats();
    } catch (err) {
      toast.error('Error deleting tenant');
    }
  };

  const tabs = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Moved Out' },
    { value: '', label: 'All' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500 mt-1">Manage tenant records</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          + Add Tenant
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 bg-white border border-gray-200 p-1 rounded-lg w-fit">
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setLoading(true); setFilterActive(value); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filterActive === value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : tenants?.length === 0 ? (
        <div className="card text-center py-20">
          <p className="text-5xl mb-4">👥</p>
          <p className="text-gray-500 font-medium">No tenants found</p>
          <p className="text-gray-400 text-sm mt-1">
            {filterActive === 'true' ? 'Add a tenant to get started' : 'No records match this filter'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Tenant', 'Contact', 'Property', 'Rent', 'Move In', 'Status', 'Actions'].map(
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
                {tenants?.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.idType}: {t.idNumber || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{t.phone}</p>
                      <p className="text-xs text-gray-400">{t.email || '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800">{t.building?.name}</p>
                      <p className="text-xs text-gray-400">Flat {t.flat?.flatNumber}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-blue-600">
                        ₹{t.rentAmount?.toLocaleString()}/mo
                      </p>
                      <p className="text-xs text-gray-400">Due: {t.rentDueDay}th</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {new Date(t.moveInDate).toLocaleDateString()}
                      {t.moveOutDate && (
                        <p className="text-xs text-gray-400">
                          Out: {new Date(t.moveOutDate).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {t.isActive ? (
                        <span className="badge-green">Active</span>
                      ) : (
                        <span className="badge-gray">Moved Out</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {t.isActive && (
                          <button
                            onClick={() => handleMoveOut(t._id)}
                            className="text-xs px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 font-medium transition-colors"
                          >
                            Move Out
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(t._id)}
                          className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium transition-colors"
                        >
                          Delete
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

      {/* Add Tenant Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Tenant"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal info */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Personal Information
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                placeholder="+91 9876543210"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input-field"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="label">Permanent Address</label>
              <input
                className="input-field"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Home address"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">ID Type</label>
              <select
                className="input-field"
                value={form.idType}
                onChange={(e) => setForm({ ...form, idType: e.target.value })}
              >
                {ID_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ID Number</label>
              <input
                className="input-field"
                value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                placeholder="XXXX-XXXX-XXXX"
              />
            </div>
          </div>

          {/* Property */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">
            Property Assignment
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Building *</label>
              <select
                className="input-field"
                value={form.building}
                onChange={(e) => handleBuildingChange(e.target.value)}
                required
              >
                <option value="">Select Building</option>
                {buildings?.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Vacant Flat *</label>
              <select
                className="input-field"
                value={form.flat}
                onChange={(e) => handleFlatChange(e.target.value)}
                required
                disabled={!form.building}
              >
                <option value="">
                  {form.building ? 'Select Flat' : 'Choose building first'}
                </option>
                {availableFlats.map((f) => (
                  <option key={f._id} value={f._id}>
                    Flat {f.flatNumber} · Floor {f.floor} · ₹{f.rentAmount}/mo
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lease */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">
            Lease Details
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Move-In Date *</label>
              <input
                className="input-field"
                type="date"
                value={form.moveInDate}
                onChange={(e) => setForm({ ...form, moveInDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Rent Amount (₹) *</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.rentAmount}
                onChange={(e) => setForm({ ...form, rentAmount: e.target.value })}
                required
                placeholder="Auto-filled from flat"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Security Deposit (₹)</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.securityDeposit}
                onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Rent Due Day (1–31)</label>
              <input
                className="input-field"
                type="number"
                min="1"
                max="31"
                value={form.rentDueDay}
                onChange={(e) => setForm({ ...form, rentDueDay: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">
              {saving ? 'Adding…' : 'Add Tenant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
