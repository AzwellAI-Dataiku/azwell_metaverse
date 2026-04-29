import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config.js';
import * as schema from './schema/index.js';

const client = postgres(config.DATABASE_URL, {
  max: 30,
  idle_timeout: 30,
});
export const db = drizzle(client, { schema });
