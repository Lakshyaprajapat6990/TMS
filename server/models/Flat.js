const mongoose = require('mongoose');

const flatSchema = new mongoose.Schema(
  {
    flatNumber: { type: String, required: true, trim: true },
    floor: { type: Number, default: 0 },
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: true,
    },
    status: {
      type: String,
      enum: ['vacant', 'occupied'],
      default: 'vacant',
    },
    rentAmount: { type: Number, required: true, default: 0 },
    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },
    area: { type: Number }, // sq ft
  },
  { timestamps: true }
);

module.exports = mongoose.model('Flat', flatSchema);
