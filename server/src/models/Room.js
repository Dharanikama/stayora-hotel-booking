import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Standard', 'Deluxe', 'Suite', 'Family'], default: 'Deluxe' },
  description: { type: String, required: true },
  pricePerNight: { type: Number, required: true, min: 1 },
  capacity: { type: Number, required: true, min: 1, max: 12 },
  beds: { type: String, default: '1 king bed' },
  size: { type: Number, default: 28 },
  image: { type: String, required: true },
  amenities: [{ type: String }],
  rating: { type: Number, min: 1, max: 5, default: 4.7 },
  featured: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);
