import 'dotenv/config';

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 3000),
  mongoUri: required('MONGODB_URI'),
  redisUrl: process.env.REDIS_URL || null,
};
