// Optional manual seeding:  npm run seed            -> adds missing rooms/admin (safe)
//                           npm run seed -- --reset -> DELETES all rooms first, then re-adds samples
import 'dotenv/config';
import mongoose from 'mongoose';
import Room from './models/Room.js';
import { ensureSeedData, sampleRooms } from './seedData.js';

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  if (process.argv.includes('--reset')) {
    await Room.deleteMany({});
    await Room.insertMany(sampleRooms);
    console.log(`Reset rooms to ${sampleRooms.length} samples`);
  }
  await ensureSeedData();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
