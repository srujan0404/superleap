import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  await mongoose.connect(env.mongoUri);
  console.log(`mongo: connected to ${redact(env.mongoUri)}`);
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

function redact(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}
