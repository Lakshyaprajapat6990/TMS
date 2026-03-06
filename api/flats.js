import dbConnect from '../lib/mongodb';
import Flat from '../server/models/Flat.js';
import Tenant from '../server/models/Tenant.js';

export default async function handler(req, res) {
  await dbConnect();

  const { method } = req;
  const { id, building, status } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          // GET single flat
          const flat = await Flat.findById(id).populate('building', 'name address');
          if (!flat) {
            return res.status(404).json({ message: 'Flat not found' });
          }
          return res.json(flat);
        } else {
          // GET all flats with optional filters
          const query = {};
          if (building) query.building = building;
          if (status) query.status = status;

          const flats = await Flat.find(query)
            .populate('building', 'name address')
            .sort({ flatNumber: 1 });
          return res.json(flats);
        }
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }

    case 'POST':
      try {
        const flat = new Flat({
          flatNumber: req.body.flatNumber,
          floor: req.body.floor,
          building: req.body.building,
          rentAmount: req.body.rentAmount,
          bedrooms: req.body.bedrooms,
          bathrooms: req.body.bathrooms,
          area: req.body.area,
        });
        const newFlat = await flat.save();
        return res.status(201).json(await newFlat.populate('building', 'name address'));
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'PUT':
      try {
        const flat = await Flat.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        }).populate('building', 'name address');
        if (!flat) {
          return res.status(404).json({ message: 'Flat not found' });
        }
        return res.json(flat);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'PATCH':
      try {
        if (id && req.query.action === 'status') {
          // PATCH update flat status only
          const flat = await Flat.findByIdAndUpdate(
            id,
            { status: req.body.status },
            { new: true }
          ).populate('building', 'name address');
          if (!flat) {
            return res.status(404).json({ message: 'Flat not found' });
          }
          return res.json(flat);
        }
        return res.status(400).json({ message: 'Invalid PATCH action' });
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'DELETE':
      try {
        const flat = await Flat.findById(id);
        if (!flat) {
          return res.status(404).json({ message: 'Flat not found' });
        }

        const activeTenant = await Tenant.findOne({ flat: id, isActive: true });
        if (activeTenant) {
          return res
            .status(400)
            .json({ message: 'Cannot delete a flat with an active tenant. Move out the tenant first.' });
        }

        await flat.deleteOne();
        return res.json({ message: 'Flat deleted successfully' });
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}

