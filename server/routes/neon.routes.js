export function neonRoutes(router) {
  // GET /api/v1/neon/status - reports all provisioned Neon services and health
  router.get('/api/v1/neon/status', async (req, res) => {
    let dbConnected = false;
    let tablesCount = 0;

    // Check Postgres connection to Neon
    try {
      const { query } = await import('../db/pool.js');
      const testRes = await query(
        "SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'"
      );
      if (testRes && testRes.rows && testRes.rows.length > 0) {
        dbConnected = true;
        tablesCount = testRes.rows[0].count;
      }
    } catch {
      dbConnected = false;
    }

    res.json({
      status: 'active',
      branch: process.env.NEON_BRANCH || 'production',
      services: {
        postgres: {
          configured: !!process.env.DATABASE_URL,
          connected: dbConnected,
          tablesInSchema: tablesCount,
        },
        auth: {
          configured: !!process.env.NEON_AUTH_BASE_URL,
          baseUrl: process.env.NEON_AUTH_BASE_URL || null,
          jwksUrl: process.env.NEON_AUTH_JWKS_URL || null,
        },
        functions: {
          configured: !!process.env.NEON_FUNCTION_HELLO_BASE_URL,
          helloUrl: process.env.NEON_FUNCTION_HELLO_BASE_URL || null,
        },
        realtime: {
          configured: !!process.env.NEON_REALTIME_URL,
          url: process.env.NEON_REALTIME_URL || null,
        },
      },
    });
  });

  // GET /api/v1/neon/functions/hello - calls the live deployed Neon Function
  router.get('/api/v1/neon/functions/hello', async (req, res) => {
    const fnUrl = process.env.NEON_FUNCTION_HELLO_BASE_URL;
    if (!fnUrl) {
      return res.status(503).json({
        error: { code: 'NOT_CONFIGURED', message: 'NEON_FUNCTION_HELLO_BASE_URL is not set' },
      });
    }

    try {
      const fnRes = await fetch(fnUrl);
      const text = await fnRes.text();
      res.json({
        success: true,
        source: 'Neon Functions',
        status: fnRes.status,
        response: text.trim(),
      });
    } catch (err) {
      res.status(500).json({ error: { code: 'FUNCTION_CALL_FAILED', message: err.message } });
    }
  });

  // GET /api/v1/neon/auth/config - returns Auth configuration
  router.get('/api/v1/neon/auth/config', (req, res) => {
    res.json({
      authBaseUrl: process.env.NEON_AUTH_BASE_URL || null,
      jwksUrl: process.env.NEON_AUTH_JWKS_URL || null,
      branch: process.env.NEON_BRANCH || 'production',
    });
  });

  // GET /api/v1/neon/realtime/config - returns Realtime WebSocket configuration
  router.get('/api/v1/neon/realtime/config', (req, res) => {
    res.json({
      realtimeUrl: process.env.NEON_REALTIME_URL || null,
      configured: !!process.env.NEON_REALTIME_URL,
    });
  });
}
