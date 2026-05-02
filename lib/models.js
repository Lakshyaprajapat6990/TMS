import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const BuildingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

const FlatSchema = new mongoose.Schema(
  {
    flatNumber: { type: String, required: true, trim: true },
    floor: { type: Number, default: 0 },
    building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
    status: { type: String, enum: ['vacant', 'occupied'], default: 'vacant' },
    rentAmount: { type: Number, required: true, default: 0 },
    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    area: { type: Number },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

const TenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    idType: { type: String, enum: ['Aadhar', 'PAN', 'Passport', 'Driving License', 'Voter ID', 'Other'], default: 'Aadhar' },
    idNumber: { type: String, trim: true },
    flat: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat', required: true },
    building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
    moveInDate: { type: Date, required: true },
    moveOutDate: { type: Date },
    isActive: { type: Boolean, default: true },
    securityDeposit: { type: Number, default: 0 },
    rentAmount: { type: Number, required: true },
    rentDueDay: { type: Number, default: 1 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

const RentPaymentSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    flat: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat', required: true },
    building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    notes: { type: String, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Building = mongoose.models.Building || mongoose.model('Building', BuildingSchema);
export const Flat = mongoose.models.Flat || mongoose.model('Flat', FlatSchema);
export const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);
export const RentPayment = mongoose.models.RentPayment || mongoose.model('RentPayment', RentPaymentSchema);
