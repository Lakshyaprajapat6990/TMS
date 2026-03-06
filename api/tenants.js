import dbConnect from '../lib/mongodb';
import Tenant from '../server/models/Tenant.js';
import Flat from '../server/models/Flat.js';
import RentPayment from '../server/models/RentPayment.js';

export default async function handler(req, res) {
  await dbConnect();

  const { method } = req;
  const { id, building, isActive } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          // GET single tenant
          const tenant = await Tenant.findById(id)
            .populate('flat', 'flatNumber floor rentAmount')
            .populate('building', 'name address');
          if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
          }
          return res.json(tenant);
        } else {
          // GET all tenants with optional filters
          const query = {};
          if (building) query.building = building;
          if (isActive !== undefined) query.isActive = isActive === 'true';

          const tenants = await Tenant.find(query)
            .populate('flat', 'flatNumber floor rentAmount')
            .populate('building', 'name address')
            .sort({ createdAt: -1 });
          return res.json(tenants);
        }
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }

    case 'POST':
      try {
        const flat = await Flat.findById(req.body.flat);
        if (!flat) {
          return res.status(404).json({ message: 'Flat not found' });
        }
        if (flat.status === 'occupied') {
          return res.status(400).json({ message: 'This flat is already occupied' });
        }

        const tenant = new Tenant({
          name: req.body.name,
          phone: req.body.phone,
          email: req.body.email,
          address: req.body.address,
          idType: req.body.idType,
          idNumber: req.body.idNumber,
          flat: req.body.flat,
          building: req.body.building,
          moveInDate: req.body.moveInDate,
          securityDeposit: req.body.securityDeposit || 0,
          rentAmount: req.body.rentAmount || flat.rentAmount,
          rentDueDay: req.body.rentDueDay || 1,
        });

        const newTenant = await tenant.save();

        // Mark flat as occupied
        await Flat.findByIdAndUpdate(req.body.flat, { status: 'occupied' });

        return res.status(201).json(
          await newTenant.populate([
            { path: 'flat', select: 'flatNumber floor rentAmount' },
            { path: 'building', select: 'name address' },
          ])
        );
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'PUT':
      try {
        const tenant = await Tenant.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        })
          .populate('flat', 'flatNumber floor')
          .populate('building', 'name address');
        if (!tenant) {
          return res.status(404).json({ message: 'Tenant not found' });
        }
        return res.json(tenant);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'PATCH':
      try {
        if (id && req.query.action === 'moveout') {
          // PATCH move out tenant
          const tenant = await Tenant.findById(id);
          if (!tenant) {
            return res.status(404).json({ message: 'Tenant not found' });
          }
          if (!tenant.isActive) {
            return res.status(400).json({ message: 'Tenant has already moved out' });
          }

          tenant.isActive = false;
          tenant.moveOutDate = req.body.moveOutDate || new Date();
          await tenant.save();

          // Free the flat
          await Flat.findByIdAndUpdate(tenant.flat, { status: 'vacant' });

          return res.json(tenant);
        }
        return res.status(400).json({ message: 'Invalid PATCH action' });
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'DELETE':
      try {
        const tenant = await Tenant.findById(id);
        if (!tenant) {
          return res.status(404).json({ message: 'Tenant not found' });
        }

        if (tenant.isActive) {
          await Flat.findByIdAndUpdate(tenant.flat, { status: 'vacant' });
        }

        await RentPayment.deleteMany({ tenant: id });
        await tenant.deleteOne();
        return res.json({ message: 'Tenant deleted successfully' });
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}

