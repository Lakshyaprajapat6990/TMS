import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI environment variable is required');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const existing = await User.findOne({ role: 'superadmin' });
  if (existing) {
    console.log('Super admin already exists:', existing.email);
    await mongoose.disconnect();
    process.exit(0);
  }

  const email = process.env.ADMIN_EMAIL || 'admin@tenanthub.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await User.create({
    name: 'Super Admin',
    email,
    passwordHash,
    role: 'superadmin',
    isActive: true,
  });

  console.log('Super admin created successfully!');
  console.log('Email:', admin.email);
  console.log('Password:', password);
  console.log('IMPORTANT: Change your password after first login.');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
