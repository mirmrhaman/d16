// cPanel Passenger startup file. Configure secrets and PORT in cPanel, not here.
import { startServer } from './server/src/index.js';

startServer().catch((error) => {
  console.error(`[d16-api] startup failed: ${error.message}`);
  process.exitCode = 1;
});
