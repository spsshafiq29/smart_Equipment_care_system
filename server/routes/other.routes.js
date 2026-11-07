import { memoryDb, query } from '../db/pool.js';
import { emailOutbox, sendMail } from '../services/email.service.js';

export function auditRoutes(router) {
  // GET /api/v1/audit/incidents
  router.get('/api/v1/audit/incidents', (req, res) => {
    res.json({ data: memoryDb.tables.audit_incidents, total: memoryDb.tables.audit_incidents.length });
  });

  // POST /api/v1/audit/incidents
  router.post('/api/v1/audit/incidents', (req, res) => {
    const { ticketId, message, amount } = req.body || {};
    if (!ticketId || !message?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Ticket ID and description are required' } });
    }

    const incident = {
      id: memoryDb.counters.incidentSeq++,
      ticket_id: ticketId,
      message: message.trim(),
      amount: amount ? Number(amount) : null,
      reported_by_role: 'Technician',
      created_at: new Date().toISOString(),
    };

    memoryDb.tables.audit_incidents.unshift(incident);

    const issue = memoryDb.tables.issues.find((i) => i.id === ticketId);
    if (issue) {
      issue.status = 'Payment Disputed';
      issue.current_stage = 'Payment discrepancy under public review';
      issue.pending_with = 'Higher Authority';
    }

    res.status(201).json({ message: 'Dispute recorded to public ledger', incident });
  });
}

export function notificationRoutes(router) {
  // GET /api/v1/notifications
  router.get('/api/v1/notifications', (req, res) => {
    const { role, userId } = req.query || {};
    const notifs = memoryDb.tables.notifications.filter((n) => {
      if (userId && n.user_id === userId) return true;
      if (role && n.target_role === role) return true;
      if (!n.target_role && !n.user_id) return true;
      return false;
    });
    res.json({ data: notifs, unreadCount: notifs.filter((n) => !n.read).length });
  });

  // PATCH /api/v1/notifications/read-all
  router.patch('/api/v1/notifications/read-all', (req, res) => {
    const { role, userId } = req.query || {};
    for (const n of memoryDb.tables.notifications) {
      if ((role && n.target_role === role) || (userId && n.user_id === userId)) {
        n.read = true;
      }
    }
    res.json({ message: 'Notifications marked as read' });
  });
}

export function statsRoutes(router) {
  // GET /api/v1/dashboard/stats
  router.get('/api/v1/dashboard/stats', async (req, res) => {
    let resolvedCount = memoryDb.tables.issues.filter((i) => i.status === 'Resolved').length;
    let openIssues = memoryDb.tables.issues.filter((i) => i.status !== 'Resolved' && !i.status.includes('Rejected')).length;
    let approvedTotal = memoryDb.tables.budgets
      .filter((b) => b.status !== 'Pending approval')
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);
    let labsCount = memoryDb.tables.labs.length;
    let usersCount = memoryDb.tables.users.length;
    let incidentsCount = memoryDb.tables.audit_incidents.length;

    try {
      const { query } = await import('../db/pool.js');
      const rRes = await query("SELECT count(*)::int as count FROM issues WHERE status = 'Resolved'");
      if (rRes && rRes.rows && rRes.rows[0]) resolvedCount = rRes.rows[0].count;

      const oRes = await query("SELECT count(*)::int as count FROM issues WHERE status NOT IN ('Resolved', 'Rejected by Higher Authority')");
      if (oRes && oRes.rows && oRes.rows[0]) openIssues = oRes.rows[0].count;

      const bRes = await query("SELECT COALESCE(SUM(amount), 0)::numeric as total FROM budgets WHERE status != 'Pending approval'");
      if (bRes && bRes.rows && bRes.rows[0]) approvedTotal = Number(bRes.rows[0].total);

      const lRes = await query("SELECT count(*)::int as count FROM labs");
      if (lRes && lRes.rows && lRes.rows[0]) labsCount = lRes.rows[0].count;

      const uRes = await query("SELECT count(*)::int as count FROM users");
      if (uRes && uRes.rows && uRes.rows[0]) usersCount = uRes.rows[0].count;

      const iRes = await query("SELECT count(*)::int as count FROM audit_incidents");
      if (iRes && iRes.rows && iRes.rows[0]) incidentsCount = iRes.rows[0].count;
    } catch {
      // ignore
    }

    res.json({
      issuesResolvedFormatted: `${resolvedCount.toLocaleString()}`,
      issuesResolvedCount: resolvedCount,
      avgResponseTime: resolvedCount > 0 ? '24 hr' : 'Active',
      labsSupported: labsCount,
      satisfactionRate: '100%',
      openIssues,
      approvedBudgetTotal: approvedTotal,
      publicConcernsCount: incidentsCount,
      totalStaffCount: usersCount,
      registeredLabsCount: labsCount,
    });
  });
}

export function metaRoutes(router) {
  router.get('/api/v1/announcements', (req, res) => {
    res.json({ data: memoryDb.tables.announcements });
  });

  const equipmentTypesHandler = (req, res) => {
    res.json({
      data: [
        { icon: '🔬', label: 'Microscopes' },
        { icon: '⚗️', label: 'Centrifuges' },
        { icon: '💻', label: 'Lab Computers' },
        { icon: '📡', label: 'Oscilloscopes' },
        { icon: '🧪', label: 'Spectrophotometers' },
        { icon: '🔋', label: 'Power Supplies' },
        { icon: '🌡️', label: 'Autoclaves' },
        { icon: '📷', label: 'Imaging Systems' },
      ],
    });
  };

  router.get('/api/v1/equipment-types', equipmentTypesHandler);
  router.get('/api/v1/metadata/equipment-types', equipmentTypesHandler);

  const departmentsHandler = async (req, res) => {
    try {
      const dbRes = await query('SELECT id, name FROM departments ORDER BY name ASC');
      if (dbRes && Array.isArray(dbRes.rows)) {
        return res.json({
          data: dbRes.rows.map((r) => r.name),
          departments: dbRes.rows,
          total: dbRes.rows.length,
        });
      }
    } catch {
      // ignore
    }

    const list = (memoryDb.tables.departments || []).map((d) => (typeof d === 'string' ? d : d.name));
    res.json({
      data: list,
      departments: memoryDb.tables.departments || [],
      total: list.length,
    });
  };

  router.get('/api/v1/departments', departmentsHandler);
  router.get('/api/v1/metadata/departments', departmentsHandler);

  // POST /api/v1/departments - Admin creates department
  const createDeptHandler = async (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Department name is required' } });
    }

    const trimmed = name.trim();
    const id = `dept-${Date.now()}`;
    const newDept = { id, name: trimmed };

    if (!memoryDb.tables.departments) memoryDb.tables.departments = [];
    if (!memoryDb.tables.departments.some((d) => (typeof d === 'string' ? d : d.name).toLowerCase() === trimmed.toLowerCase())) {
      memoryDb.tables.departments.push(newDept);
    }

    try {
      await query('INSERT INTO departments (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [id, trimmed]);
    } catch {
      // ignore
    }

    res.status(201).json({ message: 'Department created successfully', department: newDept });
  };

  router.post('/api/v1/departments', createDeptHandler);
  router.post('/api/v1/metadata/departments', createDeptHandler);

  // DELETE /api/v1/departments/:id - Admin deletes department
  const deleteDeptHandler = async (req, res) => {
    let { id } = req.params;
    try {
      id = decodeURIComponent(id || '').trim();
    } catch {
      id = (id || '').trim();
    }

    try {
      await query(
        'DELETE FROM departments WHERE id = $1 OR LOWER(TRIM(name)) = LOWER(TRIM($1)) OR name ILIKE $1',
        [id]
      );
    } catch {
      // ignore
    }

    if (memoryDb.tables.departments) {
      memoryDb.tables.departments = memoryDb.tables.departments.filter((d) => {
        const dId = typeof d === 'string' ? d : d.id;
        const dName = typeof d === 'string' ? d : d.name;
        return (
          dId !== id &&
          dName.toLowerCase().trim() !== id.toLowerCase().trim()
        );
      });
    }

    res.json({ message: 'Department removed successfully' });
  };

  router.delete('/api/v1/departments/:id', deleteDeptHandler);
  router.delete('/api/v1/metadata/departments/:id', deleteDeptHandler);
}

export function emailRoutes(router) {
  // GET /api/v1/email/outbox
  router.get('/api/v1/email/outbox', (req, res) => {
    res.json({
      data: emailOutbox.slice(0, 50),
      total: emailOutbox.length,
    });
  });

  // POST /api/v1/email/test - test delivery
  router.post('/api/v1/email/test', async (req, res) => {
    const { to, subject, message } = req.body || {};
    const recipient = to || 'spsshafiq95@gmail.com';
    const result = await sendMail({
      to: recipient,
      subject: subject || '🧪 SECS University Email Delivery Test',
      html: `<div style="font-family:sans-serif;padding:20px;background:#050d1f;color:#fff;">
        <h2 style="color:#f59e0b;">SECS University Email Integration Test</h2>
        <p>This is a test notification verifying Brevo SMTP credentials and template delivery.</p>
        <p><strong>Message:</strong> ${message || 'All systems operational.'}</p>
        <p style="font-size:12px;color:#94a3b8;">Sent via Brevo SMTP (smtp-relay.brevo.com:587)</p>
      </div>`,
    });

    res.json({
      message: result.success ? 'Test email dispatched successfully' : 'Email recorded to outbox (SMTP auth notice)',
      result,
    });
  });
}
