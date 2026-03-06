const express = require('express');
const router = express.Router();
const RentPayment = require('../models/RentPayment');
const Tenant = require('../models/Tenant');

// GET all rent payments (optional filters: tenant, building, status, month, year)
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.tenant) query.tenant = req.query.tenant;
    if (req.query.building) query.building = req.query.building;
    if (req.query.status) query.status = req.query.status;
    if (req.query.month) query.month = Number(req.query.month);
    if (req.query.year) query.year = Number(req.query.year);

    const payments = await RentPayment.find(query)
      .populate('tenant', 'name phone')
      .populate('flat', 'flatNumber')
      .populate('building', 'name')
      .sort({ dueDate: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all payments for a specific tenant
router.get('/tenant/:tenantId', async (req, res) => {
  try {
    const payments = await RentPayment.find({ tenant: req.params.tenantId })
      .populate('flat', 'flatNumber')
      .populate('building', 'name')
      .sort({ year: -1, month: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST generate monthly rent for all active tenants
router.post('/generate', async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }

    const activeTenants = await Tenant.find({ isActive: true });
    const createdPayments = [];

    for (const tenant of activeTenants) {
      const existing = await RentPayment.findOne({ tenant: tenant._id, month, year });
      if (!existing) {
        const dueDate = new Date(year, month - 1, tenant.rentDueDay || 1);
        const now = new Date();
        const status = dueDate < now ? 'overdue' : 'pending';

        const payment = await RentPayment.create({
          tenant: tenant._id,
          flat: tenant.flat,
          building: tenant.building,
          amount: tenant.rentAmount,
          dueDate,
          status,
          month,
          year,
        });
        createdPayments.push(payment);
      }
    }

    res.status(201).json({
      created: createdPayments.length,
      skipped: activeTenants.length - createdPayments.length,
      payments: createdPayments,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST create a single payment record manually
router.post('/', async (req, res) => {
  try {
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
    res.status(201).json(
      await newPayment.populate([
        { path: 'tenant', select: 'name phone' },
        { path: 'flat', select: 'flatNumber' },
        { path: 'building', select: 'name' },
      ])
    );
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH mark payment as paid
router.patch('/:id/pay', async (req, res) => {
  try {
    const payment = await RentPayment.findByIdAndUpdate(
      req.params.id,
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

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update payment record
router.put('/:id', async (req, res) => {
  try {
    const payment = await RentPayment.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('tenant', 'name')
      .populate('flat', 'flatNumber')
      .populate('building', 'name');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE payment record
router.delete('/:id', async (req, res) => {
  try {
    const payment = await RentPayment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
