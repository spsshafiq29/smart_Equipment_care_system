import { memoryDb, query } from '../db/pool.js';
import { hashPassword } from '../middleware/auth.js';
import { sendHigherAuthorityAccountEmail, sendStaffAccountEmail } from '../services/email.service.js';

export function userRoutes(router) {
  // GET /api/v1/users
  router.get('/api/v1/users', async (req, res) => {
    try {
      const dbRes = await query('SELECT id, name, email, role, department, is_active FROM users ORDER BY created_at DESC');
      if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
        return res.json({ data: dbRes.rows, total: dbRes.rows.length });
      }
    } catch {
      // ignore
    }

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
  router.post('/api/v1/users', async (req, res) => {
    const { name, email, role, labId, department, password } = req.body || {};
    const isUniversityEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      (email.toLowerCase().includes('.edu') || email.toLowerCase().includes('.ac.') || email.toLowerCase().endsWith('.edu'));
    if (!name?.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Staff member name is required' } });
    }
    if (!isUniversityEmail) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid university email address (.edu, .edu.bd, .ac.bd) is required' } });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = memoryDb.tables.users.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (existing) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'An account with this email already exists' } });
    }

    // Determine initial password (provided or generated)
    const initialPassword = password?.trim() || `Univ#${Math.floor(1000 + Math.random() * 9000)}!`;
    const assignedRole = role || 'technician';
    const assignedDept = department || (assignedRole === 'authority' ? 'Academic Affairs' : 'Facilities & Operations');

    const newUser = {
      id: `${assignedRole}-${Date.now()}`,
      name: name.trim(),
      email: trimmedEmail,
      password_hash: hashPassword(initialPassword),
      role: assignedRole,
      department: assignedDept,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    memoryDb.tables.users.push(newUser);

    // Save to PostgreSQL if available
    try {
      await query(
        `INSERT INTO users (id, name, email, password_hash, role, department, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = true`,
        [newUser.id, newUser.name, newUser.email, newUser.password_hash, newUser.role, newUser.department]
      );
    } catch {
      // ignore
    }

    let assignedLabName = '';
    if (newUser.role === 'technician' && labId) {
      const lab = memoryDb.tables.labs.find((l) => l.id === labId);
      if (lab) {
        lab.technician_id = newUser.id;
        assignedLabName = `${lab.room} · ${lab.name}`;
      }
    }

    // Send credentials via email according to role
    let emailStatus = 'failed';
    let emailError = null;

    try {
      if (assignedRole === 'authority') {
        // Admin creating Higher Authority
        const mailRes = await sendHigherAuthorityAccountEmail({
          to: trimmedEmail,
          name: newUser.name,
          email: trimmedEmail,
          password: initialPassword,
          department: assignedDept,
        });
        if (mailRes && mailRes.success) {
          emailStatus = 'dispatched';
        } else {
          emailStatus = 'failed';
          emailError = mailRes?.error || 'Brevo SMTP authentication or relay failure';
        }
      } else {
        // Higher Authority / Admin creating Staff / Technician / Accounts
        const mailRes = await sendStaffAccountEmail({
          to: trimmedEmail,
          name: newUser.name,
          email: trimmedEmail,
          password: initialPassword,
          role: assignedRole,
          department: assignedDept,
          labName: assignedLabName || undefined,
        });
        if (mailRes && mailRes.success) {
          emailStatus = 'dispatched';
        } else {
          emailStatus = 'failed';
          emailError = mailRes?.error || 'Brevo SMTP authentication or relay failure';
        }
      }
    } catch (mailErr) {
      emailStatus = 'failed';
      emailError = mailErr?.message || 'SMTP exception';
      console.warn('[USERS] Staff account email delivery notice:', mailErr?.message);
    }

    const { password_hash, ...safeUser } = newUser;
    res.status(201).json({
      message: emailStatus === 'dispatched'
        ? 'Staff account created successfully. Credentials dispatched to university email.'
        : 'Staff account created successfully. Email delivery could not be completed; credentials available on screen.',
      user: safeUser,
      generatedPassword: initialPassword,
      emailStatus,
      emailError,
    });
  });

  // POST /api/v1/users/:id/reset-password
  router.post('/api/v1/users/:id/reset-password', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body || {};

    const targetUser = memoryDb.tables.users.find((u) => u.id === id);

    let pgUser = null;
    try {
      const qRes = await query('SELECT * FROM users WHERE id = $1', [id]);
      if (qRes && qRes.rows && qRes.rows.length > 0) {
        pgUser = qRes.rows[0];
      }
    } catch {
      // ignore
    }

    if (!targetUser && !pgUser) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const newPassword = password?.trim() || `Univ#${Math.floor(1000 + Math.random() * 9000)}!`;
    const newHash = hashPassword(newPassword);

    if (targetUser) {
      targetUser.password_hash = newHash;
    }

    try {
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, id]);
    } catch {
      // ignore
    }

    const userEmail = targetUser?.email || pgUser?.email;
    const userName = targetUser?.name || pgUser?.name || 'Staff Member';
    const userRole = targetUser?.role || pgUser?.role || 'staff';
    const userDept = targetUser?.department || pgUser?.department || 'University Staff';

    let emailStatus = 'failed';
    let emailError = null;

    try {
      const mailRes = await sendStaffAccountEmail({
        to: userEmail,
        name: userName,
        email: userEmail,
        password: newPassword,
        role: userRole,
        department: userDept,
      });
      if (mailRes && mailRes.success) {
        emailStatus = 'dispatched';
      } else {
        emailStatus = 'failed';
        emailError = mailRes?.error || 'Brevo SMTP authentication or relay failure';
      }
    } catch (mErr) {
      emailStatus = 'failed';
      emailError = mErr?.message || 'SMTP exception';
    }

    res.json({
      message: 'Password reset successfully.',
      newPassword,
      emailStatus,
      emailError,
      user: {
        id,
        name: userName,
        email: userEmail,
        role: userRole,
        department: userDept,
      },
    });
  });

  // DELETE /api/v1/users/:id
  router.delete('/api/v1/users/:id', async (req, res) => {
    const { id } = req.params;
    if (id === 'admin-1') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Primary System Admin account cannot be removed' } });
    }

    try {
      await query('UPDATE labs SET technician_id = NULL WHERE technician_id = $1', [id]);
      await query('DELETE FROM users WHERE id = $1', [id]);
    } catch {
      // ignore
    }

    const idx = memoryDb.tables.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      const removed = memoryDb.tables.users.splice(idx, 1)[0];
      if (removed.role === 'technician') {
        for (const lab of memoryDb.tables.labs) {
          if (lab.technician_id === id) lab.technician_id = null;
        }
      }
    }

    res.json({ message: 'User account removed' });
  });
}

