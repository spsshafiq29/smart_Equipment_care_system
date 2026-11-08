import { memoryDb, query } from '../db/pool.js';

export function budgetRoutes(router) {
  // GET /api/v1/budgets
  router.get('/api/v1/budgets', async (req, res) => {
    let list = [...memoryDb.tables.budgets];
    try {
      const dbRes = await query(`
        SELECT id, ticket_id, lab_name, purpose, amount, technician_id, status, approved_by, paid_at, created_at
        FROM budgets
        ORDER BY created_at DESC
      `);
      if (dbRes && Array.isArray(dbRes.rows) && dbRes.rows.length > 0) {
        list = dbRes.rows;
      }
    } catch {
      // ignore
    }
    res.json({ data: list, total: list.length });
  });

  // PATCH /api/v1/budgets/:id/approve
  router.patch('/api/v1/budgets/:id/approve', async (req, res) => {
    const { id } = req.params;
    let budget = memoryDb.tables.budgets.find((b) => b.id === id);
    if (!budget) {
      try {
        const dbRes = await query('SELECT * FROM budgets WHERE id = $1', [id]);
        if (dbRes && dbRes.rows && dbRes.rows[0]) {
          budget = dbRes.rows[0];
          memoryDb.tables.budgets.push(budget);
        }
      } catch {}
    }
    if (!budget) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget record not found' } });
    }

    budget.status = 'Approved';
    budget.approved_by = req.user?.name || 'Dr. Samina Haque';

    const issue = memoryDb.tables.issues.find((i) => i.id === budget.ticket_id);
    if (issue) {
      issue.status = 'Payment Review';
      issue.current_stage = 'Budget approved — awaiting Accounts payment';
      issue.pending_with = 'Accounts Office';
      issue.budget_status = 'Approved by Higher Authority';
    }

    try {
      await query('UPDATE budgets SET status = $1, approved_by = $2 WHERE id = $3', ['Approved', budget.approved_by, id]);
      if (budget.ticket_id) {
        await query(
          "UPDATE issues SET status = 'Payment Review', current_stage = 'Budget approved — awaiting Accounts payment', pending_with = 'Accounts Office', budget_status = 'Approved by Higher Authority', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [budget.ticket_id]
        );
      }
    } catch {}

    res.json({ message: 'Budget approved successfully', budget });
  });

  // PATCH /api/v1/budgets/:id/confirm-payment
  router.patch('/api/v1/budgets/:id/confirm-payment', async (req, res) => {
    const { id } = req.params;
    let budget = memoryDb.tables.budgets.find((b) => b.id === id);
    if (!budget) {
      try {
        const dbRes = await query('SELECT * FROM budgets WHERE id = $1', [id]);
        if (dbRes && dbRes.rows && dbRes.rows[0]) {
          budget = dbRes.rows[0];
          memoryDb.tables.budgets.push(budget);
        }
      } catch {}
    }
    if (!budget) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget record not found' } });
    }

    budget.status = 'Payment confirmed';
    budget.paid_at = new Date().toISOString();

    const issue = memoryDb.tables.issues.find((i) => i.id === budget.ticket_id);
    if (issue) {
      const tech = memoryDb.tables.users.find((u) => u.id === issue.assigned_technician_id);
      issue.status = 'Funds Approved';
      issue.current_stage = 'Accounts approved payment — awaiting technician confirmation';
      issue.pending_with = tech ? tech.name : 'Assigned Technician';
      issue.budget_status = 'Payment approved by Accounts';
    }

    try {
      await query('UPDATE budgets SET status = $1, paid_at = CURRENT_TIMESTAMP WHERE id = $2', ['Payment confirmed', id]);
      if (budget.ticket_id) {
        await query(
          "UPDATE issues SET status = 'Funds Approved', current_stage = 'Accounts approved payment — awaiting technician confirmation', budget_status = 'Payment approved by Accounts', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [budget.ticket_id]
        );
      }
    } catch {}

    res.json({ message: 'Payment confirmed and logged', budget });
  });
}

