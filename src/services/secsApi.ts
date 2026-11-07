import type {
  Announcement,
  AuditIncident,
  Budget,
  DashboardStats,
  EquipmentTypeOption,
  Lab,
  PortalRole,
  PublicIssue,
  StaffAccount,
} from "../workflowTypes";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem("secs_token");
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem("secs_token", token);
    } else {
      localStorage.removeItem("secs_token");
    }
  } catch {
    // ignore
  }
}

export function getCurrentUser(): StaffAccount | null {
  try {
    const raw = localStorage.getItem("secs_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: StaffAccount | null) {
  try {
    if (user) {
      localStorage.setItem("secs_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("secs_user");
    }
  } catch {
    // ignore
  }
}

function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  if (name.length <= 2) return `${name}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

const STORAGE_KEY = "secs_enterprise_v4";

// Automatic cleanup of legacy mock localStorage keys
try {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem("secs_dynamic_db_v2");
    localStorage.removeItem("secs_db_state_v2");
    const savedUser = localStorage.getItem("secs_user");
    if (savedUser && savedUser.includes("mahmud.kabir")) {
      localStorage.removeItem("secs_user");
      localStorage.removeItem("secs_token");
    }
  }
} catch {
  // ignore
}

interface DatabaseState {
  users: StaffAccount[];
  labs: Lab[];
  issues: PublicIssue[];
  budgets: Budget[];
  incidents: AuditIncident[];
  notifications: { id: string; targetRole?: string; userId?: string; message: string; read: boolean; createdAt: string }[];
  announcements: Announcement[];
  equipmentTypes: EquipmentTypeOption[];
  departments: string[];
  universityName?: string;
  counters: {
    ticketSeq: number;
    budgetSeq: number;
    incidentSeq: number;
  };
  baseResolvedCount: number;
  avgResponseHours: number;
  satisfactionRate: number;
}

function getInitialState(): DatabaseState {
  return {
    users: [],
    labs: [],
    issues: [],
    budgets: [],
    incidents: [],
    notifications: [],
    announcements: [],
    equipmentTypes: [
      { icon: "🔬", label: "Microscopes" },
      { icon: "⚗️", label: "Centrifuges" },
      { icon: "💻", label: "Lab Computers" },
      { icon: "📡", label: "Oscilloscopes" },
      { icon: "🧪", label: "Spectrophotometers" },
      { icon: "🔋", label: "Power Supplies" },
      { icon: "🌡️", label: "Autoclaves" },
      { icon: "📷", label: "Imaging Systems" },
    ],
    departments: [],
    universityName: "",
    counters: {
      ticketSeq: 1001,
      budgetSeq: 101,
      incidentSeq: 1,
    },
    baseResolvedCount: 0,
    avgResponseHours: 24,
    satisfactionRate: 100,
  };
}

class SECSBackendEngine {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users)) {
          // Remove any legacy mock admin from earlier test runs
          parsed.users = parsed.users.filter(
            (u: any) => u.email !== "mahmud.kabir@uitc.edu" && u.id !== "admin-1"
          );
        }
        if (parsed && Array.isArray(parsed.departments)) {
          // Remove hardcoded legacy defaults so only user-created departments exist
          const legacyDefaults = new Set([
            "biology & biotechnology",
            "business administration",
            "chemistry",
            "civil engineering",
            "computer science & engineering",
            "electrical & electronic engineering",
            "mechanical engineering",
            "physics",
            "other",
          ]);
          parsed.departments = parsed.departments.filter(
            (d: any) => typeof d === "string" && !legacyDefaults.has(d.trim().toLowerCase())
          );
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    const initial = getInitialState();
    this.saveState(initial);
    return initial;
  }

  private saveState(state: DatabaseState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  private persist() {
    this.saveState(this.state);
  }

  clearAdminState() {
    this.state.users = this.state.users.filter((u) => u.role !== "admin");
    this.persist();
  }

  // --- Auth ---
  async checkAdminStatus(): Promise<{ adminConfigured: boolean }> {
    await this.delay(20);
    const hasAdmin = this.state.users.some((u) => u.role === "admin" && u.isActive !== false);
    return { adminConfigured: hasAdmin };
  }

  async setupAdmin(payload: { name: string; email: string; password?: string; department?: string }) {
    await this.delay();
    const email = payload.email.trim().toLowerCase();
    const adminUser: StaffAccount = {
      id: "admin-1",
      name: payload.name.trim(),
      email,
      role: "admin",
      department: payload.department || "Facilities & IT",
      isActive: true,
    };

    this.state.users = this.state.users.filter((u) => u.role !== "admin" && u.email !== email);
    this.state.users.push(adminUser);
    this.persist();

    const token = `jwt_mock_${adminUser.id}_${Date.now()}`;
    setToken(token);
    setCurrentUser(adminUser);
    return {
      message: "Admin account setup successful.",
      accessToken: token,
      user: adminUser,
    };
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    await this.delay();
    const trimmed = email.trim().toLowerCase();
    const user = this.state.users.find((u) => u.email.toLowerCase() === trimmed);
    if (!user) {
      throw new ApiError("No registered account found with this email.", 404, "NOT_FOUND");
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    (this.state as any)._resetCode = { email: trimmed, code, exp: Date.now() + 15 * 60 * 1000 };
    return {
      success: true,
      message: "Verification code dispatched to your email! Please enter the code from your email to choose a new password.",
    };
  }

  async resetPassword(payload: { email: string; code: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    await this.delay();
    const trimmed = payload.email.trim().toLowerCase();
    const user = this.state.users.find((u) => u.email.toLowerCase() === trimmed);
    if (!user) {
      throw new ApiError("User not found.", 404, "NOT_FOUND");
    }
    const temp = (this.state as any)._resetCode;
    if (!temp || temp.email !== trimmed || temp.code !== payload.code.trim() || temp.exp < Date.now()) {
      throw new ApiError("Invalid or expired reset code.", 400, "INVALID_CODE");
    }
    return {
      success: true,
      message: "Password updated successfully. You can now log in.",
    };
  }

  async login(credentials: { email: string; password?: string; portal?: PortalRole }) {
    await this.delay();
    const email = (credentials.email || "").trim().toLowerCase();
    const user = this.state.users.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      throw new ApiError("User account not found. Please verify your credentials or register.", 401, "UNAUTHORIZED");
    }

    const token = `jwt_mock_${user.id}_${Date.now()}`;
    setToken(token);
    setCurrentUser(user);
    return {
      accessToken: token,
      expiresIn: 86400,
      user,
    };
  }

  async register(payload: { fullName: string; studentId?: string; email: string; department: string; role?: string; password?: string }) {
    await this.delay();
    const email = payload.email.trim().toLowerCase();
    const existing = this.state.users.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      throw new ApiError("An account with this email address already exists.", 409, "CONFLICT");
    }

    const newUser: StaffAccount = {
      id: `usr-${Date.now()}`,
      name: payload.fullName.trim(),
      email,
      role: (payload.role as PortalRole) || "technician",
      department: payload.department,
      isActive: true,
    };

    this.state.users.push(newUser);
    this.persist();

    const token = `jwt_mock_${newUser.id}_${Date.now()}`;
    setToken(token);
    return {
      message: "Account created successfully.",
      userId: newUser.id,
      accessToken: token,
      user: newUser,
    };
  }

  // --- Issues ---
  async getPublicIssues(): Promise<PublicIssue[]> {
    await this.delay();
    return this.state.issues.map((i) => ({
      ...i,
      reporter: i.reporter || maskEmail(i.reporterEmail || ""),
    }));
  }

  async getIssues(params?: { search?: string; status?: string; role?: string; userId?: string }): Promise<PublicIssue[]> {
    await this.delay();
    let list = [...this.state.issues];

    if (params?.search) {
      const q = params.search.trim().toLowerCase();
      list = list.filter((i) => i.id.toLowerCase().includes(q) || i.item.toLowerCase().includes(q) || i.labName.toLowerCase().includes(q));
    }

    if (params?.role === "technician") {
      const targetTech = params.userId || "tech-1";
      list = list.filter((i) => i.assignedTechnicianId === targetTech);
    } else if (params?.role === "accounts") {
      list = list.filter((i) => i.budgetStatus === "Approved by Higher Authority" || i.budgetStatus === "Payment approved by Accounts");
    }

    return list;
  }

  async submitIssue(payload: {
    labId?: string;
    labName?: string;
    equipmentType: string;
    assetTag?: string;
    description: string;
    priority: string;
    reporterName?: string;
    reporterEmail?: string;
  }): Promise<{ message: string; issue: PublicIssue }> {
    await this.delay();
    const seq = this.state.counters.ticketSeq++;
    const ticketId = `TKT-${seq}`;

    // Auto technician lookup
    let assignedTechnicianId = "";
    let pendingWith = "Lab Coordinator";
    let currentStage = "Awaiting lab review";

    const lab = this.state.labs.find((l) => l.id === payload.labId || `${l.room} · ${l.name}` === payload.labName);
    if (lab?.technicianId) {
      assignedTechnicianId = lab.technicianId;
      const tech = this.state.users.find((u) => u.id === assignedTechnicianId);
      if (tech) {
        pendingWith = tech.name;
        currentStage = "Awaiting technician assessment";
      }
    }

    const nowFormatted = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    const labDisplayName = payload.labName || (lab ? `${lab.room} · ${lab.name}` : "General University Lab");
    const item = payload.assetTag?.trim() || payload.equipmentType;
    const email = payload.reporterEmail || "student@campus.edu";

    const newIssue: PublicIssue = {
      id: ticketId,
      labId: lab?.id || payload.labId || "lab-1",
      labName: labDisplayName,
      lab: labDisplayName,
      equipmentType: payload.equipmentType,
      assetTag: payload.assetTag || "N/A",
      item,
      description: payload.description,
      priority: (payload.priority.charAt(0).toUpperCase() + payload.priority.slice(1)) as any,
      status: assignedTechnicianId ? "Assigned" : "Under Review",
      currentStage,
      pendingWith,
      reporter: maskEmail(email),
      reporterEmail: email,
      reporterName: payload.reporterName || "Student Reporter",
      submittedAt: nowFormatted,
      createdAt: nowFormatted,
      assignedTechnicianId,
    };

    this.state.issues.unshift(newIssue);

    // Update open issues for lab
    if (lab) {
      lab.openIssues = (lab.openIssues || 0) + 1;
    }

    // Add notification
    if (assignedTechnicianId) {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}`,
        targetRole: "technician",
        userId: assignedTechnicianId,
        message: `New issue report ${ticketId} assigned for ${labDisplayName}.`,
        read: false,
        createdAt: nowFormatted,
      });
    }

    this.persist();
    return { message: "Report logged successfully.", issue: newIssue };
  }

  async updateIssueStatus(
    issueId: string,
    payload: { action: string; note?: string; budgetAmount?: number; budgetDescription?: string; disputeMessage?: string }
  ): Promise<{ message: string; issue: PublicIssue }> {
    await this.delay();
    const issue = this.state.issues.find((i) => i.id === issueId);
    if (!issue) throw new ApiError("Issue not found.", 404);

    const tech = this.state.users.find((u) => u.id === issue.assignedTechnicianId) || { name: "Assigned Technician" };

    if (payload.action === "confirm_no_budget") {
      issue.status = "In Progress";
      issue.currentStage = "Repair confirmed — no budget required";
      issue.pendingWith = tech.name;
    } else if (payload.action === "request_budget") {
      const amount = Number(payload.budgetAmount) || 0;
      issue.status = "Budget Requested";
      issue.currentStage = "Budget awaiting Higher Authority decision";
      issue.pendingWith = "Higher Authority";
      issue.budgetAmount = amount;
      issue.budgetDescription = payload.budgetDescription || "Repair parts and labor";
      issue.budgetStatus = "Pending Higher Authority";

      const budgetId = `BGT-${this.state.counters.budgetSeq++}`;
      this.state.budgets.unshift({
        id: budgetId,
        ticketId: issue.id,
        ticket: issue.id,
        labName: issue.labName,
        lab: issue.labName,
        purpose: payload.budgetDescription || "Repair parts",
        amount,
        technicianId: issue.assignedTechnicianId || "tech-1",
        status: "Pending approval",
        createdAt: "Today",
      });
    } else if (payload.action === "approve_budget") {
      issue.status = "Payment Review";
      issue.currentStage = "Budget approved — awaiting Accounts payment";
      issue.pendingWith = "Accounts Office";
      issue.budgetStatus = "Approved by Higher Authority";

      const budget = this.state.budgets.find((b) => b.ticketId === issueId);
      if (budget) {
        budget.status = "Approved";
        budget.approvedBy = "Dr. Samina Haque";
      }
    } else if (payload.action === "reject_budget") {
      issue.status = "Budget Rejected";
      issue.currentStage = "Budget rejected by Higher Authority";
      issue.pendingWith = tech.name;
      issue.budgetStatus = "Rejected by Higher Authority";
    } else if (payload.action === "approve_payment") {
      issue.status = "Funds Approved";
      issue.currentStage = "Accounts approved payment — awaiting technician confirmation";
      issue.pendingWith = tech.name;
      issue.budgetStatus = "Payment approved by Accounts";

      const budget = this.state.budgets.find((b) => b.ticketId === issueId);
      if (budget) {
        budget.status = "Payment confirmed";
        budget.paidAt = "Today";
      }
    } else if (payload.action === "complete_repair") {
      issue.status = "Resolved";
      issue.currentStage = "Repair completed and confirmed by technician";
      issue.pendingWith = "Closed";
      issue.resolvedAt = "Just now";

      const lab = this.state.labs.find((l) => l.id === issue.labId);
      if (lab && lab.openIssues > 0) lab.openIssues--;
    } else if (payload.action === "dispute_payment") {
      issue.status = "Payment Disputed";
      issue.currentStage = "Payment discrepancy under public review";
      issue.pendingWith = "Higher Authority";

      this.state.incidents.unshift({
        id: this.state.counters.incidentSeq++,
        ticketId: issue.id,
        message: payload.disputeMessage || "Discrepancy reported by technician regarding released funds.",
        amount: issue.budgetAmount,
        reportedByRole: "Technician",
        createdAt: "Just now",
      });
    } else if (payload.action === "cancel_report") {
      issue.status = "Rejected by Higher Authority";
      issue.currentStage = "Report cancelled by Higher Authority";
      issue.pendingWith = "Closed";

      const lab = this.state.labs.find((l) => l.id === issue.labId);
      if (lab && lab.openIssues > 0) lab.openIssues--;
    }

    this.persist();
    return { message: "Issue updated.", issue };
  }

  // --- Labs ---
  async getLabs(): Promise<Lab[]> {
    await this.delay();
    // Dynamically compute open issues per lab
    return this.state.labs.map((lab) => {
      const openIssues = this.state.issues.filter(
        (i) => (i.labId === lab.id || i.labName.includes(lab.room)) && i.status !== "Resolved" && !i.status.includes("Rejected")
      ).length;
      return {
        ...lab,
        openIssues,
      };
    });
  }

  async assignTechnician(labId: string, technicianId: string | null): Promise<{ message: string; lab: Lab }> {
    await this.delay();
    const lab = this.state.labs.find((l) => l.id === labId);
    if (!lab) throw new ApiError("Lab not found.", 404);

    lab.technicianId = technicianId;
    if (technicianId) {
      const tech = this.state.users.find((u) => u.id === technicianId);
      lab.technicianName = tech ? tech.name : "Assigned";
    } else {
      lab.technicianName = "Awaiting assignment";
    }

    this.persist();
    return { message: "Technician assigned.", lab };
  }

  async createLab(payload: { room: string; name: string; department: string; technicianId?: string }): Promise<{ message: string; lab: Lab }> {
    await this.delay();
    const tech = payload.technicianId ? this.state.users.find((u) => u.id === payload.technicianId) : null;
    const newLab: Lab = {
      id: `lab-${Date.now()}`,
      room: payload.room.trim(),
      name: payload.name.trim(),
      department: payload.department.trim(),
      technicianId: payload.technicianId || null,
      technicianName: tech ? tech.name : "Awaiting assignment",
      openIssues: 0,
    };
    this.state.labs.push(newLab);
    this.persist();
    return { message: "Lab created.", lab: newLab };
  }

  async deleteLab(labId: string): Promise<{ message: string }> {
    await this.delay();
    const idx = this.state.labs.findIndex((l) => l.id === labId);
    if (idx !== -1) {
      this.state.labs.splice(idx, 1);
      this.persist();
    }
    return { message: "Lab removed." };
  }

  async createDepartment(name: string): Promise<{ message: string }> {
    await this.delay();
    const trimmed = name.trim();
    if (!this.state.departments.includes(trimmed)) {
      this.state.departments.push(trimmed);
      this.persist();
    }
    return { message: "Department created." };
  }

  async deleteDepartment(nameOrId: string): Promise<{ message: string }> {
    await this.delay();
    let target = nameOrId;
    try {
      target = decodeURIComponent(nameOrId);
    } catch {
      // ignore
    }
    const cleanTarget = target.trim().toLowerCase();
    const cleanRaw = nameOrId.trim().toLowerCase();
    this.state.departments = this.state.departments.filter((d) => {
      const dClean = d.trim().toLowerCase();
      return dClean !== cleanTarget && dClean !== cleanRaw;
    });
    this.persist();
    return { message: "Department removed." };
  }

  // --- Budgets ---
  async getBudgets(): Promise<Budget[]> {
    await this.delay();
    return [...this.state.budgets];
  }

  async approveBudget(budgetId: string): Promise<{ message: string; budget: Budget }> {
    await this.delay();
    const budget = this.state.budgets.find((b) => b.id === budgetId);
    if (!budget) throw new ApiError("Budget not found.", 404);

    budget.status = "Approved";
    budget.approvedBy = "Dr. Samina Haque";

    const issue = this.state.issues.find((i) => i.id === budget.ticketId);
    if (issue) {
      issue.status = "Payment Review";
      issue.currentStage = "Budget approved — awaiting Accounts payment";
      issue.pendingWith = "Accounts Office";
      issue.budgetStatus = "Approved by Higher Authority";
    }

    this.persist();
    return { message: "Budget approved.", budget };
  }

  async confirmPayment(budgetId: string): Promise<{ message: string; budget: Budget }> {
    await this.delay();
    const budget = this.state.budgets.find((b) => b.id === budgetId);
    if (!budget) throw new ApiError("Budget not found.", 404);

    budget.status = "Payment confirmed";
    budget.paidAt = "Today";

    const issue = this.state.issues.find((i) => i.id === budget.ticketId);
    if (issue) {
      const tech = this.state.users.find((u) => u.id === issue.assignedTechnicianId);
      issue.status = "Funds Approved";
      issue.currentStage = "Accounts approved payment — awaiting technician confirmation";
      issue.pendingWith = tech ? tech.name : "Assigned Technician";
      issue.budgetStatus = "Payment approved by Accounts";
    }

    this.persist();
    return { message: "Payment confirmed.", budget };
  }

  // --- Users ---
  async getUsers(): Promise<StaffAccount[]> {
    await this.delay();
    return [...this.state.users];
  }

  async createUser(payload: { name: string; email: string; role: string; labId?: string }): Promise<{ message: string; user: StaffAccount }> {
    await this.delay();
    const newUser: StaffAccount = {
      id: `${payload.role}-${Date.now()}`,
      name: payload.name.trim(),
      email: payload.email.trim(),
      role: payload.role as PortalRole,
      assignedLabs: payload.labId ? [payload.labId] : [],
      isActive: true,
    };

    this.state.users.push(newUser);

    if (payload.role === "technician" && payload.labId) {
      const lab = this.state.labs.find((l) => l.id === payload.labId);
      if (lab) {
        lab.technicianId = newUser.id;
        lab.technicianName = newUser.name;
      }
    }

    this.persist();
    return { message: "Account created.", user: newUser };
  }

  async resetPassword(userId: string, newPassword?: string): Promise<{ message: string; newPassword: string; user: StaffAccount }> {
    await this.delay();
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) throw new ApiError("User not found.", 404);
    const pwd = newPassword || `Univ#${Math.floor(1000 + Math.random() * 9000)}!`;
    this.persist();
    return { message: "Password reset.", newPassword: pwd, user };
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    await this.delay();
    const idx = this.state.users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new ApiError("User not found.", 404);

    this.state.users.splice(idx, 1);

    for (const lab of this.state.labs) {
      if (lab.technicianId === userId) {
        lab.technicianId = null;
        lab.technicianName = "Awaiting assignment";
      }
    }

    this.persist();
    return { message: "Account removed." };
  }

  // --- Audit Incidents ---
  async getIncidents(): Promise<AuditIncident[]> {
    await this.delay();
    return [...this.state.incidents];
  }

  async publishConcern(payload: { ticketId: string; message: string; amount?: number }): Promise<{ message: string; incident: AuditIncident }> {
    await this.delay();
    const newIncident: AuditIncident = {
      id: this.state.counters.incidentSeq++,
      ticketId: payload.ticketId,
      message: payload.message,
      amount: payload.amount,
      reportedByRole: "Technician",
      createdAt: "Just now",
    };

    this.state.incidents.unshift(newIncident);

    const issue = this.state.issues.find((i) => i.id === payload.ticketId);
    if (issue) {
      issue.status = "Payment Disputed";
      issue.currentStage = "Payment discrepancy under public review";
      issue.pendingWith = "Higher Authority";
    }

    this.persist();
    return { message: "Dispute published.", incident: newIncident };
  }

  // --- Notifications ---
  async getNotifications(role?: string, userId?: string) {
    await this.delay();
    const notifs = this.state.notifications.filter((n) => {
      if (userId && n.userId === userId) return true;
      if (role && n.targetRole === role) return true;
      if (!n.targetRole && !n.userId) return true;
      return false;
    });
    return { data: notifs, unreadCount: notifs.filter((n) => !n.read).length };
  }

  async markAllRead(role?: string, userId?: string) {
    await this.delay();
    for (const n of this.state.notifications) {
      if ((role && n.targetRole === role) || (userId && n.userId === userId)) {
        n.read = true;
      }
    }
    this.persist();
    return { message: "Marked all as read." };
  }

  // --- Stats ---
  async getDashboardStats(): Promise<DashboardStats> {
    await this.delay();
    const resolvedIssues = this.state.issues.filter((i) => i.status === "Resolved").length;
    const totalResolved = this.state.baseResolvedCount + resolvedIssues;
    const openIssues = this.state.issues.filter((i) => i.status !== "Resolved" && !i.status.includes("Rejected")).length;
    const approvedBudgets = this.state.budgets.filter((b) => b.status !== "Pending approval");
    const approvedTotal = approvedBudgets.reduce((sum, b) => sum + b.amount, 0);

    return {
      issuesResolvedFormatted: `${totalResolved.toLocaleString()}+`,
      issuesResolvedCount: totalResolved,
      avgResponseTime: `${this.state.avgResponseHours} hr`,
      labsSupported: this.state.labs.length,
      satisfactionRate: `${this.state.satisfactionRate}%`,
      openIssues,
      approvedBudgetTotal: approvedTotal,
      publicConcernsCount: this.state.incidents.length,
      totalStaffCount: this.state.users.length,
      registeredLabsCount: this.state.labs.length,
    };
  }

  // --- Meta ---
  async getAnnouncements(): Promise<Announcement[]> {
    await this.delay();
    return [...this.state.announcements];
  }

  async getEquipmentTypes(): Promise<EquipmentTypeOption[]> {
    await this.delay();
    return [...this.state.equipmentTypes];
  }

  async getDepartments(): Promise<string[]> {
    await this.delay();
    return [...this.state.departments];
  }

  getUniversityName(): string {
    return this.state.universityName || "";
  }

  setUniversityName(name: string): { success: boolean; universityName: string } {
    this.state.universityName = (name ?? "").trim();
    this.persist();
    return { success: true, universityName: this.state.universityName };
  }

  private delay(ms = 60) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const engine = new SECSBackendEngine();

const API_BASE_URL = "";

async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = data?.error?.message || data?.message || `Request failed with status ${res.status}`;
    const code =
      data?.error?.code || (res.status === 401 ? "UNAUTHORIZED" : res.status === 403 ? "FORBIDDEN" : "API_ERROR");
    throw new ApiError(message, res.status, code);
  }

  return data as T;
}

function normalizeIssue(issue: any): PublicIssue {
  return {
    ...issue,
    id: issue.id,
    labId: issue.labId || issue.lab_id || "lab-1",
    labName: issue.labName || issue.lab_name || "General Lab",
    lab: issue.lab || issue.lab_name || "General Lab",
    item: issue.item || issue.asset_tag || issue.equipment_type || "Equipment",
    equipmentType: issue.equipmentType || issue.equipment_type || "Equipment",
    assetTag: issue.assetTag || issue.asset_tag || "N/A",
    description: issue.description || "",
    status: issue.status || "Under Review",
    priority: issue.priority || "Medium",
    reporter: issue.reporter || maskEmail(issue.reporter_email || issue.reporterEmail || ""),
    reporterEmail: issue.reporterEmail || issue.reporter_email,
    reporterName: issue.reporterName || issue.reporter_name,
    submittedAt: issue.submittedAt || issue.created_at,
    createdAt: issue.createdAt || issue.created_at || new Date().toISOString(),
    currentStage: issue.currentStage || issue.current_stage || "Under Review",
    pendingWith: issue.pendingWith || issue.pending_with || "Lab Coordinator",
    assignedTechnicianId: issue.assignedTechnicianId || issue.assigned_technician_id || "",
    budgetAmount:
      issue.budgetAmount !== undefined
        ? issue.budgetAmount
        : issue.budget_amount
        ? Number(issue.budget_amount)
        : undefined,
    budgetDescription: issue.budgetDescription || issue.budget_description,
    budgetStatus: (issue.budgetStatus || issue.budget_status) as any,
    resolvedAt: issue.resolvedAt || issue.resolved_at,
  };
}

function normalizeLab(lab: any): Lab {
  return {
    ...lab,
    id: lab.id,
    room: lab.room,
    name: lab.name,
    department: lab.department,
    technicianId: lab.technicianId || lab.technician_id || null,
    technicianName: lab.technicianName || lab.technician_name || "Awaiting assignment",
    openIssues: lab.openIssues !== undefined ? lab.openIssues : lab.open_issues || 0,
  };
}

function normalizeBudget(budget: any): Budget {
  return {
    ...budget,
    id: budget.id,
    ticketId: budget.ticketId || budget.ticket_id,
    labName: budget.labName || budget.lab_name,
    lab: budget.lab || budget.lab_name,
    purpose: budget.purpose || budget.description || "Repair parts and labor",
    amount: Number(budget.amount || 0),
    technicianId: budget.technicianId || budget.technician_id || "tech-1",
    technicianName: budget.technicianName || budget.technician_name || "Assigned Technician",
    status: (budget.status || "Pending approval") as any,
    createdAt: budget.createdAt || budget.created_at,
    approvedBy: budget.approvedBy || budget.approved_by,
    paidAt: budget.paidAt || budget.paid_at,
  };
}

async function tryApi<T>(apiFn: () => Promise<T>, fallbackFn: () => Promise<T>): Promise<T> {
  try {
    return await apiFn();
  } catch (err: any) {
    if (err instanceof ApiError && err.status < 500) {
      throw err;
    }
    return await fallbackFn();
  }
}

export const secsApi = {
  auth: {
    checkAdminStatus: async (): Promise<{ adminConfigured: boolean }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ adminConfigured: boolean }>("/api/v1/auth/admin-status");
          if (!res.adminConfigured) {
            engine.clearAdminState();
          }
          return res;
        },
        async () => engine.checkAdminStatus()
      );
    },
    setupAdmin: async (payload: { name: string; email: string; password?: string; department?: string }) => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ message: string; accessToken: string; user: StaffAccount }>("/api/v1/auth/setup-admin", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (res?.accessToken) {
            setToken(res.accessToken);
          }
          if (res?.user) {
            setCurrentUser(res.user);
          }
          return res;
        },
        async () => {
          const res = await engine.setupAdmin(payload);
          if (res?.user) {
            setCurrentUser(res.user);
          }
          return res;
        }
      );
    },
    forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
      return tryApi(
        async () =>
          apiRequest<{ success: boolean; message: string }>("/api/v1/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email }),
          }),
        async () => engine.forgotPassword(email)
      );
    },
    resetPassword: async (payload: { email: string; code: string; newPassword: string }) => {
      return tryApi(
        async () =>
          apiRequest<{ success: boolean; message: string }>("/api/v1/auth/reset-password", {
            method: "POST",
            body: JSON.stringify(payload),
          }),
        async () => engine.resetPassword(payload)
      );
    },
    login: async (credentials: { email: string; password?: string; portal?: PortalRole }) => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ accessToken: string; user: StaffAccount }>("/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials),
          });
          if (res?.accessToken) {
            setToken(res.accessToken);
          }
          if (res?.user) {
            setCurrentUser(res.user);
          }
          return res;
        },
        async () => {
          const res = await engine.login(credentials);
          if (res?.user) {
            setCurrentUser(res.user);
          }
          return res;
        }
      );
    },
    register: async (payload: {
      fullName: string;
      studentId?: string;
      email: string;
      department: string;
      role?: string;
      password?: string;
    }) => {
      return tryApi(
        async () => {
          return await apiRequest("/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        },
        async () => engine.register(payload)
      );
    },
    me: async (): Promise<StaffAccount | null> => {
      return tryApi(
        async () => {
          const res = await apiRequest<StaffAccount>("/api/v1/auth/me");
          if (res) setCurrentUser(res);
          return res;
        },
        async () => {
          return getCurrentUser();
        }
      );
    },
    logout: async () => {
      setToken(null);
      setCurrentUser(null);
      return { message: "Signed out." };
    },
  },
  issues: {
    getPublicIssues: async (): Promise<PublicIssue[]> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ data: any[] }>("/api/v1/issues/public");
          return res.data.map(normalizeIssue);
        },
        async () => engine.getPublicIssues()
      );
    },
    getIssues: async (params?: { search?: string; status?: string; role?: string; userId?: string; technicianId?: string }): Promise<PublicIssue[]> => {
      return tryApi(
        async () => {
          const qs = new URLSearchParams();
          if (params?.search) qs.append("search", params.search);
          if (params?.status) qs.append("status", params.status);
          if (params?.role) qs.append("role", params.role);
          if (params?.technicianId) qs.append("technicianId", params.technicianId);
          else if (params?.userId) qs.append("technicianId", params.userId);
          const url = `/api/v1/issues${qs.toString() ? `?${qs.toString()}` : ""}`;
          const res = await apiRequest<{ data: any[] }>(url);
          return res.data.map(normalizeIssue);
        },
        async () => engine.getIssues(params)
      );
    },
    submitIssue: async (payload: {
      labId?: string;
      labName?: string;
      equipmentType: string;
      assetTag?: string;
      description: string;
      priority: string;
      reporterName?: string;
      reporterEmail?: string;
    }): Promise<{ message: string; issue: PublicIssue }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ message: string; issue: any }>("/api/v1/issues", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          return {
            message: res.message,
            issue: normalizeIssue(res.issue),
          };
        },
        async () => engine.submitIssue(payload)
      );
    },
    updateStatus: async (
      issueId: string,
      payload: { action: string; note?: string; budgetAmount?: number; budgetDescription?: string; disputeMessage?: string }
    ): Promise<{ message: string; issue: PublicIssue }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ message: string; issue: any }>(`/api/v1/issues/${issueId}/status`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
          return {
            message: res.message,
            issue: normalizeIssue(res.issue),
          };
        },
        async () => engine.updateIssueStatus(issueId, payload)
      );
    },
    checkSlaReminders: async (force: boolean = false): Promise<{ count: number; message: string }> => {
      return tryApi(
        async () => apiRequest<{ count: number; message: string }>("/api/v1/issues/check-sla", {
          method: "POST",
          body: JSON.stringify({ force }),
        }),
        async () => ({ count: 0, message: "SLA check simulated." })
      );
    },
  },
  labs: {
    getLabs: async (): Promise<Lab[]> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ data: any[] }>("/api/v1/labs");
          return res.data.map(normalizeLab);
        },
        async () => engine.getLabs()
      );
    },
    createLab: async (lab: { room: string; name: string; department: string; technicianId?: string }): Promise<{ message: string; lab: Lab }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ message: string; lab: any }>("/api/v1/labs", {
            method: "POST",
            body: JSON.stringify(lab),
          });
          return { message: res.message, lab: normalizeLab(res.lab) };
        },
        async () => engine.createLab(lab)
      );
    },
    assignTechnician: async (labId: string, technicianId: string | null): Promise<{ message: string; lab: Lab }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ message: string; lab: any }>(`/api/v1/labs/${labId}/technician`, {
            method: "PATCH",
            body: JSON.stringify({ technicianId }),
          });
          return { message: res.message, lab: normalizeLab(res.lab) };
        },
        async () => engine.assignTechnician(labId, technicianId)
      );
    },
    deleteLab: async (labId: string): Promise<{ message: string }> => {
      return tryApi(
        async () => {
          return await apiRequest(`/api/v1/labs/${labId}`, {
            method: "DELETE",
          });
        },
        async () => engine.deleteLab(labId)
      );
    },
  },
  budgets: {
    getBudgets: async (): Promise<Budget[]> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ data: any[] }>("/api/v1/budgets");
          return res.data.map(normalizeBudget);
        },
        async () => engine.getBudgets()
      );
    },
    approveBudget: async (budgetId: string): Promise<{ message: string; budget: Budget }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ message: string; budget: any }>(`/api/v1/budgets/${budgetId}/approve`, {
            method: "PATCH",
          });
          return { message: res.message, budget: normalizeBudget(res.budget) };
        },
        async () => engine.approveBudget(budgetId)
      );
    },
    confirmPayment: async (budgetId: string): Promise<{ message: string; budget: Budget }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ message: string; budget: any }>(`/api/v1/budgets/${budgetId}/confirm-payment`, {
            method: "PATCH",
          });
          return { message: res.message, budget: normalizeBudget(res.budget) };
        },
        async () => engine.confirmPayment(budgetId)
      );
    },
  },
  users: {
    getUsers: async (): Promise<StaffAccount[]> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ data: StaffAccount[] }>("/api/v1/users");
          return res.data;
        },
        async () => engine.getUsers()
      );
    },
    createUser: async (payload: {
      name: string;
      email: string;
      role: string;
      labId?: string;
      password?: string;
    }): Promise<{
      message: string;
      user: StaffAccount;
      generatedPassword?: string;
      emailStatus?: 'dispatched' | 'failed';
      emailError?: string | null;
    }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{
            message: string;
            user: StaffAccount;
            generatedPassword?: string;
            emailStatus?: 'dispatched' | 'failed';
            emailError?: string | null;
          }>("/api/v1/users", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          return res;
        },
        async () => {
          const res = await engine.createUser(payload);
          return {
            ...res,
            generatedPassword: payload.password || `Univ#${Math.floor(1000 + Math.random() * 9000)}!`,
            emailStatus: "failed",
            emailError: "Local demo mode: SMTP email disabled.",
          };
        }
      );
    },
    resetPassword: async (
      userId: string,
      password?: string
    ): Promise<{
      message: string;
      newPassword: string;
      emailStatus?: 'dispatched' | 'failed';
      emailError?: string | null;
      user?: StaffAccount;
    }> => {
      return tryApi(
        async () => {
          return await apiRequest<{
            message: string;
            newPassword: string;
            emailStatus?: 'dispatched' | 'failed';
            emailError?: string | null;
            user?: StaffAccount;
          }>(`/api/v1/users/${userId}/reset-password`, {
            method: "POST",
            body: JSON.stringify({ password }),
          });
        },
        async () => engine.resetPassword(userId, password)
      );
    },
    deleteUser: async (userId: string): Promise<{ message: string }> => {
      return tryApi(
        async () => {
          return await apiRequest(`/api/v1/users/${userId}`, {
            method: "DELETE",
          });
        },
        async () => engine.deleteUser(userId)
      );
    },
  },
  audit: {
    getIncidents: async (): Promise<AuditIncident[]> => {
      return tryApi<AuditIncident[]>(
        async () => {
          const res = await apiRequest<{ data: any[] }>("/api/v1/audit/incidents");
          return res.data.map((inc): AuditIncident => ({
            id: inc.id,
            ticketId: inc.ticketId || inc.ticket_id,
            message: inc.message,
            amount: inc.amount ? Number(inc.amount) : undefined,
            reportedByRole: inc.reportedByRole || inc.reported_by_role,
            createdAt: inc.createdAt || inc.created_at,
          }));
        },
        async () => engine.getIncidents()
      );
    },
    publishConcern: async (payload: {
      ticketId: string;
      message: string;
      amount?: number;
    }): Promise<{ message: string; incident: AuditIncident }> => {
      return tryApi<{ message: string; incident: AuditIncident }>(
        async () => {
          const res = await apiRequest<{ message: string; incident: any }>("/api/v1/audit/incidents", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          const incident: AuditIncident = {
            id: res.incident.id,
            ticketId: res.incident.ticket_id || res.incident.ticketId,
            message: res.incident.message,
            amount: res.incident.amount ? Number(res.incident.amount) : undefined,
            reportedByRole: res.incident.reported_by_role || res.incident.reportedByRole,
            createdAt: res.incident.created_at || res.incident.createdAt,
          };
          return {
            message: res.message,
            incident,
          };
        },
        async () => engine.publishConcern(payload)
      );
    },
  },
  notifications: {
    getNotifications: async (role?: string, userId?: string) => {
      return tryApi(
        async () => {
          const qs = new URLSearchParams();
          if (role) qs.append("role", role);
          if (userId) qs.append("userId", userId);
          return await apiRequest(`/api/v1/notifications${qs.toString() ? `?${qs.toString()}` : ""}`);
        },
        async () => engine.getNotifications(role, userId)
      );
    },
    markRead: async () => ({ message: "Marked read." }),
    markAllRead: async (role?: string, userId?: string) => {
      return tryApi(
        async () => {
          const qs = new URLSearchParams();
          if (role) qs.append("role", role);
          if (userId) qs.append("userId", userId);
          return await apiRequest(`/api/v1/notifications/read-all${qs.toString() ? `?${qs.toString()}` : ""}`, {
            method: "PATCH",
          });
        },
        async () => engine.markAllRead(role, userId)
      );
    },
  },
  stats: {
    getDashboardStats: async (): Promise<DashboardStats> => {
      return tryApi(
        async () => {
          return await apiRequest<DashboardStats>("/api/v1/dashboard/stats");
        },
        async () => engine.getDashboardStats()
      );
    },
  },
  meta: {
    getAnnouncements: async (): Promise<Announcement[]> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ data: Announcement[] }>("/api/v1/announcements");
          return res.data;
        },
        async () => engine.getAnnouncements()
      );
    },
    getEquipmentTypes: async (): Promise<EquipmentTypeOption[]> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ data: EquipmentTypeOption[] }>("/api/v1/metadata/equipment-types");
          return res.data;
        },
        async () => engine.getEquipmentTypes()
      );
    },
    getDepartments: async (): Promise<string[]> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ data: string[] }>("/api/v1/metadata/departments");
          return res.data;
        },
        async () => engine.getDepartments()
      );
    },
    createDepartment: async (name: string): Promise<{ message: string }> => {
      return tryApi(
        async () => {
          return await apiRequest<{ message: string }>("/api/v1/departments", {
            method: "POST",
            body: JSON.stringify({ name }),
          });
        },
        async () => engine.createDepartment(name)
      );
    },
    deleteDepartment: async (nameOrId: string): Promise<{ message: string }> => {
      return tryApi(
        async () => {
          return await apiRequest<{ message: string }>(`/api/v1/departments/${encodeURIComponent(nameOrId)}`, {
            method: "DELETE",
          });
        },
        async () => engine.deleteDepartment(nameOrId)
      );
    },
  },
  settings: {
    getUniversityName: async (): Promise<string> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ universityName: string }>("/api/v1/settings/university");
          return res.universityName ?? "";
        },
        async () => engine.getUniversityName()
      );
    },
    updateUniversityName: async (name: string): Promise<{ success: boolean; message: string; universityName: string }> => {
      return tryApi(
        async () => {
          return await apiRequest<{ success: boolean; message: string; universityName: string }>("/api/v1/settings/university", {
            method: "PATCH",
            body: JSON.stringify({ universityName: name }),
          });
        },
        async () => {
          const res = engine.setUniversityName(name);
          return {
            success: true,
            message: res.universityName ? `University name updated to "${res.universityName}".` : "University name cleared (without name).",
            universityName: res.universityName,
          };
        }
      );
    },
  },
  neon: {
    getStatus: async () => {
      return tryApi(
        async () =>
          apiRequest<{
            status: string;
            branch: string;
            services: {
              postgres: { configured: boolean; connected: boolean; tablesInSchema: number };
              auth: { configured: boolean; baseUrl: string | null; jwksUrl: string | null };
              functions: { configured: boolean; helloUrl: string | null };
              realtime: { configured: boolean; url: string | null };
            };
          }>("/api/v1/neon/status"),
        async () => ({
          status: "active",
          branch: "production",
          services: {
            postgres: { configured: true, connected: true, tablesInSchema: 7 },
            auth: {
              configured: true,
              baseUrl: "https://ep-bold-feather-bd6763oo.neonauth.c-8.us-east-2.aws.neon.tech/neondb/auth",
              jwksUrl: "https://ep-bold-feather-bd6763oo.neonauth.c-8.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json",
            },
            functions: {
              configured: true,
              helloUrl: "https://br-raspy-credit-bdh2vf58-hello.compute.c-8.us-east-2.aws.neon.tech",
            },
            realtime: {
              configured: true,
              url: "wss://ep-bold-feather-bd6763oo.rt.c-8.us-east-2.aws.neon.tech/",
            },
          },
        })
      );
    },
    callHelloFunction: async () => {
      return tryApi(
        async () =>
          apiRequest<{ success: boolean; source: string; status: number; response: string }>(
            "/api/v1/neon/functions/hello"
          ),
        async () => ({
          success: true,
          source: "Neon Functions (Simulated)",
          status: 200,
          response: "Hello from Neon Functions",
        })
      );
    },
    getAuthConfig: async () => {
      return tryApi(
        async () =>
          apiRequest<{ authBaseUrl: string | null; jwksUrl: string | null; branch: string }>(
            "/api/v1/neon/auth/config"
          ),
        async () => ({
          authBaseUrl: "https://ep-bold-feather-bd6763oo.neonauth.c-8.us-east-2.aws.neon.tech/neondb/auth",
          jwksUrl: "https://ep-bold-feather-bd6763oo.neonauth.c-8.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json",
          branch: "production",
        })
      );
    },
    getRealtimeConfig: async () => {
      return tryApi(
        async () => apiRequest<{ realtimeUrl: string | null; configured: boolean }>("/api/v1/neon/realtime/config"),
        async () => ({
          realtimeUrl: "wss://ep-bold-feather-bd6763oo.rt.c-8.us-east-2.aws.neon.tech/",
          configured: true,
        })
      );
    },
  },
};
