import bcrypt from 'bcryptjs';
import Room from './models/Room.js';
import User from './models/User.js';

export const sampleRooms = [
  { name: 'The Solstice Suite', type: 'Suite', description: 'A calm, sunlit suite with generous space, thoughtful details, and a private lounge area.', pricePerNight: 7499, capacity: 2, beds: '1 king bed', size: 52, image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'King bed', 'Rain shower', 'Breakfast'], rating: 4.9, featured: true },
  { name: 'Garden Deluxe', type: 'Deluxe', description: 'A serene room with warm textures, garden views, and everything you need for a restful stay.', pricePerNight: 4299, capacity: 2, beds: '1 queen bed', size: 34, image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'Garden view', 'Smart TV', 'Breakfast'], rating: 4.8, featured: true },
  { name: 'Cloud Nine Twin', type: 'Standard', description: 'A beautifully simple room for easy city breaks, with soft bedding and a clean modern finish.', pricePerNight: 2899, capacity: 2, beds: '2 twin beds', size: 25, image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'Work desk', 'Smart TV'], rating: 4.6, featured: false },
  { name: 'The Family Hideaway', type: 'Family', description: 'Room for everyone to unwind, with flexible sleeping arrangements and space to gather.', pricePerNight: 5899, capacity: 4, beds: '1 king + 2 twin beds', size: 46, image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'Family space', 'Mini fridge', 'Breakfast'], rating: 4.8, featured: true },
  { name: 'Midnight Atelier', type: 'Deluxe', description: 'An intimate, design-led room with moody accents, soft lighting, and premium comforts.', pricePerNight: 4599, capacity: 2, beds: '1 queen bed', size: 32, image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'Rain shower', 'Smart TV'], rating: 4.7, featured: false },
  { name: 'Horizon Penthouse', type: 'Suite', description: 'An elevated escape with expansive windows, a separate sitting area, and a little extra luxury.', pricePerNight: 9999, capacity: 3, beds: '1 king bed + sofa bed', size: 68, image: 'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?auto=format&fit=crop&w=1200&q=85', amenities: ['Wi-Fi', 'City view', 'Lounge', 'Breakfast'], rating: 5.0, featured: true }
];

// Safe to run on every start-up: it only adds what is missing and never deletes anything.
//  - Adds the sample rooms only if the rooms collection is completely empty.
//  - Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD if it does not exist yet.
//  - If the admin already exists, ADMIN_PASSWORD from the environment stays the source of truth.
export async function ensureSeedData(log = console) {
  if (await Room.estimatedDocumentCount() === 0) {
    await Room.insertMany(sampleRooms);
    log.log(`Seeded ${sampleRooms.length} sample rooms`);
  }
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) { log.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin account was created.'); return; }
  if (password.length < 8) { log.warn('ADMIN_PASSWORD must be at least 8 characters: admin account was not created/updated.'); return; }
  const existing = await User.findOne({ email }).select('+passwordHash');
  if (!existing) {
    await User.create({ name: process.env.ADMIN_NAME || 'Stayora Admin', email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
    log.log(`Created admin account ${email}`);
  } else if (existing.role !== 'admin') {
    log.warn(`${email} already exists as a normal customer account, so it was NOT made admin. Use a different ADMIN_EMAIL.`);
  } else if (!(await bcrypt.compare(password, existing.passwordHash))) {
    existing.passwordHash = await bcrypt.hash(password, 12);
    await existing.save();
    log.log(`Updated admin password for ${email} to match ADMIN_PASSWORD`);
  }
}
