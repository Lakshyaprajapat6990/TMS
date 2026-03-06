import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const emptyForm = { name: '', address: '', description: '' };

export default function Buildings() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBuilding, setEditBuilding] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchBuildings = useCallback(() => {
    api
      .get('/buildings')
      .then((res) => setBuildings(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBuildings(); }, [fetchBuildings]);

  const openAdd = () => {
    setEditBuilding(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditBuilding(b);
    setForm({ name: b.name, address: b.address, description: b.description || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editBuilding) {
        await api.put(`/buildings/${editBuilding._id}`, form);
        toast.success('Building updated successfully');
      } else {
        await api.post('/buildings', form);
        toast.success('Building added successfully');
      }
      setModalOpen(false);
      fetchBuildings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this building? This action cannot be undone.')) return;
    try {
      await api.delete(`/buildings/${id}`);
      toast.success('Building deleted');
      fetchBuildings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete building');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buildings</h1>
          <p className="text-gray-500 mt-1">Manage your property buildings</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          + Add Building
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : buildings?.length === 0 ? (
        <div className="card text-center py-20">
          <p className="text-5xl mb-4">🏢</p>
          <p className="text-gray-500 font-medium">No buildings yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Building" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {buildings?.map((b) => (
            <div
              key={b._id}
              className="card hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{b.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{b.address}</p>
                  {b.description && (
                    <p className="text-xs text-gray-400 mt-1">{b.description}</p>
                  )}
                </div>
                <span className="text-2xl ml-3 flex-shrink-0">🏢</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total',    value: b.totalFlats,    bg: 'bg-gray-50',   text: 'text-gray-900' },
                  { label: 'Occupied', value: b.occupiedFlats, bg: 'bg-green-50',  text: 'text-green-700' },
                  { label: 'Vacant',   value: b.vacantFlats,   bg: 'bg-orange-50', text: 'text-orange-700' },
                ].map(({ label, value, bg, text }) => (
                  <div key={label} className={`${bg} rounded-lg p-3 text-center`}>
                    <p className={`text-xl font-bold ${text}`}>{value}</p>
                    <p className={`text-xs mt-0.5 ${text} opacity-80`}>{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => openEdit(b)}
                  className="flex-1 btn-secondary text-xs py-1.5"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(b._id)}
                  className="flex-1 btn-danger text-xs py-1.5"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editBuilding ? 'Edit Building' : 'Add Building'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Building Name *</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Sunrise Apartments"
            />
          </div>
          <div>
            <label className="label">Address *</label>
            <textarea
              className="input-field resize-none"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
              rows={2}
              placeholder="Full address of the building"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Optional notes"
            />
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
              {saving ? 'Saving…' : editBuilding ? 'Update' : 'Add Building'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
