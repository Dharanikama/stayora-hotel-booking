import { Router } from 'express';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import { protect } from '../middleware/auth.js';
import { DAY_MS, isId, parseDay, withLock } from '../utils/helpers.js';

const router = Router();
const MAX_NIGHTS = 30;

// Half-open overlap rule: an existing stay blocks the request when
//   existing.checkIn < requested.checkOut  AND  existing.checkOut > requested.checkIn
// so one guest may check out on the same day another checks in.
const overlapping = (roomId, start, end) =>
  Booking.findOne({ room: roomId, status: 'confirmed', checkIn: { $lt: end }, checkOut: { $gt: start } });

router.post('/', protect, async (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut, guests } = req.body || {};
    if (!isId(roomId)) return res.status(400).json({ message: 'Choose a valid room.' });
    const start = parseDay(checkIn);
    const end = parseDay(checkOut);
    if (!start || !end) return res.status(400).json({ message: 'Enter valid check-in and check-out dates.' });
    // Allow "yesterday (UTC)" so people west of UTC who are still on today's local date are not rejected.
    const earliest = new Date(Date.now() - DAY_MS); earliest.setUTCHours(0, 0, 0, 0);
    if (start < earliest || end <= start) {
      return res.status(400).json({ message: 'Choose valid future dates. Check-out must be after check-in.' });
    }
    const nights = Math.round((end - start) / DAY_MS);
    if (nights > MAX_NIGHTS) return res.status(400).json({ message: `Stays are limited to ${MAX_NIGHTS} nights.` });
    const room = await Room.findOne({ _id: roomId, active: true });
    if (!room) return res.status(404).json({ message: 'This room is no longer available.' });
    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > room.capacity) {
      return res.status(400).json({ message: `This room allows 1–${room.capacity} guests.` });
    }
    // The check and the insert happen inside a per-room lock so two simultaneous requests
    // cannot both pass the availability check (this app runs as a single service instance).
    const booking = await withLock(`room:${room._id}`, async () => {
      if (await overlapping(room._id, start, end)) return null;
      return Booking.create({
        user: req.user._id, room: room._id, checkIn: start, checkOut: end,
        guests: guestCount, nights, totalPrice: nights * room.pricePerNight
      });
    });
    if (!booking) return res.status(409).json({ message: 'Sorry, this room has just been booked for those dates. Please choose another room or dates.' });
    await booking.populate('room');
    res.status(201).json({ booking });
  } catch (err) { next(err); }
});

router.get('/my', protect, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).populate('room').sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', protect, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Booking not found.' });
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (String(booking.user) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot cancel this booking.' });
    }
    if (booking.status === 'cancelled') return res.status(400).json({ message: 'This booking is already cancelled.' });
    if (booking.checkIn <= new Date()) return res.status(400).json({ message: 'Bookings cannot be cancelled on or after check-in.' });
    booking.status = 'cancelled';
    await booking.save();
    res.json({ booking, message: 'Booking cancelled.' });
  } catch (err) { next(err); }
});

export default router;
