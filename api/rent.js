import dbConnect from '../lib/mongodb';
import RentPayment from '../server/models/RentPayment.js';
import Tenant from '../server/models/Tenant.js';

export default async function handler(req, res) {
  await dbConnect();

  const { method } = req;
  const { id, tenant, building, status, month, year } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (id) {
          // GET single payment
          const payment = await RentPayment.findById(id)
            .populate('tenant', 'name phone')
            .populate('flat', 'flatNumber')
            .populate('building', 'name');
          if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
          }
          return res.json(payment);
        } else if (tenant && req.query.subpath === 'tenant') {
          // GET all payments for a specific tenant
          const payments = await RentPayment.find({ tenant })
            .populate('flat', 'flatNumber')
            .populate('building', 'name')
            .sort({ year: -1, month: -1 });
          return res.json(payments);
        } else {
          // GET all rent payments with optional filters
          const query = {};
          if (tenant) query.tenant = tenant;
          if (building) query.building = building;
          if (status) query.status = status;
          if (month) query.month = Number(month);
          if (year) query.year = Number(year);

          const payments = await RentPayment.find(query)
            .populate('tenant', 'name phone')
            .populate('flat', 'flatNumber')
            .populate('building', 'name')
            .sort({ dueDate: -1 });
          return res.json(payments);
        }
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }

    case 'POST':
      try {
        if (req.body.action === 'generate') {
          // POST generate monthly rent for all active tenants
          const { month: genMonth, year: genYear } = req.body;
          if (!genMonth || !genYear) {
            return res.status(400).json({ message: 'month and year are required' });
          }

          const activeTenants = await Tenant.find({ isActive: true });
          const createdPayments = [];

          for (const tenantDoc of activeTenants) {
            const existing = await RentPayment.findOne({ tenant: tenantDoc._id, month: genMonth, year: genYear });
            if (!existing) {
              const dueDate = new Date(genYear, genMonth - 1, tenantDoc.rentDueDay || 1);
              const now = new Date();
              const paymentStatus = dueDate < now ? 'overdue' : 'pending';

              const payment = await RentPayment.create({
                tenant: tenantDoc._id,
                flat: tenantDoc.flat,
                building: tenantDoc.building,
                amount: tenantDoc.rentAmount,
                dueDate,
                status: paymentStatus,
                month: genMonth,
                year: genYear,
              });
              createdPayments.push(payment);
            }
          }

          return res.status(201).json({
            created: createdPayments.length,
            skipped: activeTenants.length - createdPayments.length,
            payments: createdPayments,
          });
        } else {
          // POST create a single payment record manually
          const payment = new RentPayment({
            tenant: req.body.tenant,
            flat: req.body.flat,
            building: req.body.building,
            amount: req.body.amount,
            dueDate: req.body.dueDate,
            paidDate: req.body.paidDate,
            status: req.body.status || 'pending',
            month: req.body.month,
            year: req.body.year,
            notes: req.body.notes,
          });

          const newPayment = await payment.save();
          return res.status(201).json(
            await newPayment.populate([
              { path: 'tenant', select: 'name phone' },
              { path: 'flat', select: 'flatNumber' },
              { path: 'building', select: 'name' },
            ])
          );
        }
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'PATCH':
      try {
        if (id && req.query.action === 'pay') {
          // PATCH mark payment as paid
          const payment = await RentPayment.findByIdAndUpdate(
            id,
            {
              status: 'paid',
              paidDate: req.body.paidDate || new Date(),
              amount: req.body.amount,
            },
            { new: true }
          )
            .populate('tenant', 'name')
            .populate('flat', 'flatNumber')
            .populate('building', 'name');

          if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
          }
          return res.json(payment);
        }
        return res.status(400).json({ message: 'Invalid PATCH action' });
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'PUT':
      try {
        const payment = await RentPayment.findByIdAndUpdate(id, req.body, { new: true })
          .populate('tenant', 'name')
          .populate('flat', 'flatNumber')
          .populate('building', 'name');
        if (!payment) {
          return res.status(404).json({ message: 'Payment not found' });
        }
        return res.json(payment);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

    case 'DELETE':
      try {
        const payment = await RentPayment.findByIdAndDelete(id);
        if (!payment) {
          return res.status(404).json({ message: 'Payment not found' });
        }
        return res.json({ message: 'Payment deleted successfully' });
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}

