import http from 'node:http';
import { authRoutes } from './routes/auth.routes.js';
import { issueRoutes } from './routes/issues.routes.js';
import { labRoutes } from './routes/labs.routes.js';
import { budgetRoutes } from './routes/budgets.routes.js';
import { userRoutes } from './routes/users.routes.js';
import { auditRoutes, notificationRoutes, statsRoutes, metaRoutes } from './routes/other.routes.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';

class ExpressRouter {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  use(fn) {
    this.middlewares.push(fn);
  }

  addRoute(method, path, handler) {
    // Convert /api/v1/issues/:id to regex
    const paramNames = [];
    const pattern = path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${pattern}$`);
    this.routes.push({ method, path, regex, paramNames, handler });
  }

  get(path, handler) {
    this.addRoute('GET', path, handler);
  }
  post(path, handler) {
    this.addRoute('POST', path, handler);
  }
  patch(path, handler) {
    this.addRoute('PATCH', path, handler);
  }
  delete(path, handler) {
    this.addRoute('DELETE', path, handler);
  }

  async handle(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const [pathname, queryPart] = (req.url || '/').split('?');
    req.path = pathname;
    req.query = {};
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((v, k) => (req.query[k] = v));
    }

    // Response helper decorations
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
    res.json = function (obj) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(obj));
      return res;
    };

    // Body parsing & execution helper
    const executeRoute = async () => {
      // Run middlewares
      for (const mw of this.middlewares) {
        let nextCalled = false;
        await mw(req, res, () => {
          nextCalled = true;
        });
        if (!nextCalled) return;
      }

      // Match routes
      for (const r of this.routes) {
        if (r.method === req.method) {
          const match = pathname.match(r.regex);
          if (match) {
            req.params = {};
            r.paramNames.forEach((name, i) => {
              req.params[name] = match[i + 1];
            });
            try {
              return await r.handler(req, res);
            } catch (err) {
              return errorHandler(err, req, res);
            }
          }
        }
      }

      // Not found
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${pathname}` } });
    };

    // If body already parsed (e.g. Vercel Serverless environment or pre-parsed)
    if (req.body !== undefined && req.body !== null && typeof req.body === 'object') {
      return executeRoute();
    }

    // Stream body parsing for standard Node.js runtime
    let bodyRaw = '';
    req.on('data', (c) => (bodyRaw += c));
    req.on('end', async () => {
      try {
        req.body = bodyRaw ? JSON.parse(bodyRaw) : {};
      } catch {
        req.body = bodyRaw;
      }
      return executeRoute();
    });
  }
}

export function createExpressApp() {
  const app = new ExpressRouter();

  // Global auth middleware
  app.use(authMiddleware);

  // Mount API modules
  authRoutes(app);
  issueRoutes(app);
  labRoutes(app);
  budgetRoutes(app);
  userRoutes(app);
  auditRoutes(app);
  notificationRoutes(app);
  statsRoutes(app);
  metaRoutes(app);

  return app;
}

export const app = createExpressApp();

