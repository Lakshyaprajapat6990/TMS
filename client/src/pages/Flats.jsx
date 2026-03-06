import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const emptyForm = {
  flatNumber: '',
  floor: '',
  building: '',
  rentAmount: '',
  bedrooms: 1,
  bathrooms: 1,
  area: '',
};

function StatusBadge({ status }) {
  return status === 'occupied' ? (
    <span className="badge-green">Occupied</span>
  ) : (
    <span className="badge-orange">Vacant</span>
  );
}

export default function Flats() {
  const [flats, setFlats] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFlat, setEditFlat] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchFlats = useCallback(() => {
    const params = new URLSearchParams();
    if (filterBuilding) params.append('building', filterBuilding);
    if (filterStatus) params.append('status', filterStatus);
    api
      .get(`/flats?${params}`)
      .then((res) => setFlats(res.data))
      .finally(() => setLoading(false));
  }, [filterBuilding, filterStatus]);

  useEffect(() => {
    api.get('/buildings').then((res) => setBuildings(res.data));
  }, []);

  useEffect(() => { fetchFlats(); }, [fetchFlats]);

  const openAdd = () => {
    setEditFlat(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (f) => {
    setEditFlat(f);
    setForm({
      flatNumber: f.flatNumber,
      floor: f.floor,
      building: f.building._id,
      rentAmount: f.rentAmount,
      bedrooms: f.bedrooms,
      bathrooms: f.bathrooms,
      area: f.area || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editFlat) {
        await api.put(`/flats/${editFlat._id}`, form);
        toast.success('Flat updated');
      } else {
        await api.post('/flats', form);
        toast.success('Flat added');
      }
      setModalOpen(false);
      fetchFlats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (flat) => {
    const newStatus = flat.status === 'vacant' ? 'occupied' : 'vacant';
    try {
      await api.patch(`/flats/${flat._id}/status`, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      fetchFlats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this flat?')) return;
    try {
      await api.delete(`/flats/${id}`);
      toast.success('Flat deleted');
      fetchFlats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flats</h1>
          <p className="text-gray-500 mt-1">Manage individual units</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          + Add Flat
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
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
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
        </select>
        <span className="text-sm text-gray-500 self-center">
          {flats?.length} flat{flats?.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <Spinner />
      ) : flats?.length === 0 ? (
        <div className="card text-center py-20">
          <p className="text-5xl mb-4">🏠</p>
          <p className="text-gray-500 font-medium">No flats found</p>
          <p className="text-gray-400 text-sm mt-1">
            {filterBuilding || filterStatus
              ? 'Try adjusting your filters'
              : 'Click "Add Flat" to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {flats?.map((f) => (
            <div key={f._id} className="card hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Flat {f.flatNumber}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {f.building?.name} · Floor {f.floor}
                  </p>
                </div>
                <StatusBadge status={f.status} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                {[
                  { label: 'Beds', value: f.bedrooms },
                  { label: 'Baths', value: f.bathrooms },
                  { label: 'sq ft', value: f.area ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg py-2">
                    <p className="font-semibold text-gray-900 text-sm">{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-center">
                <p className="text-xs text-blue-500 font-medium">Monthly Rent</p>
                <p className="text-xl font-bold text-blue-700">
                  ₹{f.rentAmount?.toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => toggleStatus(f)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                    f.status === 'vacant'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  Mark {f.status === 'vacant' ? 'Occupied' : 'Vacant'}
                </button>
                <button
                  onClick={() => openEdit(f)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(f._id)}
                  className="btn-danger text-xs py-1.5 px-3"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editFlat ? 'Edit Flat' : 'Add Flat'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Flat Number *</label>
              <input
                className="input-field"
                value={form.flatNumber}
                onChange={(e) => setForm({ ...form, flatNumber: e.target.value })}
                required
                placeholder="e.g. A-101"
              />
            </div>
            <div>
              <label className="label">Floor</label>
              <input
                className="input-field"
                type="number"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="label">Building *</label>
            <select
              className="input-field"
              value={form.building}
              onChange={(e) => setForm({ ...form, building: e.target.value })}
              required
            >
              <option value="">Select Building</option>
              {buildings?.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Rent Amount (₹/month) *</label>
            <input
              className="input-field"
              type="number"
              min="0"
              value={form.rentAmount}
              onChange={(e) => setForm({ ...form, rentAmount: e.target.value })}
              required
              placeholder="e.g. 15000"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Bedrooms</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.bedrooms}
                onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.bathrooms}
                onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Area (sq ft)</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="Optional"
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
              {saving ? 'Saving…' : editFlat ? 'Update Flat' : 'Add Flat'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
