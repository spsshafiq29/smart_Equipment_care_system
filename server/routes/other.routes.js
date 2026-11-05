import { memoryDb } from '../db/pool.js';

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

  const departmentsHandler = (req, res) => {
    res.json({
      data: [
        'Computer Science & Engineering',
        'Electrical & Electronic Engineering',
        'Mechanical Engineering',
        'Civil Engineering',
        'Physics',
        'Chemistry',
        'Biology & Biotechnology',
        'Business Administration',
        'Other',
      ],
    });
  };

  router.get('/api/v1/departments', departmentsHandler);
  router.get('/api/v1/metadata/departments', departmentsHandler);
}
