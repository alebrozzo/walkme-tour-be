import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { logMessage } from './utils/logger.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function main(): Promise<void> {
  await connectDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    logMessage('info', `Server listening on port ${PORT}`);
  });
}

main().catch((err: unknown) => {
  logMessage('error', 'Failed to start server', String(err));
  process.exit(1);
});
