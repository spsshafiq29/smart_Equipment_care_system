import { memoryDb } from '../db/pool.js';
import { hashPassword } from '../middleware/auth.js';

export function userRoutes(router) {
  // GET /api/v1/users
  router.get('/api/v1/users', (req, res) => {
    const safeUsers = memoryDb.tables.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      is_active: u.is_active,
    }));
    res.json({ data: safeUsers, total: safeUsers.length });
  });

  // POST /api/v1/users
  router.post('/api/v1/users', (req, res) => {
    const { name, email, role, labId, department } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Staff member name is required' } });
    }
    if (!email?.trim() || !email.toLowerCase().endsWith('.edu')) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid university .edu email is required' } });
    }

    const existing = memoryDb.tables.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'An account with this email already exists' } });
    }

    const newUser = {
      id: `${role || 'technician'}-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashPassword('Staff@123'),
      role: role || 'technician',
      department: department || 'Facilities & Operations',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    memoryDb.tables.users.push(newUser);

    if (newUser.role === 'technician' && labId) {
      const lab = memoryDb.tables.labs.find((l) => l.id === labId);
      if (lab) lab.technician_id = newUser.id;
    }

    const { password_hash, ...safeUser } = newUser;
    res.status(201).json({ message: 'Staff account created successfully', user: safeUser });
  });

  // DELETE /api/v1/users/:id
  router.delete('/api/v1/users/:id', (req, res) => {
    const { id } = req.params;
    if (id === 'admin-1') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Primary System Admin account cannot be removed' } });
    }

    const idx = memoryDb.tables.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const removed = memoryDb.tables.users.splice(idx, 1)[0];
    if (removed.role === 'technician') {
      for (const lab of memoryDb.tables.labs) {
        if (lab.technician_id === id) lab.technician_id = null;
      }
    }

    res.json({ message: 'User account removed' });
  });
}

