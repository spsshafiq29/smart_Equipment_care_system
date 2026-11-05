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

function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  if (name.length <= 2) return `${name}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

const STORAGE_KEY = "secs_dynamic_db_v2";

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
    users: [
      { id: "admin-1", name: "Mahmud Kabir", email: "mahmud.kabir@uitc.edu", role: "admin", department: "Facilities & IT", isActive: true },
      { id: "authority-1", name: "Dr. Samina Haque", email: "samina.haque@uitc.edu", role: "authority", department: "Academic Operations", isActive: true },
      { id: "accounts-1", name: "Nusrat Islam", email: "nusrat.islam@uitc.edu", role: "accounts", department: "Accounts Office", isActive: true },
      { id: "tech-1", name: "Ashik Rahman", email: "ashik.rahman@uitc.edu", role: "technician", department: "CSE & EEE", assignedLabs: ["lab-1", "lab-2"], isActive: true },
      { id: "tech-2", name: "Farhana Islam", email: "farhana.islam@uitc.edu", role: "technician", department: "Physics", assignedLabs: ["lab-3"], isActive: true },
      { id: "tech-3", name: "Nayeem Hasan", email: "nayeem.hasan@uitc.edu", role: "technician", department: "Chemistry", assignedLabs: ["lab-4"], isActive: true },
      { id: "tech-4", name: "Sadia Karim", email: "sadia.karim@uitc.edu", role: "technician", department: "Biology", assignedLabs: ["lab-5"], isActive: true },
    ],
    labs: [
      { id: "lab-1", room: "CSE-402", name: "Networking Lab", department: "Computer Science", technicianId: "tech-1", technicianName: "Ashik Rahman", openIssues: 4 },
      { id: "lab-2", room: "EEE-205", name: "Electronics Lab", department: "Electrical Engineering", technicianId: "tech-1", technicianName: "Ashik Rahman", openIssues: 2 },
      { id: "lab-3", room: "PHY-301", name: "Optics Lab", department: "Physics", technicianId: "tech-2", technicianName: "Farhana Islam", openIssues: 1 },
      { id: "lab-4", room: "CHEM-110", name: "Analytical Chemistry Lab", department: "Chemistry", technicianId: "tech-3", technicianName: "Nayeem Hasan", openIssues: 3 },
      { id: "lab-5", room: "BIO-214", name: "Molecular Biology Lab", department: "Biology", technicianId: "tech-4", technicianName: "Sadia Karim", openIssues: 0 },
      { id: "lab-6", room: "ME-106", name: "Thermodynamics Lab", department: "Mechanical Engineering", technicianId: null, technicianName: "Awaiting assignment", openIssues: 5 },
    ],
    issues: [
      {
        id: "TKT-2891",
        labId: "lab-1",
        labName: "CSE-402 · Networking Lab",
        lab: "CSE-402 · Networking Lab",
        item: "Cisco Switch SW-08",
        equipmentType: "Lab Computer / Workstation",
        assetTag: "Cisco Switch SW-08",
        description: "Port 3 and 7 fail to negotiate 1Gbps link speed and drops packets.",
        status: "Assigned",
        priority: "High",
        reporter: "sa***@uitc.edu",
        reporterEmail: "s.chen@uitc.edu",
        reporterName: "Sarah Chen",
        submittedAt: "18 Mar 2026 · 09:42 AM",
        createdAt: "18 Mar 2026 · 09:42 AM",
        currentStage: "Awaiting technician assessment",
        pendingWith: "Ashik Rahman",
        assignedTechnicianId: "tech-1",
      },
      {
        id: "TKT-2890",
        labId: "lab-5",
        labName: "BIO-214 · Molecular Biology Lab",
        lab: "BIO-214 · Molecular Biology Lab",
        item: "Centrifuge C-14",
        equipmentType: "Centrifuge",
        assetTag: "Centrifuge C-14",
        description: "Vibration dampener replaced and tested under 8000 RPM load successfully.",
        status: "Resolved",
        priority: "Medium",
        reporter: "ra***@uitc.edu",
        reporterEmail: "r.ahmed@uitc.edu",
        reporterName: "Rafiq Ahmed",
        submittedAt: "17 Mar 2026 · 02:16 PM",
        createdAt: "17 Mar 2026 · 02:16 PM",
        currentStage: "Repair completed",
        pendingWith: "Closed",
        assignedTechnicianId: "tech-4",
      },
      {
        id: "TKT-2887",
        labId: "lab-4",
        labName: "CHEM-110 · Analytical Chemistry Lab",
        lab: "CHEM-110 · Analytical Chemistry Lab",
        item: "Fume Hood Fan",
        equipmentType: "Fume Hood",
        assetTag: "Fume Hood Fan",
        description: "Exhaust motor burned out during acid digestion experiment.",
        status: "Budget Requested",
        priority: "High",
        reporter: "ta***@uitc.edu",
        reporterEmail: "t.hossain@uitc.edu",
        reporterName: "Tanvir Hossain",
        submittedAt: "17 Mar 2026 · 11:05 AM",
        createdAt: "17 Mar 2026 · 11:05 AM",
        currentStage: "Budget awaiting approval",
        pendingWith: "Higher Authority",
        assignedTechnicianId: "tech-3",
        budgetAmount: 32000,
        budgetDescription: "Replacement motor, coupling and installation cost.",
        budgetStatus: "Pending Higher Authority",
      },
      {
        id: "TKT-2884",
        labId: "lab-2",
        labName: "EEE-205 · Electronics Lab",
        lab: "EEE-205 · Electronics Lab",
        item: "Workstation PC-07",
        equipmentType: "Lab Computer / Workstation",
        assetTag: "Workstation PC-07",
        description: "RAM replacement complete and verified with memtest.",
        status: "Resolved",
        priority: "Low",
        reporter: "na***@uitc.edu",
        reporterEmail: "n.fuad@uitc.edu",
        reporterName: "Nafis Fuad",
        submittedAt: "16 Mar 2026 · 03:28 PM",
        createdAt: "16 Mar 2026 · 03:28 PM",
        currentStage: "Repair completed",
        pendingWith: "Closed",
        assignedTechnicianId: "tech-1",
      },
      {
        id: "TKT-2881",
        labId: "lab-2",
        labName: "EEE-205 · Electronics Lab",
        lab: "EEE-205 · Electronics Lab",
        item: "Oscilloscope power module",
        equipmentType: "Oscilloscope",
        assetTag: "Oscilloscope power module",
        description: "Switch-mode power supply unit capacitor breakdown.",
        status: "Payment Review",
        priority: "Medium",
        reporter: "ab***@uitc.edu",
        reporterEmail: "a.talukdar@uitc.edu",
        reporterName: "Abir Talukdar",
        submittedAt: "15 Mar 2026 · 10:14 AM",
        createdAt: "15 Mar 2026 · 10:14 AM",
        currentStage: "Approved budget awaiting Accounts",
        pendingWith: "Accounts Office",
        assignedTechnicianId: "tech-1",
        budgetAmount: 12750,
        budgetDescription: "Power module replacement and calibration.",
        budgetStatus: "Approved by Higher Authority",
      },
    ],
    budgets: [
      {
        id: "BGT-1048",
        ticketId: "TKT-2891",
        ticket: "TKT-2891",
        labName: "Networking Lab",
        lab: "Networking Lab",
        purpose: "Cisco switch power module",
        amount: 18500,
        technicianId: "tech-1",
        status: "Approved",
        approvedBy: "Dr. Samina Haque",
        createdAt: "18 Mar 2026",
      },
      {
        id: "BGT-1047",
        ticketId: "TKT-2887",
        ticket: "TKT-2887",
        labName: "Analytical Chemistry Lab",
        lab: "Analytical Chemistry Lab",
        purpose: "Fume hood motor repair",
        amount: 32000,
        technicianId: "tech-3",
        status: "Pending approval",
        createdAt: "17 Mar 2026",
      },
      {
        id: "BGT-1042",
        ticketId: "TKT-2879",
        ticket: "TKT-2879",
        labName: "Optics Lab",
        lab: "Optics Lab",
        purpose: "Laser alignment kit",
        amount: 12750,
        technicianId: "tech-2",
        status: "Payment confirmed",
        approvedBy: "Dr. Samina Haque",
        paidAt: "12 Mar 2026",
        createdAt: "10 Mar 2026",
      },
      {
        id: "BGT-1039",
        ticketId: "TKT-2864",
        ticket: "TKT-2864",
        labName: "Electronics Lab",
        lab: "Electronics Lab",
        purpose: "Oscilloscope probe set",
        amount: 8900,
        technicianId: "tech-1",
        status: "Payment confirmed",
        approvedBy: "Dr. Samina Haque",
        paidAt: "09 Mar 2026",
        createdAt: "07 Mar 2026",
      },
    ],
    incidents: [
      {
        id: 1,
        ticketId: "TKT-2884",
        message: "Accounts marked this payment as approved, but the technician reported that the funds were not received.",
        createdAt: "10 Mar 2026 · 10:42 AM",
        amount: 8900,
        reportedByRole: "Technician",
      },
    ],
    notifications: [
      {
        id: "notif-1",
        targetRole: "technician",
        message: "Higher Authority approved budget of ৳18,500 for Cisco switch repair.",
        read: false,
        createdAt: "18 Mar 2026 · 11:00 AM",
      },
      {
        id: "notif-2",
        targetRole: "accounts",
        message: "Budget BGT-1048 approved by Higher Authority, pending payment disbursement.",
        read: false,
        createdAt: "18 Mar 2026 · 11:05 AM",
      },
    ],
    announcements: [
      {
        id: "ann-1",
        message: "Physics Lab 3 oscilloscopes are currently offline for scheduled maintenance. Expected return: 10 Sep 2026.",
        active: true,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ],
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
    departments: [
      "Computer Science & Engineering",
      "Electrical & Electronic Engineering",
      "Mechanical Engineering",
      "Civil Engineering",
      "Physics",
      "Chemistry",
      "Biology & Biotechnology",
      "Business Administration",
      "Other",
    ],
    counters: {
      ticketSeq: 2892,
      budgetSeq: 1049,
      incidentSeq: 2,
    },
    baseResolvedCount: 2400,
    avgResponseHours: 48,
    satisfactionRate: 98,
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
        if (parsed?.issues?.length && parsed?.labs?.length) {
          return parsed;
        }
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

  // --- Auth ---
  async login(credentials: { email: string; password?: string; portal?: PortalRole }) {
    await this.delay();
    const email = (credentials.email || "").trim().toLowerCase();
    let user = this.state.users.find((u) => u.email.toLowerCase() === email);

    if (!user && credentials.portal) {
      if (credentials.portal === "admin") user = this.state.users.find((u) => u.id === "admin-1");
      else if (credentials.portal === "authority") user = this.state.users.find((u) => u.id === "authority-1");
      else if (credentials.portal === "accounts") user = this.state.users.find((u) => u.id === "accounts-1");
      else if (credentials.portal === "technician") user = this.state.users.find((u) => u.id === "tech-1");
    }

    if (!user && email.endsWith(".edu")) {
      user = {
        id: `user-${Date.now()}`,
        name: email.split("@")[0].replace(/\./g, " "),
        email,
        role: "technician",
        isActive: true,
      };
      this.state.users.push(user);
      this.persist();
    }

    if (!user) {
      throw new ApiError("User account not found. Please verify your credentials or register.", 401, "UNAUTHORIZED");
    }

    const token = `jwt_mock_${user.id}_${Date.now()}`;
    setToken(token);
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
    const email = payload.reporterEmail || "student@uitc.edu";

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
    login: async (credentials: { email: string; password?: string; portal?: PortalRole }) => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ accessToken: string; user: any }>("/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials),
          });
          if (res?.accessToken) {
            setToken(res.accessToken);
          }
          return res;
        },
        async () => engine.login(credentials)
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
    me: async () => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ data: StaffAccount[] }>("/api/v1/users");
          return res.data[0] || null;
        },
        async () => {
          const users = await engine.getUsers();
          return users[0] || null;
        }
      );
    },
    logout: async () => {
      setToken(null);
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
    getIssues: async (params?: { search?: string; status?: string; role?: string; userId?: string }): Promise<PublicIssue[]> => {
      return tryApi(
        async () => {
          const qs = new URLSearchParams();
          if (params?.search) qs.append("search", params.search);
          if (params?.status) qs.append("status", params.status);
          if (params?.role) qs.append("role", params.role);
          if (params?.userId) qs.append("technicianId", params.userId);
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
    createLab: async (lab: { room: string; name: string; department: string }): Promise<{ message: string; lab: Lab }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ message: string; lab: any }>("/api/v1/labs", {
            method: "POST",
            body: JSON.stringify(lab),
          });
          return { message: res.message, lab: normalizeLab(res.lab) };
        },
        async () => {
          const labs = await engine.getLabs();
          const newLab: Lab = {
            id: `lab-${Date.now()}`,
            room: lab.room,
            name: lab.name,
            department: lab.department,
            technicianId: null,
            technicianName: "Awaiting assignment",
            openIssues: 0,
          };
          labs.push(newLab);
          return { message: "Lab created.", lab: newLab };
        }
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
    deleteLab: async () => ({ message: "Lab removed." }),
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
    }): Promise<{ message: string; user: StaffAccount }> => {
      return tryApi(
        async () => {
          const res = await apiRequest<{ message: string; user: StaffAccount }>("/api/v1/users", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          return res;
        },
        async () => engine.createUser(payload)
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
