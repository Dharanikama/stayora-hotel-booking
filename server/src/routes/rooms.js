import { Router } from 'express';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { escapeRegex, isId, parseDay } from '../utils/helpers.js';

const router = Router();

router.get('/rooms', async (req, res, next) => {
  try {
    const filter = { active: true };
    if (req.query.type && req.query.type !== 'All') filter.type = String(req.query.type);
    if (req.query.guests) filter.capacity = { $gte: Math.max(1, Number(req.query.guests) || 1) };
    if (req.query.maxPrice) filter.pricePerNight = { $lte: Math.max(0, Number(req.query.maxPrice) || 0) };
    if (req.query.q) {
      const pattern = escapeRegex(String(req.query.q).slice(0, 60));
      filter.$or = ['name', 'description', 'amenities'].map(field => ({ [field]: { $regex: pattern, $options: 'i' } }));
    }
    let rooms = await Room.find(filter).sort({ featured: -1, rating: -1 }).lean();
    const start = parseDay(req.query.checkIn);
    const end = parseDay(req.query.checkOut);
    if (start && end && start < end) {
      const unavailable = await Booking.find({
        status: 'confirmed', checkIn: { $lt: end }, checkOut: { $gt: start }
      }).distinct('room');
      const blocked = new Set(unavailable.map(String));
      rooms = rooms.filter(room => !blocked.has(String(room._id)));
    }
    res.json({ rooms });
  } catch (err) { next(err); }
});

router.get('/rooms/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Room not found.' });
    const room = await Room.findOne({ _id: req.params.id, active: true });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    res.json({ room });
  } catch (err) { next(err); }
});

export default router;
