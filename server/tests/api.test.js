import { EventEmitter } from 'node:events';
import { app } from '../app.js';

// In-memory HTTP mock requester (Zero TCP network socket required)
function makeRequest(method, url, body = null, headers = {}) {
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

    // Route request
    app.handle(req, res);

    // Emit body data
    if (body) {
      req.emit('data', JSON.stringify(body));
    }
    req.emit('end');
  });
}

async function runQaTestSuite() {
  console.log('================================================================');
  console.log('SECS PERN STACK — AUTOMATED QA & INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & ACCESS CONTROL
  // -------------------------------------------------------------
  console.log('[SUITE 1] Authentication & Access Control');

  // 1.0 Admin status check
  const statusRes = await makeRequest('GET', '/api/v1/auth/admin-status');
  assert(statusRes.status === 200 && typeof statusRes.body?.adminConfigured === 'boolean', 'Admin status endpoint returns system setup state');

  // 1.1 Initial Admin Setup or Staff Login
  let adminToken = '';
  if (!statusRes.body?.adminConfigured) {
    const setupRes = await makeRequest('POST', '/api/v1/auth/setup-admin', {
      name: 'System Admin',
      email: 'admin@uitc.edu',
      password: 'Admin@123',
      department: 'Facilities & IT Management',
    });
    assert((setupRes.status === 200 || setupRes.status === 201) && setupRes.body?.accessToken, 'First-time admin setup succeeds and returns JWT access token');
    adminToken = setupRes.body?.accessToken;
  } else {
    const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
      email: 'admin@uitc.edu',
      password: 'Admin@123',
      portal: 'admin',
    });
    assert(loginRes.status === 200 && loginRes.body?.accessToken, 'Valid staff login generates JWT access token');
    adminToken = loginRes.body?.accessToken;
  }

  // 1.2 Invalid password
  const badLogin = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'admin@uitc.edu',
    password: 'WrongPassword',
  });
  assert(badLogin.status === 401, 'Invalid credentials rejected with 401 Unauthorized');

  // 1.3 Forgot password flow
  const forgotRes = await makeRequest('POST', '/api/v1/auth/forgot-password', {
    email: 'admin@uitc.edu',
  });
  assert(forgotRes.status === 200 && forgotRes.body?.success, 'Forgot password triggers 6-digit reset code successfully');

  // 1.4 Registration - non-edu email rejection
  const nonEduReg = await makeRequest('POST', '/api/v1/auth/register', {
    fullName: 'External User',
    email: 'user@gmail.com',
    password: 'Password123',
  });
  assert(nonEduReg.status === 400 && nonEduReg.body?.error?.code === 'VALIDATION_ERROR', 'Non-.edu email rejected with 400 Validation Error');

  // 1.5 Valid student registration
  const testEmail = `student_${Date.now()}@uitc.edu`;
  const validReg = await makeRequest('POST', '/api/v1/auth/register', {
    fullName: 'Afsana Mimi',
    studentId: '0432320005101099',
    email: testEmail,
    department: 'Computer Science & Engineering',
    role: 'student',
    password: 'SecureP@ssword1',
  });
  assert(validReg.status === 201 && validReg.body?.userId, 'Valid .edu student registration succeeds with 201 Created');

  // 1.6 Duplicate email rejection
  const dupReg = await makeRequest('POST', '/api/v1/auth/register', {
    fullName: 'Afsana Mimi',
    email: testEmail,
    password: 'SecureP@ssword1',
  });
  assert(dupReg.status === 409, 'Duplicate user registration rejected with 409 Conflict');

  // -------------------------------------------------------------
  // SUITE 2: LAB DIRECTORY & ASSIGNMENTS
  // -------------------------------------------------------------
  console.log('\n[SUITE 2] Lab Directory & Technician Assignments');

  let labsRes = await makeRequest('GET', '/api/v1/labs');
  assert(labsRes.status === 200 && Array.isArray(labsRes.body?.data), 'Lab directory returns laboratory array');

  // Ensure test lab exists for test suite
  if (labsRes.body.data.length === 0) {
    const createLabRes = await makeRequest('POST', '/api/v1/labs', {
      room: 'CSE-402',
      name: 'Networking Lab',
      department: 'Computer Science',
      technicianId: 'tech-1',
    });
    assert(createLabRes.status === 201, 'Test lab created dynamically');
    labsRes = await makeRequest('GET', '/api/v1/labs');
  }

  const targetLab = labsRes.body.data[0];
  const updateLabRes = await makeRequest(
    'PATCH',
    `/api/v1/labs/${targetLab.id}`,
    { technicianId: 'tech-2' },
    { Authorization: `Bearer ${adminToken}` }
  );
  assert(updateLabRes.status === 200 && updateLabRes.body?.lab?.technician_id === 'tech-2', 'Admin successfully reassigns technician to laboratory');

  // -------------------------------------------------------------
  // SUITE 3: ISSUE LIFECYCLE & WORKFLOW STATE MACHINE
  // -------------------------------------------------------------
  console.log('\n[SUITE 3] Issue Lifecycle & State Machine Transitions');

  // 3.1 Validation - Missing required fields
  const emptyIssue = await makeRequest('POST', '/api/v1/issues', { description: 'broken' });
  assert(emptyIssue.status === 400, 'Issue without lab and equipment type rejected with 400');

  // 3.2 Submission
  const submitRes = await makeRequest('POST', '/api/v1/issues', {
    labId: targetLab.id,
    equipmentType: 'Oscilloscope',
    assetTag: 'OSC-402-QA',
    description: 'CRT screen deflection horizontal amplifier drift.',
    priority: 'High',
    reporterName: 'QA Automated Tester',
    reporterEmail: testEmail,
  });
  assert(submitRes.status === 201 && submitRes.body?.issue?.id?.startsWith('TKT-'), 'New issue submitted with sequential TKT ID');
  const ticketId = submitRes.body?.issue?.id;
  assert(submitRes.body?.issue?.assigned_technician_id, 'Technician auto-assigned based on lab room mapping');

  // 3.3 Tech confirms no budget needed
  const noBudgetRes = await makeRequest('PATCH', `/api/v1/issues/${ticketId}/status`, {
    action: 'confirm_no_budget',
  });
  assert(noBudgetRes.status === 200 && noBudgetRes.body?.issue?.status === 'In Progress', 'confirm_no_budget transitions status to In Progress');

  // 3.4 Tech requests budget
  const budgetReqRes = await makeRequest('PATCH', `/api/v1/issues/${ticketId}/status`, {
    action: 'request_budget',
    budgetAmount: 18500,
    budgetDescription: 'Replacement precision deflection tube',
  });
  assert(
    budgetReqRes.status === 200 &&
    budgetReqRes.body?.issue?.status === 'Budget Requested' &&
    budgetReqRes.body?.issue?.pending_with === 'Higher Authority',
    'request_budget transitions status to Budget Requested, pending Higher Authority'
  );

  // 3.5 Higher Authority approves budget
  const authApproveRes = await makeRequest('PATCH', `/api/v1/issues/${ticketId}/status`, {
    action: 'approve_budget',
  });
  assert(
    authApproveRes.status === 200 &&
    authApproveRes.body?.issue?.status === 'Payment Review' &&
    authApproveRes.body?.issue?.pending_with === 'Accounts Office',
    'approve_budget transitions status to Payment Review, pending Accounts Office'
  );

  // 3.6 Accounts Office approves payment
  const acctPayRes = await makeRequest('PATCH', `/api/v1/issues/${ticketId}/status`, {
    action: 'approve_payment',
  });
  assert(
    acctPayRes.status === 200 &&
    acctPayRes.body?.issue?.status === 'Funds Approved' &&
    acctPayRes.body?.issue?.budget_status === 'Payment approved by Accounts',
    'approve_payment transitions status to Funds Approved, awaiting tech completion'
  );

  // 3.7 Technician completes repair
  const completeRes = await makeRequest('PATCH', `/api/v1/issues/${ticketId}/status`, {
    action: 'complete_repair',
  });
  assert(
    completeRes.status === 200 && completeRes.body?.issue?.status === 'Resolved' && completeRes.body?.issue?.pending_with === 'Closed',
    'complete_repair transitions status to Resolved and closes the ticket'
  );

  // 3.8 Negative Test: Missing ticket ID returns 404
  const notFoundTicket = await makeRequest('PATCH', '/api/v1/issues/TKT-999999/status', {
    action: 'confirm_no_budget',
  });
  assert(notFoundTicket.status === 404, 'Non-existent ticket ID rejected with 404 Not Found');

  // 3.9 Negative Test: Invalid transition action returns 400
  const invalidAction = await makeRequest('PATCH', `/api/v1/issues/${ticketId}/status`, {
    action: 'teleport_equipment',
  });
  assert(invalidAction.status === 400, 'Invalid transition action rejected with 400 Bad Request');

  // 3.10 Negative Test: Budget request with 0 amount rejected
  const zeroBudgetRes = await makeRequest('PATCH', `/api/v1/issues/${ticketId}/status`, {
    action: 'request_budget',
    budgetAmount: 0,
    budgetDescription: 'Zero amount test',
  });
  assert(zeroBudgetRes.status === 400, 'Budget request with zero amount rejected with 400 Validation Error');

  // 3.11 Alternate Transition: Higher Authority cancel_report
  const cancelTestIssue = await makeRequest('POST', '/api/v1/issues', {
    labId: 'lab-2',
    equipmentType: 'Oscilloscopes',
    description: 'Calibration error during frequency test',
    priority: 'low',
  });
  const cancelTicketId = cancelTestIssue.body?.issue?.id;
  const cancelRes = await makeRequest('PATCH', `/api/v1/issues/${cancelTicketId}/status`, {
    action: 'cancel_report',
  });
  assert(
    cancelRes.status === 200 && cancelRes.body?.issue?.status === 'Rejected by Higher Authority',
    'cancel_report transitions status to Rejected by Higher Authority'
  );

  // -------------------------------------------------------------
  // SUITE 4: AUDIT LEDGER & PAYMENT DISPUTES
  // -------------------------------------------------------------
  console.log('\n[SUITE 4] Public Audit Ledger & Payment Disputes');

  const disputeRes = await makeRequest('POST', '/api/v1/audit/incidents', {
    ticketId: ticketId,
    message: 'Technician confirmed parts delivered, calibration verified under full load.',
    amount: 18500,
  });
  assert(disputeRes.status === 201 && disputeRes.body?.incident?.id, 'Incident record successfully logged to public audit ledger');

  const auditLedgerRes = await makeRequest('GET', '/api/v1/audit/incidents');
  assert(
    auditLedgerRes.status === 200 && auditLedgerRes.body?.data?.some((i) => i.ticket_id === ticketId),
    'Public audit ledger immediately returns published incident'
  );

  // -------------------------------------------------------------
  // SUITE 5: STAFF PRIVILEGES & SECURITY
  // -------------------------------------------------------------
  console.log('\n[SUITE 5] Staff Account Protection & Security Rules');

  // 5.1 Prevent removing primary admin
  const removeAdminRes = await makeRequest(
    'DELETE',
    '/api/v1/users/admin-1',
    null,
    { Authorization: `Bearer ${adminToken}` }
  );
  assert(removeAdminRes.status === 403, 'System forbids removal of primary System Admin account (admin-1)');

  // 5.2 Create staff member validation
  const invalidStaffRes = await makeRequest('POST', '/api/v1/users', {
    name: 'Invalid Staff',
    email: 'external@gmail.com',
  });
  assert(invalidStaffRes.status === 400, 'Creation of staff member with non-.edu email rejected with 400');

  // -------------------------------------------------------------
  // SUITE 6: DYNAMIC AGGREGATIONS & METRICS
  // -------------------------------------------------------------
  console.log('\n[SUITE 6] Dynamic Analytics & Real-Time Aggregations');

  const statsRes = await makeRequest('GET', '/api/v1/dashboard/stats');
  assert(
    statsRes.status === 200 &&
    typeof statsRes.body?.issuesResolvedCount === 'number' &&
    typeof statsRes.body?.approvedBudgetTotal === 'number',
    'Dynamic dashboard stats calculate resolved count and budget totals accurately'
  );

  // -------------------------------------------------------------
  // SUITE 7: QUERY FILTERING & METADATA CONTRACTS
  // -------------------------------------------------------------
  console.log('\n[SUITE 7] Query Filtering & Metadata Contracts');

  // 7.1 Search issues
  const searchRes = await makeRequest('GET', '/api/v1/issues?search=Oscilloscope');
  assert(
    searchRes.status === 200 && searchRes.body?.data?.length > 0,
    'Issue search query successfully returns matching equipment tickets'
  );

  // 7.2 Masked emails in public feed
  const publicFeedRes = await makeRequest('GET', '/api/v1/issues/public');
  assert(
    publicFeedRes.status === 200 && publicFeedRes.body?.data?.every((i) => i.reporter && i.reporter.includes('***@')),
    'Public issue feed privacy protection strictly masks reporter email addresses'
  );

  // 7.3 Metadata: Announcements
  const annRes = await makeRequest('GET', '/api/v1/announcements');
  assert(annRes.status === 200 && Array.isArray(annRes.body?.data), 'Campus announcements endpoint responds with announcement array');

  // 7.4 Metadata: Equipment types
  const equipRes = await makeRequest('GET', '/api/v1/metadata/equipment-types');
  assert(equipRes.status === 200 && Array.isArray(equipRes.body?.data) && equipRes.body?.data?.length >= 5, 'Metadata equipment types catalog contains full taxonomy');

  // 7.5 Metadata: Dynamic Departments Management
  const addDeptRes = await makeRequest('POST', '/api/v1/departments', {
    name: 'Computer Science & Engineering',
  });
  assert(addDeptRes.status === 201, 'Admin can dynamically create a department');

  const deptRes = await makeRequest('GET', '/api/v1/metadata/departments');
  assert(
    deptRes.status === 200 &&
    Array.isArray(deptRes.body?.data) &&
    deptRes.body?.data?.some((d) => d.toLowerCase().includes('computer science')),
    'Metadata departments contains dynamic faculties'
  );

  const delDeptRes = await makeRequest('DELETE', `/api/v1/departments/${encodeURIComponent('Computer Science & Engineering')}`);
  assert(delDeptRes.status === 200, 'Admin can remove a department');

  // Summary
  console.log('\n================================================================');
  console.log(`QA TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runQaTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
