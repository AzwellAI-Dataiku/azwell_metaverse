import dotenv from 'dotenv';
dotenv.config();

export const config = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/metaverse',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  PORT: parseInt(process.env.PORT || '4000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:3001',
};
