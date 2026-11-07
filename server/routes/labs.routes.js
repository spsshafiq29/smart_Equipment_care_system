import { memoryDb, query } from '../db/pool.js';

export function labRoutes(router) {
  // GET /api/v1/labs
  router.get('/api/v1/labs', async (req, res) => {
    try {
      const dbRes = await query(`
        SELECT l.id, l.room, l.name, l.department, l.technician_id as "technicianId",
               u.name as "technicianName",
               (
                 SELECT count(*)::int
                 FROM issues i
                 WHERE (i.lab_id = l.id OR i.lab_name ILIKE '%' || l.room || '%')
                   AND i.status NOT IN ('Resolved', 'Rejected by Higher Authority')
               ) as "openIssues"
        FROM labs l
        LEFT JOIN users u ON l.technician_id = u.id
        ORDER BY l.room ASC
      `);
      if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
        return res.json({ data: dbRes.rows, total: dbRes.rows.length });
      }
    } catch {
      // ignore & fallback to memory
    }

    const list = memoryDb.tables.labs.map((lab) => {
      const openIssues = memoryDb.tables.issues.filter(
        (i) => (i.lab_id === lab.id || i.lab_name?.includes(lab.room)) && i.status !== 'Resolved' && !i.status.includes('Rejected')
      ).length;
      const tech = memoryDb.tables.users.find((u) => u.id === lab.technician_id);
      return {
        id: lab.id,
        room: lab.room,
        name: lab.name,
        department: lab.department,
        technicianId: lab.technician_id || null,
        technicianName: tech ? tech.name : 'Awaiting assignment',
        openIssues,
      };
    });
    res.json({ data: list, total: list.length });
  });

  // POST /api/v1/labs
  router.post('/api/v1/labs', async (req, res) => {
    const { room, name, department, technicianId } = req.body || {};
    if (!room || !name) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Room code and lab name are required' } });
    }

    const trimmedRoom = room.trim();
    const trimmedName = name.trim();
    const trimmedDept = department?.trim() || 'General Engineering';
    const techId = technicianId || null;
    const labId = `lab-${Date.now()}`;

    const newLab = {
      id: labId,
      room: trimmedRoom,
      name: trimmedName,
      department: trimmedDept,
      technician_id: techId,
      created_at: new Date().toISOString(),
    };

    memoryDb.tables.labs.push(newLab);

    let assignedTechName = 'Awaiting assignment';
    if (techId) {
      const tech = memoryDb.tables.users.find((u) => u.id === techId);
      if (tech) assignedTechName = tech.name;
    }

    try {
      await query(
        `INSERT INTO labs (id, room, name, department, technician_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (room) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, technician_id = EXCLUDED.technician_id`,
        [newLab.id, newLab.room, newLab.name, newLab.department, newLab.technician_id]
      );
      if (techId) {
        const uRes = await query('SELECT name FROM users WHERE id = $1', [techId]);
        if (uRes && uRes.rows && uRes.rows[0]) assignedTechName = uRes.rows[0].name;
      }
    } catch {
      // ignore
    }

    res.status(201).json({
      message: 'Lab created successfully',
      lab: {
        id: newLab.id,
        room: newLab.room,
        name: newLab.name,
        department: newLab.department,
        technicianId: newLab.technician_id,
        technicianName: assignedTechName,
        openIssues: 0,
      },
    });
  });

  // Handler for updating lab / technician
  const updateLabHandler = async (req, res) => {
    const { id } = req.params;
    const { technicianId, room, name, department } = req.body || {};

    const lab = memoryDb.tables.labs.find((l) => l.id === id);
    if (lab) {
      if (technicianId !== undefined) lab.technician_id = technicianId || null;
      if (room) lab.room = room.trim();
      if (name) lab.name = name.trim();
      if (department) lab.department = department.trim();
    }

    let updatedTechName = 'Awaiting assignment';
    try {
      if (technicianId !== undefined) {
        await query('UPDATE labs SET technician_id = $1 WHERE id = $2', [technicianId || null, id]);
        // Also update open issues assigned to this lab
        if (technicianId) {
          await query(
            `UPDATE issues SET assigned_technician_id = $1 WHERE lab_id = $2 AND status NOT IN ('Resolved', 'Rejected by Higher Authority')`,
            [technicianId, id]
          );
        }
      }
      if (room) {
        await query('UPDATE labs SET room = $1 WHERE id = $2', [room.trim(), id]);
      }
      if (name) {
        await query('UPDATE labs SET name = $1 WHERE id = $2', [name.trim(), id]);
      }
      if (department) {
        await query('UPDATE labs SET department = $1 WHERE id = $2', [department.trim(), id]);
      }

      const qTech = await query('SELECT u.name FROM labs l LEFT JOIN users u ON l.technician_id = u.id WHERE l.id = $1', [id]);
      if (qTech && qTech.rows && qTech.rows[0] && qTech.rows[0].name) {
        updatedTechName = qTech.rows[0].name;
      }
    } catch {
      // ignore
    }

    if (technicianId && lab) {
      const tech = memoryDb.tables.users.find((u) => u.id === technicianId);
      if (tech) updatedTechName = tech.name;
    }

    res.json({
      message: 'Lab technician assignment updated',
      lab: {
        id,
        technicianId: technicianId || null,
        technician_id: technicianId || null,
        technicianName: updatedTechName,
      },
    });
  };

  // Support both PATCH /api/v1/labs/:id and PATCH /api/v1/labs/:id/technician
  router.patch('/api/v1/labs/:id', updateLabHandler);
  router.patch('/api/v1/labs/:id/technician', updateLabHandler);

  // DELETE /api/v1/labs/:id
  router.delete('/api/v1/labs/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await query('DELETE FROM labs WHERE id = $1', [id]);
    } catch {
      // ignore
    }

    const idx = memoryDb.tables.labs.findIndex((l) => l.id === id);
    if (idx !== -1) {
      memoryDb.tables.labs.splice(idx, 1);
    }
    res.json({ message: 'Lab removed successfully' });
  });
}
