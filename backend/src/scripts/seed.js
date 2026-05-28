import { connectDb, disconnectDb } from '../config/db.js';
import { Lead } from '../models/Lead.js';

const SAMPLES = [
  { name: 'Aman Gupta',       email: 'aman@example.com',       phone: '+91-9876543210', source: 'website',  status: 'NEW' },
  { name: 'Priya Sharma',     email: 'priya@example.com',      phone: '+91-9999900001', source: 'referral', status: 'NEW' },
  { name: 'Rahul Mehta',      email: 'rahul@example.com',                                source: 'campaign', status: 'CONTACTED' },
  { name: 'Sneha Iyer',       email: 'sneha@example.com',      phone: '+91-9000000001', source: 'website',  status: 'CONTACTED' },
  { name: 'Vikram Singh',     email: 'vikram@example.com',                               source: 'referral', status: 'CONTACTED' },
  { name: 'Ananya Reddy',     email: 'ananya@example.com',     phone: '+91-9000000002', source: 'campaign', status: 'QUALIFIED' },
  { name: 'Karan Malhotra',   email: 'karan@example.com',                                source: 'website',  status: 'QUALIFIED' },
  { name: 'Neha Kapoor',      email: 'neha@example.com',       phone: '+91-9000000003', source: 'referral', status: 'QUALIFIED' },
  { name: 'Arjun Pillai',     email: 'arjun@example.com',                                source: 'campaign', status: 'CONVERTED' },
  { name: 'Divya Nair',       email: 'divya@example.com',      phone: '+91-9000000004', source: 'website',  status: 'CONVERTED' },
  { name: 'Rohit Verma',      email: 'rohit@example.com',                                source: 'referral', status: 'CONVERTED' },
  { name: 'Meera Joshi',      email: 'meera@example.com',      phone: '+91-9000000005', source: 'campaign', status: 'LOST' },
  { name: 'Sandeep Khanna',   email: 'sandeep@example.com',                              source: 'website',  status: 'LOST' },
  { name: 'Pooja Bhatt',      email: 'pooja@example.com',      phone: '+91-9000000006', source: 'referral', status: 'LOST' },
  { name: 'Tanvi Saxena',     email: 'tanvi@example.com',                                source: 'campaign', status: 'NEW' },
];

async function main() {
  await connectDb();
  await Lead.deleteMany({});
  const inserted = await Lead.insertMany(SAMPLES);
  console.log(`seeded ${inserted.length} leads`);
  await disconnectDb();
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
