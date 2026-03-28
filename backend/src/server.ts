import { app } from './app';
import { connectToDatabase } from './config/db';
import { env } from './config/env';

const startServer = async (): Promise<void> => {
  try {
    await connectToDatabase();
    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start backend server', error);
    process.exit(1);
  }
};

void startServer();
