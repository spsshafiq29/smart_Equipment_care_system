-- =============================================================================
-- SMART EQUIPMENT CARE SYSTEM (SECS) — POSTGRESQL SEEDS
-- =============================================================================

-- Passwords hashed with SHA-256:
-- Admin@123   -> e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7
-- Auth@123    -> c9961c6e598a0cc4916113c39e117040af4f3b7c1dac5f1bb8cfae636b49967e
-- Acct@123    -> a1db2c9b17943dbb756dfb43c8dbda2658a550795daeffdcc89684d8981c36b5
-- Tech@123    -> ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99
-- Student@123 -> b2a1f4fd0a460606b34c8913e2981dac8d2e283d778aba586c416ee2629bfa54

INSERT INTO users (id, name, email, password_hash, role, department, student_id, is_active) VALUES
('admin-1', 'Mahmud Kabir', 'mahmud.kabir@uitc.edu', 'e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7', 'admin', 'Facilities & IT', NULL, TRUE),
('authority-1', 'Dr. Samina Haque', 'samina.haque@uitc.edu', 'c9961c6e598a0cc4916113c39e117040af4f3b7c1dac5f1bb8cfae636b49967e', 'authority', 'Academic Operations', NULL, TRUE),
('accounts-1', 'Nusrat Islam', 'nusrat.islam@uitc.edu', 'a1db2c9b17943dbb756dfb43c8dbda2658a550795daeffdcc89684d8981c36b5', 'accounts', 'Accounts Office', NULL, TRUE),
('tech-1', 'Ashik Rahman', 'ashik.rahman@uitc.edu', 'ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99', 'technician', 'CSE & EEE', NULL, TRUE),
('tech-2', 'Farhana Islam', 'farhana.islam@uitc.edu', 'ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99', 'technician', 'Physics', NULL, TRUE),
('tech-3', 'Nayeem Hasan', 'nayeem.hasan@uitc.edu', 'ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99', 'technician', 'Chemistry', NULL, TRUE),
('tech-4', 'Sadia Karim', 'sadia.karim@uitc.edu', 'ab38322f1e4ca606045224e90fd3033f8e590bf15917adefdaddf7890ca03d99', 'technician', 'Biology', NULL, TRUE),
('stu-1', 'Sarah Chen', 's.chen@uitc.edu', 'b2a1f4fd0a460606b34c8913e2981dac8d2e283d778aba586c416ee2629bfa54', 'student', 'Computer Science & Engineering', '0432320005101078', TRUE);

INSERT INTO labs (id, room, name, department, technician_id) VALUES
('lab-1', 'CSE-402', 'Networking Lab', 'Computer Science', 'tech-1'),
('lab-2', 'EEE-205', 'Electronics Lab', 'Electrical Engineering', 'tech-1'),
('lab-3', 'PHY-301', 'Optics Lab', 'Physics', 'tech-2'),
('lab-4', 'CHEM-110', 'Analytical Chemistry Lab', 'Chemistry', 'tech-3'),
('lab-5', 'BIO-214', 'Molecular Biology Lab', 'Biology', 'tech-4'),
('lab-6', 'ME-106', 'Thermodynamics Lab', 'Mechanical Engineering', NULL);

INSERT INTO issues (id, lab_id, lab_name, equipment_type, asset_tag, item, description, priority, status, current_stage, pending_with, reporter_id, reporter_email, reporter_name, assigned_technician_id, budget_amount, budget_description, budget_status, resolved_at) VALUES
('TKT-2891', 'lab-1', 'CSE-402 · Networking Lab', 'Lab Computer / Workstation', 'Cisco Switch SW-08', 'Cisco Switch SW-08', 'Port 3 and 7 fail to negotiate 1Gbps link speed and drops packets.', 'High', 'Assigned', 'Awaiting technician assessment', 'Ashik Rahman', 'stu-1', 's.chen@uitc.edu', 'Sarah Chen', 'tech-1', NULL, NULL, NULL, NULL),
('TKT-2890', 'lab-5', 'BIO-214 · Molecular Biology Lab', 'Centrifuge', 'Centrifuge C-14', 'Centrifuge C-14', 'Vibration dampener replaced and tested under 8000 RPM load successfully.', 'Medium', 'Resolved', 'Repair completed', 'Closed', 'stu-1', 'r.ahmed@uitc.edu', 'Rafiq Ahmed', 'tech-4', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('TKT-2887', 'lab-4', 'CHEM-110 · Analytical Chemistry Lab', 'Fume Hood', 'Fume Hood Fan', 'Fume Hood Fan', 'Exhaust motor burned out during acid digestion experiment.', 'High', 'Budget Requested', 'Budget awaiting approval', 'Higher Authority', 'stu-1', 't.hossain@uitc.edu', 'Tanvir Hossain', 'tech-3', 32000.00, 'Replacement motor, coupling and installation cost.', 'Pending Higher Authority', NULL),
('TKT-2884', 'lab-2', 'EEE-205 · Electronics Lab', 'Lab Computer / Workstation', 'Workstation PC-07', 'Workstation PC-07', 'RAM replacement complete and verified with memtest.', 'Low', 'Resolved', 'Repair completed', 'Closed', 'stu-1', 'n.fuad@uitc.edu', 'Nafis Fuad', 'tech-1', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days'),
('TKT-2881', 'lab-2', 'EEE-205 · Electronics Lab', 'Oscilloscope', 'Oscilloscope power module', 'Oscilloscope power module', 'Switch-mode power supply unit capacitor breakdown.', 'Medium', 'Payment Review', 'Approved budget awaiting Accounts', 'Accounts Office', 'stu-1', 'a.talukdar@uitc.edu', 'Abir Talukdar', 'tech-1', 12750.00, 'Power module replacement and calibration.', 'Approved by Higher Authority', NULL);

INSERT INTO budgets (id, ticket_id, lab_name, purpose, amount, technician_id, status, approved_by, paid_at) VALUES
('BGT-1048', 'TKT-2891', 'Networking Lab', 'Cisco switch power module', 18500.00, 'tech-1', 'Approved', 'Dr. Samina Haque', NULL),
('BGT-1047', 'TKT-2887', 'Analytical Chemistry Lab', 'Fume hood motor repair', 32000.00, 'tech-3', 'Pending approval', NULL, NULL),
('BGT-1042', 'TKT-2881', 'Optics Lab', 'Laser alignment kit', 12750.00, 'tech-2', 'Payment confirmed', 'Dr. Samina Haque', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('BGT-1039', 'TKT-2884', 'Electronics Lab', 'Oscilloscope probe set', 8900.00, 'tech-1', 'Payment confirmed', 'Dr. Samina Haque', CURRENT_TIMESTAMP - INTERVAL '5 days');

INSERT INTO audit_incidents (id, ticket_id, message, amount, reported_by_role) VALUES
(1, 'TKT-2884', 'Accounts marked this payment as approved, but the technician reported that the funds were not received.', 8900.00, 'Technician');

INSERT INTO notifications (id, user_id, target_role, message, read, related_issue_id) VALUES
('notif-1', 'tech-1', 'technician', 'Higher Authority approved budget of ৳18,500 for Cisco switch repair.', FALSE, 'TKT-2891'),
('notif-2', 'accounts-1', 'accounts', 'Budget BGT-1048 approved by Higher Authority, pending payment release.', FALSE, 'TKT-2891');

INSERT INTO announcements (id, message, active) VALUES
('ann-1', 'Physics Lab 3 oscilloscopes are currently offline for scheduled maintenance. Expected return: 10 Sep 2026.', TRUE);
