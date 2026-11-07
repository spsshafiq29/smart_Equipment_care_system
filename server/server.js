import http from 'node:http';
import { app } from './app.js';
import { checkAndSend7DayReminders } from './routes/issues.routes.js';

const PORT = parseInt(process.env.API_PORT || process.env.PORT || '5000', 10);

const server = http.createServer((req, res) => {
  app.handle(req, res);
});

server.listen(PORT, () => {
  console.log(`[PERN Stack] SECS Express API server listening at http://localhost:${PORT}/api/v1/`);
  // Background SLA automation: scan for 7-day unresolved tickets every 2 hours
  setInterval(() => {
    checkAndSend7DayReminders().catch(() => {});
  }, 2 * 60 * 60 * 1000);
});

export { server };

