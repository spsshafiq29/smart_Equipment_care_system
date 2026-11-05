// Comprehensive end-to-end verification script for Neon provisioned services
import { EventEmitter } from 'node:events';
import pg from 'pg';
import { app } from '../server/app.js';

// Load .env.local
try {
  if (process.loadEnvFile) {
    process.loadEnvFile('.env.local');
  }
} catch (e) {
  console.warn('Could not load .env.local:', e.message);
}

const { Client } = pg;

// Helper to make in-process HTTP requests to the Express app
function makeAppRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      ...headers,
    };

    let statusCode = 200;
    const resHeaders = {};
    let responseBody = '';

    const res = {
      statusCode: 200,
      setHeader(k, v) {
        resHeaders[k.toLowerCase()] = v;
      },
      getHeader(k) {
        return resHeaders[k.toLowerCase()];
      },
      status(code) {
        this.statusCode = code;
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = JSON.stringify(data);
        resolve({ status: this.statusCode || statusCode, headers: resHeaders, body: data });
      },
      end(chunk) {
        if (chunk) responseBody += chunk;
        let parsed = null;
        try {
          parsed = responseBody ? JSON.parse(responseBody) : null;
        } catch {
          parsed = responseBody;
        }
        resolve({
          status: this.statusCode || statusCode,
          headers: resHeaders,
          body: parsed,
        });
      },
    };

    app.handle(req, res);
    if (body) {
      req.emit('data', JSON.stringify(body));
    }
    req.emit('end');
  });
}

async function runNeonVerification() {
  console.log('================================================================');
  console.log('NEON CLOUD SERVICES — END-TO-END VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. NEON POSTGRES (Cloud Database)
  console.log('[SERVICE 1] Neon PostgreSQL (Lakebase Postgres)');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    assert(false, 'DATABASE_URL is defined in .env.local');
  } else {
    assert(true, `DATABASE_URL found (${dbUrl.split('@')[1]?.split('/')[0] || 'hidden'})`);
    const pgClient = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await pgClient.connect();
      assert(true, 'Successfully connected to Neon PostgreSQL pooler');

      const infoRes = await pgClient.query('SELECT current_database(), current_user, version()');
      const dbInfo = infoRes.rows[0];
      assert(
        !!dbInfo.current_database,
        `Connected to database: "${dbInfo.current_database}" as user: "${dbInfo.current_user}"`
      );

      // Verify tables
      const tablesRes = await pgClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      const tableNames = tablesRes.rows.map((r) => r.table_name);
      assert(
        tableNames.length >= 7,
        `Neon schema has ${tableNames.length} tables: ${tableNames.join(', ')}`
      );

      // Verify row counts
      const userCountRes = await pgClient.query('SELECT count(*)::int as count FROM users');
      const issueCountRes = await pgClient.query('SELECT count(*)::int as count FROM issues');
      const labCountRes = await pgClient.query('SELECT count(*)::int as count FROM labs');
      assert(
        userCountRes.rows[0].count > 0 && issueCountRes.rows[0].count > 0,
        `Live table data verified: ${userCountRes.rows[0].count} users, ${labCountRes.rows[0].count} labs, ${issueCountRes.rows[0].count} issues`
      );

      await pgClient.end();
    } catch (err) {
      assert(false, `Neon Postgres query failed: ${err.message}`);
    }
  }

  // 2. NEON FUNCTIONS
  console.log('\n[SERVICE 2] Neon Functions');
  const fnUrl = process.env.NEON_FUNCTION_HELLO_BASE_URL;
  if (!fnUrl) {
    assert(false, 'NEON_FUNCTION_HELLO_BASE_URL is defined');
  } else {
    assert(true, `NEON_FUNCTION_HELLO_BASE_URL found: ${fnUrl}`);
    try {
      const res = await fetch(fnUrl);
      const text = await res.text();
      assert(res.status === 200, `Neon function returned HTTP ${res.status}`);
      assert(
        text.includes('Hello from Neon Functions'),
        `Neon function response body: "${text.trim()}"`
      );
    } catch (err) {
      assert(false, `Neon Function fetch failed: ${err.message}`);
    }
  }

  // 3. NEON AUTH
  console.log('\n[SERVICE 3] Neon Auth (Managed Better Auth)');
  const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
  const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
  assert(!!authBaseUrl, `NEON_AUTH_BASE_URL found: ${authBaseUrl}`);
  assert(!!jwksUrl, `NEON_AUTH_JWKS_URL found: ${jwksUrl}`);

  if (jwksUrl) {
    try {
      const jwksRes = await fetch(jwksUrl);
      const jwksData = await jwksRes.json();
      assert(
        jwksRes.status === 200 && Array.isArray(jwksData?.keys),
        `Neon Auth JWKS endpoint reachable and returned ${jwksData?.keys?.length || 0} public keys`
      );
    } catch (err) {
      assert(false, `Neon Auth JWKS fetch failed: ${err.message}`);
    }
  }

  // 4. NEON REALTIME
  console.log('\n[SERVICE 4] Neon Realtime (Live SQL)');
  const rtUrl = process.env.NEON_REALTIME_URL;
  const rtSecret = process.env.NEON_REALTIME_SECRET;
  assert(!!rtUrl, `NEON_REALTIME_URL found: ${rtUrl}`);
  assert(!!rtSecret && rtSecret.length > 10, 'NEON_REALTIME_SECRET securely provisioned');

  // 5. APPLICATION API WIRING
  console.log('\n[SERVICE 5] Application API Wiring');
  const statusRes = await makeAppRequest('GET', '/api/v1/neon/status');
  assert(
    statusRes.status === 200 && statusRes.body?.status === 'active',
    `GET /api/v1/neon/status returned active branch: "${statusRes.body?.branch}"`
  );
  assert(
    statusRes.body?.services?.postgres?.configured &&
      statusRes.body?.services?.auth?.configured &&
      statusRes.body?.services?.functions?.configured &&
      statusRes.body?.services?.realtime?.configured,
    'All 4 services (postgres, auth, functions, realtime) registered in status endpoint'
  );

  const fnRouteRes = await makeAppRequest('GET', '/api/v1/neon/functions/hello');
  assert(
    fnRouteRes.status === 200 && fnRouteRes.body?.success,
    `GET /api/v1/neon/functions/hello returned: "${fnRouteRes.body?.response}"`
  );

  const authRouteRes = await makeAppRequest('GET', '/api/v1/neon/auth/config');
  assert(
    authRouteRes.status === 200 && !!authRouteRes.body?.authBaseUrl,
    'GET /api/v1/neon/auth/config returned valid authBaseUrl'
  );

  const rtRouteRes = await makeAppRequest('GET', '/api/v1/neon/realtime/config');
  assert(
    rtRouteRes.status === 200 && rtRouteRes.body?.configured,
    'GET /api/v1/neon/realtime/config returned valid realtimeUrl'
  );

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runNeonVerification();
