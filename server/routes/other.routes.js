import { memoryDb, query } from '../db/pool.js';
import { emailOutbox, sendMail } from '../services/email.service.js';

export function auditRoutes(router) {
  // GET /api/v1/audit/incidents
  router.get('/api/v1/audit/incidents', async (req, res) => {
    let list = [...memoryDb.tables.audit_incidents];
    try {
      const dbRes = await query('SELECT id, ticket_id, message, amount, reported_by_role, created_at FROM audit_incidents ORDER BY created_at DESC');
      if (dbRes && Array.isArray(dbRes.rows) && dbRes.rows.length > 0) {
        list = dbRes.rows;
      }
    } catch {}
    res.json({ data: list, total: list.length });
  });

  // POST /api/v1/audit/incidents
  router.post('/api/v1/audit/incidents', async (req, res) => {
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

    try {
      await query(
        'INSERT INTO audit_incidents (ticket_id, message, amount, reported_by_role, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        [ticketId, incident.message, incident.amount, 'Technician']
      );
      await query(
        "UPDATE issues SET status = 'Payment Disputed', current_stage = 'Payment discrepancy under public review', pending_with = 'Higher Authority', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [ticketId]
      );
    } catch {}

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

  const equipmentTypesHandler = async (req, res) => {
    try {
      const dbRes = await query('SELECT id, name, icon FROM equipment_types ORDER BY name ASC');
      if (dbRes && Array.isArray(dbRes.rows)) {
        return res.json({
          data: dbRes.rows.map((r) => ({ icon: r.icon || '⚙️', label: r.name, id: r.id })),
          equipmentTypes: dbRes.rows,
          total: dbRes.rows.length,
        });
      }
    } catch {
      // ignore
    }

    const list = (memoryDb.tables.equipment_types || []).map((e) =>
      typeof e === 'string'
        ? { icon: '⚙️', label: e, id: e }
        : { icon: e.icon || '⚙️', label: e.name || e.label, id: e.id || e.name }
    );
    res.json({
      data: list,
      equipmentTypes: memoryDb.tables.equipment_types || [],
      total: list.length,
    });
  };

  router.get('/api/v1/equipment-types', equipmentTypesHandler);
  router.get('/api/v1/metadata/equipment-types', equipmentTypesHandler);

  // POST /api/v1/equipment-types - Admin adds equipment classification
  const createEquipmentTypeHandler = async (req, res) => {
    const { name, label, icon } = req.body || {};
    const finalName = (name || label || '').trim();
    const finalIcon = (icon || '⚙️').trim();

    if (!finalName) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Equipment classification name is required' } });
    }

    const id = `eq-${Date.now()}`;
    const newEntry = { id, name: finalName, label: finalName, icon: finalIcon };

    if (!memoryDb.tables.equipment_types) memoryDb.tables.equipment_types = [];
    if (!memoryDb.tables.equipment_types.some((e) => (typeof e === 'string' ? e : e.name || e.label).toLowerCase() === finalName.toLowerCase())) {
      memoryDb.tables.equipment_types.push(newEntry);
    }

    try {
      await query(
        'INSERT INTO equipment_types (id, name, icon) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon',
        [id, finalName, finalIcon]
      );
    } catch {
      // ignore
    }

    res.status(201).json({ message: 'Equipment classification created successfully', equipmentType: newEntry });
  };

  router.post('/api/v1/equipment-types', createEquipmentTypeHandler);
  router.post('/api/v1/metadata/equipment-types', createEquipmentTypeHandler);

  // DELETE /api/v1/equipment-types/:id - Admin deletes equipment classification
  const deleteEquipmentTypeHandler = async (req, res) => {
    let { id } = req.params;
    try {
      id = decodeURIComponent(id || '').trim();
    } catch {
      id = (id || '').trim();
    }

    try {
      await query(
        'DELETE FROM equipment_types WHERE id = $1 OR LOWER(TRIM(name)) = LOWER(TRIM($1)) OR name ILIKE $1',
        [id]
      );
    } catch {
      // ignore
    }

    if (memoryDb.tables.equipment_types) {
      memoryDb.tables.equipment_types = memoryDb.tables.equipment_types.filter((e) => {
        const eId = typeof e === 'string' ? e : e.id;
        const eName = typeof e === 'string' ? e : (e.name || e.label);
        return eId !== id && eName.toLowerCase().trim() !== id.toLowerCase().trim();
      });
    }

    res.json({ message: 'Equipment classification deleted successfully' });
  };

  router.delete('/api/v1/equipment-types/:id', deleteEquipmentTypeHandler);
  router.delete('/api/v1/metadata/equipment-types/:id', deleteEquipmentTypeHandler);

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

export function settingsRoutes(router) {
  // GET /api/v1/settings or /api/v1/settings/university
  const getSettingsHandler = async (req, res) => {
    let universityName = memoryDb.tables.settings?.university_name || '';
    try {
      const dbRes = await query("SELECT value FROM system_settings WHERE key = 'university_name'");
      if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
        universityName = dbRes.rows[0].value || '';
        if (memoryDb.tables.settings) {
          memoryDb.tables.settings.university_name = universityName;
        }
      }
    } catch {
      // ignore
    }

    res.json({
      universityName,
      appName: universityName ? `${universityName} · Smart Equipment Care` : 'Smart Equipment Care System',
      hasCustomName: Boolean(universityName.trim()),
    });
  };

  router.get('/api/v1/settings', getSettingsHandler);
  router.get('/api/v1/settings/university', getSettingsHandler);

  // PATCH /api/v1/settings/university - update or clear university name
  const updateSettingsHandler = async (req, res) => {
    const { universityName } = req.body || {};
    const trimmed = (universityName ?? '').trim();

    if (memoryDb.tables.settings) {
      memoryDb.tables.settings.university_name = trimmed;
    }

    try {
      await query(
        `INSERT INTO system_settings (key, value, updated_at) 
         VALUES ('university_name', $1, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [trimmed]
      );
    } catch {
      // ignore
    }

    res.json({
      success: true,
      message: trimmed ? `University name updated to "${trimmed}".` : 'University name cleared (operating without name).',
      universityName: trimmed,
      hasCustomName: Boolean(trimmed),
    });
  };

  router.patch('/api/v1/settings/university', updateSettingsHandler);
  router.post('/api/v1/settings/university', updateSettingsHandler);
}
