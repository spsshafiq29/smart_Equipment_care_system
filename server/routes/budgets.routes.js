import { memoryDb } from '../db/pool.js';

export function budgetRoutes(router) {
  // GET /api/v1/budgets
  router.get('/api/v1/budgets', (req, res) => {
    res.json({ data: memoryDb.tables.budgets, total: memoryDb.tables.budgets.length });
  });

  // PATCH /api/v1/budgets/:id/approve
  router.patch('/api/v1/budgets/:id/approve', (req, res) => {
    const { id } = req.params;
    const budget = memoryDb.tables.budgets.find((b) => b.id === id);
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

    res.json({ message: 'Budget approved successfully', budget });
  });

  // PATCH /api/v1/budgets/:id/confirm-payment
  router.patch('/api/v1/budgets/:id/confirm-payment', (req, res) => {
    const { id } = req.params;
    const budget = memoryDb.tables.budgets.find((b) => b.id === id);
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

    res.json({ message: 'Payment confirmed and logged', budget });
  });
}

