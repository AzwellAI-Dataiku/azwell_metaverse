import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { setupSocket } from './socket/index.js';
import { shutdownMovementFlusher } from './socket/handlers/movement.js';
import authRouter from './routes/auth.js';
import charactersRouter from './routes/characters.js';
import chatRouter from './routes/chat.js';
import questsRouter from './routes/quests.js';
import usersRouter from './routes/users.js';
import adminRouter from './routes/admin.js';
import inventoryRouter from './routes/inventory.js';
import { seedAdmin } from './db/seed.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: [config.CLIENT_URL, config.ADMIN_URL] }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/chat', chatRouter);
app.use('/api/quests', questsRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/inventory', inventoryRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

setupSocket(httpServer);

seedAdmin().catch(console.error);

httpServer.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`${signal} received, flushing pending writes...`);
  try {
    await shutdownMovementFlusher();
  } catch (err) {
    console.error('shutdown flush failed:', err);
  }
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
