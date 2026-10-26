import { Router } from 'express';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { isId } from '../utils/helpers.js';

const router = Router();
router.use(protect, adminOnly);

// Only these fields can be set from the request body (blocks _id/createdAt/etc. being overwritten).
const ROOM_FIELDS = ['name', 'type', 'description', 'pricePerNight', 'capacity', 'beds', 'size', 'image', 'amenities', 'rating', 'featured', 'active'];
function cleanRoom(body = {}) {
  const data = {};
  for (const key of ROOM_FIELDS) if (body[key] !== undefined) data[key] = body[key];
  for (const key of ['pricePerNight', 'capacity', 'size', 'rating']) if (data[key] !== undefined) data[key] = Number(data[key]);
  for (const key of ['featured', 'active']) if (data[key] !== undefined) data[key] = data[key] === true || data[key] === 'true';
  if (typeof data.amenities === 'string') data.amenities = data.amenities.split(',').map(a => a.trim()).filter(Boolean);
  return data;
}

router.get('/bookings', async (_req, res, next) => {
  try {
    const bookings = await Booking.find().populate('user', 'name email').populate('room').sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) { next(err); }
});

// All rooms, including hidden ones, so an admin can bring a hidden room back.
router.get('/rooms', async (_req, res, next) => {
  try {
    res.json({ rooms: await Room.find().sort({ createdAt: -1 }) });
  } catch (err) { next(err); }
});

router.post('/rooms', async (req, res, next) => {
  try {
    const room = await Room.create(cleanRoom(req.body));
    res.status(201).json({ room });
  } catch (err) { next(err); }
});

router.patch('/rooms/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Room not found.' });
    const room = await Room.findByIdAndUpdate(req.params.id, cleanRoom(req.body), { new: true, runValidators: true });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    res.json({ room });
  } catch (err) { next(err); }
});

router.delete('/rooms/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Room not found.' });
    const room = await Room.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    res.json({ message: 'Room hidden from listings.' });
  } catch (err) { next(err); }
});

export default router;
