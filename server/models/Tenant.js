const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    idType: {
      type: String,
      enum: ['Aadhar', 'PAN', 'Passport', 'Driving License', 'Voter ID', 'Other'],
      default: 'Aadhar',
    },
    idNumber: { type: String, trim: true },
    flat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
    },
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: true,
    },
    moveInDate: { type: Date, required: true },
    moveOutDate: { type: Date },
    isActive: { type: Boolean, default: true },
    securityDeposit: { type: Number, default: 0 },
    rentAmount: { type: Number, required: true },
    rentDueDay: { type: Number, default: 1 }, // day of month rent is due (1–31)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tenant', tenantSchema);
