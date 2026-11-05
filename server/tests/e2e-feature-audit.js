import { app } from '../app.js';
import { EventEmitter } from 'node:events';

function makeRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      ...headers,
    };

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
      end(chunk) {
        if (chunk) responseBody += chunk;
        let parsed = null;
        try {
          parsed = responseBody ? JSON.parse(responseBody) : null;
        } catch {
          parsed = responseBody;
        }
        resolve({
          status: this.statusCode || 200,
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

async function runFeatureAudit() {
  console.log('================================================================');
  console.log('SECS FULL-STACK FEATURE AUDIT (WEB DEV + DEVOPS + QA)');
  console.log('================================================================\n');

  let checksPassed = 0;
  let checksFailed = 0;

  function verify(condition, featureName) {
    if (condition) {
      console.log(`  [PASS] ${featureName}`);
      checksPassed++;
    } else {
      console.error(`  [FAIL] ${featureName}`);
      checksFailed++;
    }
  }

  // 1. WEB DEV: API Health & CORS
  console.log('\n--- 1. WEB DEV: REST API CORS & HEALTH CHECK ---');
  const corsRes = await makeRequest('OPTIONS', '/api/v1/dashboard/stats');
  verify(corsRes.status === 204 && corsRes.headers['access-control-allow-origin'] === '*', 'CORS preflight responds with 204 and wildcard access');

  // 2. DEVOPS: Vercel Serverless Entrypoint
  console.log('\n--- 2. DEVOPS: VERCEL SERVERLESS ROUTING ---');
  const { default: vercelHandler } = await import('../../api/index.js');
  verify(typeof vercelHandler === 'function', 'api/index.js correctly exports Vercel Serverless Function handler');

  const vercelReqRes = await new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = 'GET';
    req.url = '/api/v1/metadata/departments';
    req.headers = {};
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(d) { resolve({ status: this.statusCode, body: JSON.parse(d) }); }
    };
    vercelHandler(req, res);
    req.emit('end');
  });
  verify(vercelReqRes.status === 200 && vercelReqRes.body.data.length > 5, 'Vercel serverless handler successfully dispatches metadata request');

  // 3. QA: Multi-Role Authentication & Access Control
  console.log('\n--- 3. QA: MULTI-ROLE AUTHENTICATION & ACCESS CONTROL ---');
  const roles = [
    { role: 'admin', email: 'mahmud.kabir@uitc.edu', pass: 'Admin@123' },
    { role: 'authority', email: 'samina.haque@uitc.edu', pass: 'Auth@123' },
    { role: 'accounts', email: 'nusrat.islam@uitc.edu', pass: 'Acct@123' },
    { role: 'technician', email: 'ashik.rahman@uitc.edu', pass: 'Tech@123' },
  ];

  const authTokens = {};
  for (const r of roles) {
    const res = await makeRequest('POST', '/api/v1/auth/login', { email: r.email, password: r.pass });
    const ok = res.status === 200 && res.body?.accessToken && res.body?.user?.role === r.role;
    verify(ok, `Authentication for role [${r.role.toUpperCase()}] generates verified JWT`);
    if (ok) authTokens[r.role] = res.body.accessToken;
  }

  // 4. WEB DEV & QA: Full Lifecycle of an Issue
  console.log('\n--- 4. FULL LIFECYCLE STATE MACHINE (SUBMIT -> REPAIR -> AUDIT) ---');
  // 4.1 Student submits issue
  const submitRes = await makeRequest('POST', '/api/v1/issues', {
    labId: 'lab-3',
    equipmentType: 'Optics Lab Spectrometer',
    assetTag: 'SPEC-2026-09',
    description: 'Laser alignment prism drifted off calibration axis by 3.2 degrees.',
    priority: 'High',
    reporterName: 'Tanvir Hasan',
    reporterEmail: 't.hasan@uitc.edu',
  });
  const tktId = submitRes.body?.issue?.id;
  verify(submitRes.status === 201 && tktId && submitRes.body?.issue?.assigned_technician_id === 'tech-2', 'Report routed automatically to Optics Lab technician (tech-2)');

  // 4.2 Technician requests budget
  const budgetReq = await makeRequest('PATCH', `/api/v1/issues/${tktId}/status`, {
    action: 'request_budget',
    budgetAmount: 14500,
    budgetDescription: 'Replacement precision prism lens unit and calibration gas',
  });
  verify(budgetReq.status === 200 && budgetReq.body?.issue?.status === 'Budget Requested', 'Technician successfully requests budget (৳ 14,500)');

  // 4.3 Higher Authority approves budget
  const authApprove = await makeRequest('PATCH', `/api/v1/issues/${tktId}/status`, {
    action: 'approve_budget',
  });
  verify(authApprove.status === 200 && authApprove.body?.issue?.status === 'Payment Review', 'Higher Authority approves budget -> forwarded to Accounts Office');

  // 4.4 Accounts Office confirms payment
  const acctApprove = await makeRequest('PATCH', `/api/v1/issues/${tktId}/status`, {
    action: 'approve_payment',
  });
  verify(acctApprove.status === 200 && acctApprove.body?.issue?.status === 'Funds Approved', 'Accounts Office confirms payment disbursement');

  // 4.5 Technician completes repair
  const repairDone = await makeRequest('PATCH', `/api/v1/issues/${tktId}/status`, {
    action: 'complete_repair',
  });
  verify(repairDone.status === 200 && repairDone.body?.issue?.status === 'Resolved' && repairDone.body?.issue?.pending_with === 'Closed', 'Technician marks repair complete -> Ticket permanently Resolved');

  // 4.6 Public Ledger Audit Incident
  const disputePost = await makeRequest('POST', '/api/v1/audit/incidents', {
    ticketId: tktId,
    message: 'Official calibration certificate uploaded and verified by Department Head.',
    amount: 14500,
  });
  verify(disputePost.status === 201 && disputePost.body?.incident?.id, 'Incident record successfully logged to Public Audit Ledger');

  // 5. DEVOPS: Real-time Stats Aggregation
  console.log('\n--- 5. DEVOPS: REAL-TIME ANALYTICS AGGREGATION ---');
  const statsRes = await makeRequest('GET', '/api/v1/dashboard/stats');
  verify(
    statsRes.status === 200 &&
    statsRes.body.approvedBudgetTotal >= 14500 &&
    statsRes.body.publicConcernsCount >= 1,
    'Real-time stats accurately reflect budget approvals and audit ledger entries'
  );

  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${checksPassed} CHECKS PASSED, ${checksFailed} CHECKS FAILED`);
  console.log('================================================================\n');

  if (checksFailed > 0) process.exit(1);
}

runFeatureAudit().catch((err) => {
  console.error('Feature audit failed with error:', err);
  process.exit(1);
});

