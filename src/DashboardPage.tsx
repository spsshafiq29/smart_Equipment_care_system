import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { secsApi } from "./services/secsApi";
import type { AuditIncident, Budget, BudgetStatus, Lab, PortalRole, PublicIssue, StaffAccount } from "./workflowTypes";

type Role = PortalRole | "student" | "teacher" | "researcher";
type Section = "overview" | "my-issues" | "submit-fault" | "reports" | "labs" | "budgets" | "users" | "ledger";
type TechnicianQueue = "incoming" | "work";

interface Technician {
  id: string;
  name: string;
  department: string;
  email: string;
}

const ROLE_META: Record<Role, { label: string; initials: string; title: string; color: string; badge: string }> = {
  admin: {
    label: "System Admin",
    initials: "SA",
    title: "Facilities & Operations Administrator",
    color: "text-blue-400",
    badge: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  },
  authority: {
    label: "Higher Authority",
    initials: "HA",
    title: "Institutional Approvals & Governance",
    color: "text-amber-400",
    badge: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  },
  accounts: {
    label: "Accounts Office",
    initials: "AO",
    title: "Fiscal Disbursement & Ledger Management",
    color: "text-emerald-400",
    badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  },
  technician: {
    label: "Lab Technician",
    initials: "LT",
    title: "Equipment Diagnostics & Repairs",
    color: "text-indigo-400",
    badge: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
  },
  student: {
    label: "Student Member",
    initials: "ST",
    title: "University Student Portal",
    color: "text-sky-400",
    badge: "bg-sky-500/10 border-sky-500/30 text-sky-400",
  },
  teacher: {
    label: "Faculty Member",
    initials: "FM",
    title: "Faculty & Departmental In-Charge",
    color: "text-purple-400",
    badge: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  },
  researcher: {
    label: "Researcher",
    initials: "RS",
    title: "Academic Research Fellow",
    color: "text-teal-400",
    badge: "bg-teal-500/10 border-teal-500/30 text-teal-400",
  },
};

const NAV_ITEMS: { id: Section; label: string; roles: Role[]; icon: IconName }[] = [
  { id: "overview", label: "Executive Overview", roles: ["admin", "authority", "accounts", "technician", "student", "teacher", "researcher"], icon: "grid" },
  { id: "my-issues", label: "My Reported Issues", roles: ["student", "teacher", "researcher"], icon: "alert" },
  { id: "submit-fault", label: "Report Equipment Fault", roles: ["student", "teacher", "researcher"], icon: "alert" },
  { id: "reports", label: "Issue Workflow", roles: ["admin", "authority", "accounts", "technician"], icon: "alert" },
  { id: "labs", label: "Lab Directory", roles: ["admin", "authority", "technician", "student", "teacher", "researcher"], icon: "lab" },
  { id: "budgets", label: "Budgets & Payments", roles: ["admin", "authority", "accounts", "technician"], icon: "wallet" },
  { id: "users", label: "Access & Staff Accounts", roles: ["admin", "authority"], icon: "users" },
  { id: "ledger", label: "Public Audit Ledger", roles: ["admin", "authority", "accounts", "technician", "student", "teacher", "researcher"], icon: "shield" },
];

type IconName = "grid" | "lab" | "wallet" | "users" | "shield" | "bell" | "search" | "menu" | "close" | "check" | "alert" | "arrow";

const ICON_PATHS: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  lab: (
    <>
      <path d="M9 3h6M10 3v5l-5.5 9.5A2.3 2.3 0 0 0 6.5 21h11a2.3 2.3 0 0 0 2-3.5L14 8V3" />
      <path d="M7.5 16h9" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5z" />
      <path d="M4 7h15M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4L19 6" />,
  alert: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
    </>
  ),
  arrow: <path d="m9 18 6-6-6-6" />,
};

function Icon({ name, className = "w-5 h-5" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "amber" }) {
  const variants = {
    primary: "btn-primary text-white",
    amber: "btn-amber text-slate-950 font-bold",
    secondary: "border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white",
    ghost: "text-slate-400 hover:bg-white/[0.05] hover:text-white",
    danger: "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: BudgetStatus }) {
  const style =
    status === "Payment confirmed"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
      : status === "Approved"
      ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
      : "bg-amber-500/10 text-amber-300 border-amber-500/25";
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>{status}</span>;
}

function formatMoney(amount: number) {
  return `৳${amount.toLocaleString("en-BD")}`;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Resolved: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  "In Progress": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  "Under Review": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  Assigned: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30", dot: "bg-indigo-400" },
  "Budget Requested": { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30", dot: "bg-amber-400" },
  "Payment Review": { bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30", dot: "bg-cyan-400" },
  "Funds Approved": { bg: "bg-teal-500/10", text: "text-teal-300", border: "border-teal-500/30", dot: "bg-teal-400" },
  "Rejected by Higher Authority": { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-400" },
  "Payment Disputed": { bg: "bg-rose-500/15", text: "text-rose-300", border: "border-rose-500/40", dot: "bg-rose-400" },
};

const PRIORITY_BADGES: Record<string, { label: string; color: string; badge: string }> = {
  Critical: { label: "Critical", color: "text-rose-400", badge: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
  critical: { label: "Critical", color: "text-rose-400", badge: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
  High: { label: "High", color: "text-orange-400", badge: "bg-orange-500/15 border-orange-500/30 text-orange-300" },
  high: { label: "High", color: "text-orange-400", badge: "bg-orange-500/15 border-orange-500/30 text-orange-300" },
  Medium: { label: "Medium", color: "text-amber-400", badge: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
  medium: { label: "Medium", color: "text-amber-400", badge: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
  Low: { label: "Low", color: "text-emerald-400", badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
  low: { label: "Low", color: "text-emerald-400", badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
};

function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_CONFIG[status] || {
    bg: "bg-slate-800",
    text: "text-slate-300",
    border: "border-slate-700",
    dot: "bg-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text} ${conf.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
      {status}
    </span>
  );
}

interface DashboardProps {
  currentUser: StaffAccount | null;
  initialRole?: Role;
  issues: PublicIssue[];
  setIssues: Dispatch<SetStateAction<PublicIssue[]>>;
  incidents: AuditIncident[];
  setIncidents: Dispatch<SetStateAction<AuditIncident[]>>;
  onLogout: () => void;
  onNavigateHome?: () => void;
}

export default function DashboardPage({
  currentUser,
  initialRole,
  issues,
  setIssues,
  incidents,
  setIncidents,
  onLogout,
  onNavigateHome,
}: DashboardProps) {
  const role: Role = (currentUser?.role as Role) || initialRole || "technician";
  const [section, setSection] = useState<Section>("overview");
  const [mobileNav, setMobileNav] = useState(false);

  // Dynamic Backend State
  const [labs, setLabs] = useState<Lab[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", email: "", role: "technician", labId: "", password: "" });
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, { amount: string; description: string }>>({});
  const [reportSearch, setReportSearch] = useState("");
  const [technicianQueue, setTechnicianQueue] = useState<TechnicianQueue>("incoming");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Direct Student/Faculty Fault Report state
  const [newFault, setNewFault] = useState({
    lab: "",
    equipmentType: "",
    assetTag: "",
    priority: "medium",
    description: "",
  });
  const [faultSubmitting, setFaultSubmitting] = useState(false);
  const [faultError, setFaultError] = useState("");

  // Load all dynamic backend data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [labsData, issuesData, budgetsData, usersData, incidentsData, notifsData] = await Promise.all([
        secsApi.labs.getLabs().catch(() => []),
        secsApi.issues.getIssues({ role }).catch(() => []),
        secsApi.budgets.getBudgets().catch(() => []),
        secsApi.users.getUsers().catch(() => []),
        secsApi.audit.getIncidents().catch(() => []),
        secsApi.notifications.getNotifications(role).catch(() => ({ data: [] })),
      ]);

      setLabs(labsData);
      setIssues(issuesData);
      setBudgets(budgetsData);
      setStaffAccounts(usersData);
      setIncidents(incidentsData);
      if (notifsData?.data) {
        setNotifications(notifsData.data.map((n: any) => n.message));
      }
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  // Technicians derived from users
  const technicians: Technician[] = useMemo(() => {
    return staffAccounts
      .filter((u) => u.role === "technician")
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department || "Engineering",
      }));
  }, [staffAccounts]);

  const technicianMap = useMemo(() => {
    return Object.fromEntries(
      technicians.map((t) => [t.id, t])
    );
  }, [technicians]);

  const currentUserId = currentUser?.id || "tech-1";
  const currentUserEmail = currentUser?.email || "";
  const isAcademicUser = role === "student" || role === "teacher" || role === "researcher";

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const assignedLabs = role === "technician" ? labs.filter((lab) => lab.technicianId === currentUserId || !lab.technicianId) : labs;
  const visibleBudgets = role === "technician" ? budgets.filter((budget) => budget.technicianId === currentUserId) : budgets;

  const technicianAssignedIssues = issues.filter(
    (issue) => issue.assignedTechnicianId === currentUserId || !issue.assignedTechnicianId
  );
  const technicianIncomingIssues = technicianAssignedIssues.filter((issue) => issue.status === "Assigned");
  const technicianWorkIssues = technicianAssignedIssues
    .filter((issue) => issue.status !== "Assigned")
    .sort((a, b) => Number(a.status === "Resolved") - Number(b.status === "Resolved"));

  const userSubmittedIssues = issues.filter(
    (issue) =>
      issue.reporterEmail?.toLowerCase() === currentUserEmail.toLowerCase() ||
      (currentUser?.name && (issue.reporter || issue.reporterName || "").toLowerCase().includes(currentUser.name.toLowerCase()))
  );

  const roleVisibleIssues =
    role === "technician"
      ? reportSearch.trim()
        ? technicianAssignedIssues
        : technicianQueue === "incoming"
        ? technicianIncomingIssues
        : technicianWorkIssues
      : isAcademicUser
      ? userSubmittedIssues
      : issues;

  const visibleIssues = roleVisibleIssues.filter((issue) => issue.id.toLowerCase().includes(reportSearch.trim().toLowerCase()));
  const approvedTotal = budgets.filter((budget) => budget.status !== "Pending approval").reduce((sum, budget) => sum + budget.amount, 0);
  const pendingPayments = budgets.filter((budget) => budget.status === "Approved");

  async function handleStudentSubmitFault(e: React.FormEvent) {
    e.preventDefault();
    setFaultError("");
    if (!newFault.lab) {
      setFaultError("Please select the affected laboratory room.");
      return;
    }
    if (!newFault.equipmentType) {
      setFaultError("Please select the equipment type.");
      return;
    }
    if (!newFault.description.trim() || newFault.description.trim().length < 5) {
      setFaultError("Please provide a fault description with at least 5 characters.");
      return;
    }

    setFaultSubmitting(true);
    try {
      const selectedLab = labs.find((l) => `${l.room} · ${l.name}` === newFault.lab || l.id === newFault.lab);
      const res = await secsApi.issues.submitIssue({
        labId: selectedLab?.id,
        labName: selectedLab ? `${selectedLab.room} · ${selectedLab.name}` : newFault.lab,
        equipmentType: newFault.equipmentType,
        assetTag: newFault.assetTag.trim() || undefined,
        description: newFault.description.trim(),
        priority: newFault.priority,
        reporterName: currentUser?.name || "Campus Member",
        reporterEmail: currentUser?.email || undefined,
      });

      setNotice(`Equipment fault ticket ${res.issue.id} registered successfully! Dispatched to lab technician.`);
      setNewFault({
        lab: "",
        equipmentType: "",
        assetTag: "",
        priority: "medium",
        description: "",
      });
      await loadData();
      setSection("my-issues");
    } catch (err: any) {
      setFaultError(err?.message || "Failed to submit fault report.");
    } finally {
      setFaultSubmitting(false);
    }
  }

  // --- Dynamic API Operations ---
  async function assignTechnician(labId: string, technicianId: string) {
    try {
      await secsApi.labs.assignTechnician(labId, technicianId || null);
      setNotice(technicianId ? "Lab technician assignment updated." : "Technician removed from this lab.");
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to update lab assignment.");
    }
  }

  async function approveBudget(id: string) {
    try {
      await secsApi.budgets.approveBudget(id);
      setNotice(`${id} approved and forwarded to Accounts for payment release.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to approve budget.");
    }
  }

  async function confirmPayment(id: string) {
    try {
      await secsApi.budgets.confirmPayment(id);
      setNotice(`${id} payment confirmed. Visible on public audit ledger.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to confirm payment.");
    }
  }

  async function cancelIssue(id: string) {
    try {
      await secsApi.issues.updateStatus(id, { action: "cancel_report" });
      setNotice(`${id} was cancelled by Higher Authority.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to cancel issue.");
    }
  }

  async function confirmNoBudget(issue: PublicIssue) {
    try {
      await secsApi.issues.updateStatus(issue.id, { action: "confirm_no_budget" });
      setNotice(`${issue.id} confirmed for repair without budget.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to update status.");
    }
  }

  async function requestIssueBudget(issue: PublicIssue) {
    const draft = budgetDrafts[issue.id];
    const amount = Number(draft?.amount);
    if (!amount || !draft?.description.trim()) {
      setNotice("Enter both the required budget amount and a clear description.");
      return;
    }

    try {
      await secsApi.issues.updateStatus(issue.id, {
        action: "request_budget",
        budgetAmount: amount,
        budgetDescription: draft.description.trim(),
      });
      setNotice(`${issue.id} budget request sent to Higher Authority.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to submit budget request.");
    }
  }

  async function decideIssueBudget(issue: PublicIssue, approved: boolean) {
    try {
      await secsApi.issues.updateStatus(issue.id, {
        action: approved ? "approve_budget" : "reject_budget",
      });
      setNotice(approved ? `${issue.id} approved and sent to Accounts.` : `${issue.id} budget request rejected.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to process budget decision.");
    }
  }

  async function approveIssuePayment(issue: PublicIssue) {
    try {
      await secsApi.issues.updateStatus(issue.id, { action: "approve_payment" });
      setNotice(`${issue.id} payment approved and returned to technician.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to approve payment.");
    }
  }

  async function completeIssue(issue: PublicIssue) {
    try {
      await secsApi.issues.updateStatus(issue.id, { action: "complete_repair" });
      setNotice(`${issue.id} marked complete. Public status updated and resolution email sent.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to complete repair.");
    }
  }

  async function disputeIssuePayment(issue: PublicIssue) {
    const message = noteDrafts[issue.id]?.trim();
    if (!message) {
      setNotice("Please describe your payment dispute before publishing.");
      return;
    }

    try {
      await secsApi.issues.updateStatus(issue.id, {
        action: "dispute_payment",
        disputeMessage: message,
      });
      setNotice(`Dispute recorded for ${issue.id}. Published to the public transparency ledger.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to record dispute.");
    }
  }

  async function createAccount(event: React.FormEvent) {
    event.preventDefault();
    const trimmedEmail = newAccount.email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!newAccount.name.trim() || !isValidEmail) {
      setNotice("Enter a name and a valid university email address (e.g. username@uits.edu.bd or uitc.edu).");
      return;
    }
    if (role === "authority" && (newAccount.role === "authority" || newAccount.role === "admin")) {
      setNotice("Only System Admin can create Higher Authority or Admin accounts.");
      return;
    }

    try {
      await secsApi.users.createUser({
        name: newAccount.name.trim(),
        email: newAccount.email.trim(),
        role: newAccount.role,
        labId: newAccount.labId || undefined,
        password: newAccount.password.trim() || undefined,
      });

      setNewAccount({ name: "", email: "", role: "technician", labId: "", password: "" });
      setShowAccountForm(false);
      setNotice("Staff account created! Official credentials (username & password) dispatched via email.");
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to create account.");
    }
  }

  async function removeAccount(account: StaffAccount) {
    if (account.role === "authority" && role !== "admin") {
      setNotice("Higher Authority accounts can only be removed by System Admin.");
      return;
    }
    if (account.id === "admin-1") {
      setNotice("The primary System Admin account cannot be removed.");
      return;
    }

    try {
      await secsApi.users.deleteUser(account.id);
      setNotice(`${account.name}'s account was removed from the database.`);
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to remove account.");
    }
  }

  async function publishNote(budget: Budget) {
    const message = noteDrafts[budget.id]?.trim();
    if (!message) return;

    try {
      await secsApi.audit.publishConcern({
        ticketId: budget.ticketId || budget.ticket || budget.id,
        message,
        amount: budget.amount,
      });

      setNoteDrafts((current) => ({ ...current, [budget.id]: "" }));
      setNotice("Concern published directly to the public transparency ledger.");
      await loadData();
    } catch (err: any) {
      setNotice(err?.message || "Failed to publish concern.");
    }
  }

  const pageTitle = NAV_ITEMS.find((item) => item.id === section)?.label ?? "Workspace Overview";

  return (
    <div className="min-h-screen bg-[#050a18] text-slate-100 selection:bg-blue-500/30">
      {/* ── SIDEBAR NAVIGATION ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/5 bg-[#060b18]/95 backdrop-blur-2xl transition-transform duration-200 lg:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand bar */}
        <div className="flex h-20 items-center justify-between border-b border-white/5 px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 border border-white/10">
              S
            </div>
            <div>
              <span className="font-display font-extrabold text-base tracking-tight text-white block">SECS Portal</span>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">Enterprise Hub</span>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMobileNav(false)}>
            <Icon name="close" />
          </button>
        </div>

        {/* Authenticated Identity & RBAC Badge (No arbitrary role switching) */}
        <div className="p-4 border-b border-white/5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Verified Identity
          </label>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : ROLE_META[role]?.initials || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{currentUser?.name || ROLE_META[role]?.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{currentUser?.email || "Authenticated Session"}</div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${ROLE_META[role]?.badge}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {ROLE_META[role]?.label}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSection(item.id);
                  setMobileNav(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-sm shadow-blue-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                }`}
              >
                <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.id === "budgets" && pendingPayments.length > 0 && (
                  <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                    {pendingPayments.length}
                  </span>
                )}
                {item.id === "my-issues" && userSubmittedIssues.length > 0 && (
                  <span className="ml-auto rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold">
                    {userSubmittedIssues.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile Card & Logout */}
        <div className="border-t border-white/5 p-4 space-y-2">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-full py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
            >
              <span>←</span> Public Landing Page
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>⎋</span> Sign Out (Switch Account)
          </button>
        </div>
      </aside>

      {mobileNav && <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileNav(false)} />}

      {/* ── MAIN WORKSPACE CONTENT ── */}
      <div className="min-h-screen lg:pl-72 flex flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/5 bg-[#050a18]/90 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-400 p-2" onClick={() => setMobileNav(true)}>
              <Icon name="menu" />
            </button>
            <div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${ROLE_META[role].color}`}>
                {ROLE_META[role].label}
              </span>
              <h1 className="font-display font-extrabold text-xl text-white tracking-tight mt-0.5">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02]"
            >
              {isLoading ? "Syncing…" : "↻ Sync DB"}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] text-slate-300"
                aria-label="Notifications"
              >
                <Icon name="bell" className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white shadow-sm shadow-blue-500/50">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-2xl glass-card border border-white/10 shadow-2xl z-50">
                  <div className="border-b border-white/5 px-4 py-3 text-xs font-bold text-white flex justify-between items-center">
                    <span>Workflow Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          await secsApi.notifications.markAllRead(role);
                          setNotifications([]);
                        }}
                        className="text-[10px] text-blue-400 hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                    {notifications.length ? (
                      notifications.map((message, index) => (
                        <div key={`${message}-${index}`} className="p-3.5 text-xs text-slate-300 leading-relaxed">
                          {message}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500">No active notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {notice && (
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <Icon name="check" className="h-4 w-4 text-blue-400 shrink-0" />
                <span>{notice}</span>
              </div>
              <button onClick={() => setNotice("")} className="text-blue-300 hover:text-white text-xs font-bold">
                ✕
              </button>
            </div>
          )}

          {/* ── TAB 1: EXECUTIVE OVERVIEW ── */}
          {section === "overview" && (
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="glass-card p-6 md:p-8 rounded-2xl relative overflow-hidden">
                <div className="max-w-2xl relative z-10">
                  <span className={`text-xs font-bold uppercase tracking-wider ${ROLE_META[role].color}`}>
                    {ROLE_META[role].label} Dashboard
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight mt-2">
                    {isAcademicUser
                      ? `Welcome, ${currentUser?.name || "Campus Member"}`
                      : role === "technician"
                      ? "Assigned Laboratory Repair Operations"
                      : role === "accounts"
                      ? "Fiscal Approvals & Disbursement Ledger"
                      : "Campus Infrastructure Control & Oversight"}
                  </h2>
                  <p className="text-slate-400 text-xs md:text-sm mt-2 leading-relaxed">
                    {isAcademicUser
                      ? "Track your reported laboratory malfunctions in real-time, submit new problem reports, or check current campus laboratory availability."
                      : role === "technician"
                      ? "Only issues originating in your assigned laboratories appear here. You can request budget for parts, complete repairs, or contest inaccurate payment records."
                      : "End-to-end digital tracking guarantees that no repair, budget release, or technician handover occurs without an immutable database audit trail."}
                  </p>
                  {isAcademicUser && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => setSection("submit-fault")}
                        className="btn-primary text-xs font-semibold px-4 py-2 rounded-xl shadow-md"
                      >
                        + Report Equipment Fault
                      </button>
                      <button
                        onClick={() => setSection("my-issues")}
                        className="border border-white/10 hover:border-white/20 bg-white/[0.03] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                      >
                        Track My Tickets ({userSubmittedIssues.length})
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(isAcademicUser
                  ? [
                      {
                        label: "My Reported Issues",
                        value: userSubmittedIssues.length,
                        helper: "Total equipment tickets filed",
                      },
                      {
                        label: "Active In-Progress",
                        value: userSubmittedIssues.filter((i) => i.status !== "Resolved").length,
                        helper: "Under technician review",
                      },
                      {
                        label: "Resolved Equipment",
                        value: userSubmittedIssues.filter((i) => i.status === "Resolved").length,
                        helper: "Verified & operating",
                      },
                      {
                        label: "Campus Laboratories",
                        value: labs.length,
                        helper: "Supported research facilities",
                      },
                    ]
                  : [
                      {
                        label: role === "technician" ? "My Assigned Labs" : "Active Laboratories",
                        value: role === "technician" ? assignedLabs.length : labs.length,
                        helper: "Room-level authority",
                      },
                      {
                        label: "Pending Issues",
                        value: assignedLabs.reduce((sum, lab) => sum + (lab.openIssues || 0), 0),
                        helper: "Across visible labs",
                      },
                      { label: "Approved Budget", value: formatMoney(approvedTotal), helper: "Public ledger verified" },
                      { label: "Public Disputes", value: incidents.length, helper: "Audit incident trail" },
                    ]
                ).map((stat) => (
                  <div key={stat.label} className="glass-card p-5 rounded-2xl">
                    <p className="text-xs font-medium text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-extrabold font-display text-white mt-2">{stat.value}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{stat.helper}</p>
                  </div>
                ))}
              </div>

              {/* Attention Labs & Audit Coverage */}
              <div className="grid gap-6 xl:grid-cols-3">
                <div className="glass-card rounded-2xl p-6 xl:col-span-2">
                  <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">Laboratories Requiring Attention</h3>
                      <p className="text-xs text-slate-500">Sorted by unresolved problem reports</p>
                    </div>
                    <Button variant="ghost" onClick={() => setSection("labs")}>
                      View Directory →
                    </Button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {[...assignedLabs]
                      .sort((a, b) => (b.openIssues || 0) - (a.openIssues || 0))
                      .slice(0, 4)
                      .map((lab) => (
                        <div key={lab.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-bold text-amber-400">{lab.room}</span>
                            <h4 className="text-sm font-semibold text-white truncate">{lab.name}</h4>
                            <p className="text-xs text-slate-500">{lab.department}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-bold ${lab.openIssues ? "text-amber-400" : "text-emerald-400"}`}>
                              {lab.openIssues || 0} Open
                            </span>
                            <p className="text-[11px] text-slate-500">
                              {lab.technicianId && technicianMap[lab.technicianId]
                                ? technicianMap[lab.technicianId].name
                                : "Unassigned"}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-4">
                    <Icon name="shield" className="h-5 w-5 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Compliance Coverage</h3>
                      <p className="text-xs text-slate-500">Automated verification trail</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Laboratory room assigned to qualified technician",
                      "Budget request authorized by Higher Authority",
                      "Payment disbursement verified by Accounts",
                      "Technician receipt confirmed or publicly challenged",
                    ].map((step, i) => (
                      <div key={step} className="flex items-start gap-3 text-xs text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: MY REPORTED ISSUES (STUDENT / FACULTY WORKSPACE) ── */}
          {section === "my-issues" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">My Submitted Fault Reports</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Live lifecycle tracker for laboratory hardware problems filed under {currentUser?.email || "your account"}.
                  </p>
                </div>
                <button
                  onClick={() => setSection("submit-fault")}
                  className="btn-primary text-xs font-semibold px-4 py-2.5 rounded-xl self-start md:self-auto shadow-md"
                >
                  + Report New Equipment Fault
                </button>
              </div>

              {userSubmittedIssues.length > 0 ? (
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0b142c] text-slate-400 uppercase font-mono text-[11px] border-b border-white/5">
                        <tr>
                          <th className="px-5 py-4">Ticket</th>
                          <th className="px-5 py-4">Equipment Item</th>
                          <th className="px-5 py-4">Laboratory</th>
                          <th className="px-5 py-4">Priority</th>
                          <th className="px-5 py-4">Current Status</th>
                          <th className="px-5 py-4">Current Stage</th>
                          <th className="px-5 py-4">Responsible</th>
                          <th className="px-5 py-4">Reported</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {userSubmittedIssues.map((issue) => {
                          const pConf = PRIORITY_BADGES[issue.priority] || { badge: "bg-slate-800 text-slate-400" };
                          return (
                            <tr key={issue.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-3.5 font-mono font-bold text-blue-400">{issue.id}</td>
                              <td className="px-5 py-3.5 font-semibold text-white">
                                {issue.item}
                                {issue.assetTag && (
                                  <span className="block text-[10px] font-mono text-slate-500">Asset: {issue.assetTag}</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-slate-300">{issue.labName || issue.lab}</td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${pConf.badge}`}>
                                  {issue.priority}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <StatusBadge status={issue.status} />
                              </td>
                              <td className="px-5 py-3.5 text-slate-400">{issue.currentStage}</td>
                              <td className="px-5 py-3.5 text-slate-300 font-medium">
                                <span className="px-2 py-1 rounded bg-white/[0.03] border border-white/5">
                                  {issue.pendingWith}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-slate-400">{issue.createdAt || issue.submittedAt || "Recent"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-12 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-2xl">
                    📝
                  </div>
                  <h3 className="text-base font-bold text-white">No Equipment Reports On File</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    You have not reported any equipment malfunctions under {currentUser?.email || "this account"}.
                    When any campus lab device experiences a problem, submit a ticket to dispatch maintenance.
                  </p>
                  <button
                    onClick={() => setSection("submit-fault")}
                    className="btn-primary text-xs font-semibold px-4 py-2 rounded-xl mt-2"
                  >
                    Report First Fault Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: SUBMIT FAULT REPORT (STUDENT / FACULTY WORKSPACE) ── */}
          {section === "submit-fault" && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">Report Laboratory Equipment Fault</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Logged in as <strong className="text-blue-400">{currentUser?.name || "Campus Member"}</strong> ({currentUser?.email}). Ticket will automatically route to the assigned lab technician.
                </p>
              </div>

              {faultError && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                  {faultError}
                </div>
              )}

              <form onSubmit={handleStudentSubmitFault} className="glass-card p-6 md:p-8 rounded-2xl space-y-5 border border-white/5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Reporter Identity
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${currentUser?.name || "Member"} · ${currentUser?.email || ""}`}
                      className="w-full rounded-xl px-4 py-2.5 text-xs glass-input bg-[#0b142c] opacity-75 cursor-not-allowed text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Academic Department
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentUser?.department || "Campus Department"}
                      className="w-full rounded-xl px-4 py-2.5 text-xs glass-input bg-[#0b142c] opacity-75 cursor-not-allowed text-slate-300"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Laboratory Location *
                    </label>
                    <select
                      required
                      value={newFault.lab}
                      onChange={(e) => setNewFault({ ...newFault, lab: e.target.value })}
                      className="w-full rounded-xl px-4 py-2.5 text-xs glass-input bg-[#0b142c] text-white"
                    >
                      <option value="">Select laboratory room</option>
                      {labs.map((lab) => (
                        <option key={lab.id} value={`${lab.room} · ${lab.name}`}>
                          {lab.room} · {lab.name} ({lab.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Equipment Classification *
                    </label>
                    <select
                      required
                      value={newFault.equipmentType}
                      onChange={(e) => setNewFault({ ...newFault, equipmentType: e.target.value })}
                      className="w-full rounded-xl px-4 py-2.5 text-xs glass-input bg-[#0b142c] text-white"
                    >
                      <option value="">Select equipment type</option>
                      {[
                        "Microscopes",
                        "Centrifuges",
                        "Lab Computers",
                        "Oscilloscopes",
                        "Spectrophotometers",
                        "Power Supplies",
                        "Autoclaves",
                        "Imaging Systems",
                      ].map((eq) => (
                        <option key={eq} value={eq}>
                          {eq}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Asset Tag or Serial (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LAB-PC-04 or SPEC-2026"
                      value={newFault.assetTag}
                      onChange={(e) => setNewFault({ ...newFault, assetTag: e.target.value })}
                      className="w-full rounded-xl px-4 py-2.5 text-xs glass-input font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Urgency / Priority *
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["low", "medium", "high", "critical"].map((p) => {
                        const isSelected = newFault.priority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewFault({ ...newFault, priority: p })}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold uppercase transition-all border ${
                              isSelected
                                ? p === "critical"
                                  ? "bg-rose-500/20 border-rose-500 text-rose-300"
                                  : p === "high"
                                  ? "bg-orange-500/20 border-orange-500 text-orange-300"
                                  : p === "medium"
                                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                                  : "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                : "border-white/5 bg-white/[0.02] text-slate-400 hover:text-white"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Problem Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide specific details of the defect, symptom, or malfunction..."
                    value={newFault.description}
                    onChange={(e) => setNewFault({ ...newFault, description: e.target.value })}
                    className="w-full rounded-xl p-4 text-xs glass-input resize-none leading-relaxed text-white"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSection("overview")}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={faultSubmitting}
                    className="btn-primary text-xs font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {faultSubmitting ? "Routing Ticket to Technician..." : "Submit Fault Ticket →"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── TAB 2: ISSUE WORKFLOW ── */}
          {section === "reports" && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">Issue Workflow Queue</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Process incoming student reports, submit budget requirements, and verify repair completion.
                  </p>
                </div>
                <div className="relative">
                  <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="Search by ticket or item…"
                    className="rounded-xl pl-9 pr-4 py-2 text-xs glass-input w-72"
                  />
                </div>
              </div>

              {/* Technician Queue Switcher */}
              {role === "technician" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setTechnicianQueue("incoming")}
                    className={`p-4 rounded-2xl text-left border transition-all ${
                      technicianQueue === "incoming"
                        ? "bg-blue-600/15 border-blue-500 text-white"
                        : "glass-card border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">1. New Incoming Reports</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-xs font-bold">
                        {technicianIncomingIssues.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Initial assessments awaiting confirmation or budget request.</p>
                  </button>

                  <button
                    onClick={() => setTechnicianQueue("work")}
                    className={`p-4 rounded-2xl text-left border transition-all ${
                      technicianQueue === "work"
                        ? "bg-blue-600/15 border-blue-500 text-white"
                        : "glass-card border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">2. Active In-Progress Work</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                        {technicianWorkIssues.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Approved repairs undergoing hardware work or parts replacement.</p>
                  </button>
                </div>
              )}

              {/* List of Issue Cards */}
              <div className="space-y-4">
                {visibleIssues.map((issue) => (
                  <div key={issue.id} className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-blue-400 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          {issue.id}
                        </span>
                        <StatusPill status={issue.status as any} />
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400">
                          {issue.priority}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">Submitted: {issue.createdAt || issue.submittedAt}</span>
                    </div>

                    <div className="grid md:grid-cols-12 gap-4">
                      <div className="md:col-span-8">
                        <h3 className="text-base font-bold text-white">{issue.item}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Location: <strong className="text-slate-200">{issue.labName || issue.lab}</strong></p>
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          &quot;{issue.description}&quot;
                        </p>
                      </div>

                      <div className="md:col-span-4 text-xs space-y-1.5 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4">
                        <div className="text-slate-500">Current Stage:</div>
                        <div className="font-semibold text-slate-200">{issue.currentStage}</div>
                        <div className="text-slate-500 pt-1">Pending With:</div>
                        <div className="font-semibold text-blue-400">{issue.pendingWith}</div>
                      </div>
                    </div>

                    {/* Action Bar per Role */}
                    <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                      {/* Technician Actions */}
                      {role === "technician" && issue.status === "Assigned" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="primary" onClick={() => confirmNoBudget(issue)}>
                            Confirm (No Budget Required)
                          </Button>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="৳ Amount"
                              value={budgetDrafts[issue.id]?.amount ?? ""}
                              onChange={(e) =>
                                setBudgetDrafts((curr) => ({
                                  ...curr,
                                  [issue.id]: { ...(curr[issue.id] || { description: "" }), amount: e.target.value },
                                }))
                              }
                              className="w-24 px-3 py-1.5 text-xs glass-input rounded-xl"
                            />
                            <input
                              type="text"
                              placeholder="Budget purpose description"
                              value={budgetDrafts[issue.id]?.description ?? ""}
                              onChange={(e) =>
                                setBudgetDrafts((curr) => ({
                                  ...curr,
                                  [issue.id]: { ...(curr[issue.id] || { amount: "" }), description: e.target.value },
                                }))
                              }
                              className="w-56 px-3 py-1.5 text-xs glass-input rounded-xl"
                            />
                            <Button variant="amber" onClick={() => requestIssueBudget(issue)}>
                              Request Budget
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Higher Authority Actions */}
                      {role === "authority" && (
                        <div className="flex items-center gap-2">
                          {issue.status === "Budget Requested" && (
                            <>
                              <Button variant="primary" onClick={() => decideIssueBudget(issue, true)}>
                                Approve Budget (৳{issue.budgetAmount?.toLocaleString("en-BD")})
                              </Button>
                              <Button variant="danger" onClick={() => decideIssueBudget(issue, false)}>
                                Reject Budget
                              </Button>
                            </>
                          )}
                          {issue.status !== "Resolved" && (
                            <Button variant="ghost" onClick={() => cancelIssue(issue.id)}>
                              Cancel Report
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Accounts Office Actions */}
                      {role === "accounts" && issue.status === "Payment Review" && (
                        <Button variant="primary" onClick={() => approveIssuePayment(issue)}>
                          Disburse Funds & Confirm Paid
                        </Button>
                      )}

                      {/* Complete Repair */}
                      {role === "technician" && (issue.status === "In Progress" || issue.status === "Funds Approved") && (
                        <Button variant="primary" onClick={() => completeIssue(issue)}>
                          Mark Repair Complete (Resolved) ✓
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {visibleIssues.length === 0 && (
                  <div className="glass-card p-12 rounded-2xl text-center text-xs text-slate-500">
                    No matching issue records in this queue.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: LAB ASSIGNMENTS ── */}
          {section === "labs" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">Laboratory Assignments</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Control technician assignment to campus research and instructional facilities.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {labs.map((lab) => (
                  <div key={lab.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                          {lab.room}
                        </span>
                        <span className="text-xs text-slate-500">{lab.openIssues || 0} Open Tickets</span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">{lab.name}</h3>
                      <p className="text-xs text-slate-400">{lab.department}</p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                      {isAcademicUser ? (
                        <>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Technician: <strong className="text-white">{lab.technicianName || "Assigned On Demand"}</strong></span>
                          </div>
                          <button
                            onClick={() => {
                              setNewFault((prev) => ({ ...prev, lab: `${lab.room} · ${lab.name}` }));
                              setSection("submit-fault");
                            }}
                            className="w-full text-center py-2 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs font-semibold transition-all"
                          >
                            Report Fault in this Lab →
                          </button>
                        </>
                      ) : (
                        <>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Assigned Technician
                          </label>
                          <select
                            value={lab.technicianId || ""}
                            disabled={role !== "admin"}
                            onChange={(e) => assignTechnician(lab.id, e.target.value)}
                            className="w-full rounded-xl px-3 py-2 text-xs glass-input bg-[#0b142c] disabled:opacity-50"
                          >
                            <option value="">Awaiting Assignment</option>
                            {technicians.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.department})
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 4: BUDGETS & PAYMENTS ── */}
          {section === "budgets" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">Budgets & Payment Requisitions</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Verified requisitions, authority approvals, and accounts disbursement confirmation.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {visibleBudgets.map((budget) => (
                  <div key={budget.id} className="glass-card p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-amber-400">{budget.id}</span>
                        <StatusPill status={budget.status} />
                        <span className="text-xs font-mono text-slate-500">{budget.ticketId || budget.ticket}</span>
                      </div>
                      <h3 className="text-base font-bold text-white">{budget.purpose}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{budget.labName || budget.lab}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-extrabold font-display gradient-amber">
                          {formatMoney(budget.amount)}
                        </div>
                        {budget.paidAt && <div className="text-[11px] text-emerald-400">Confirmed · {budget.paidAt}</div>}
                      </div>

                      {role === "authority" && budget.status === "Pending approval" && (
                        <Button variant="primary" onClick={() => approveBudget(budget.id)}>
                          Approve Requisition
                        </Button>
                      )}

                      {role === "accounts" && budget.status === "Approved" && (
                        <Button variant="amber" onClick={() => confirmPayment(budget.id)}>
                          Confirm Payment Paid
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {visibleBudgets.length === 0 && (
                  <div className="glass-card p-12 rounded-2xl text-center text-xs text-slate-500">
                    No budget requisitions on file.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 5: STAFF & ACCESS ACCOUNTS ── */}
          {section === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">Staff Account Management</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Provision new technician, accounts, or higher authority accounts. Credentials are sent via Brevo email.
                  </p>
                </div>
                <Button variant="primary" onClick={() => setShowAccountForm(!showAccountForm)}>
                  {showAccountForm ? "Close Form" : "+ Provision New Staff Account"}
                </Button>
              </div>

              {showAccountForm && (
                <form onSubmit={createAccount} className="glass-card p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">
                    Staff Account Provisioning
                  </h3>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Staff Member Name"
                        value={newAccount.name}
                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                        className="w-full rounded-xl px-4 py-2 text-xs glass-input"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        University Email (.edu, .edu.bd)
                      </label>
                      <input
                        type="email"
                        placeholder="username@uits.edu.bd"
                        value={newAccount.email}
                        onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                        className="w-full rounded-xl px-4 py-2 text-xs glass-input"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Portal Role
                      </label>
                      <select
                        value={newAccount.role}
                        onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value, labId: "" })}
                        className="w-full rounded-xl px-4 py-2 text-xs glass-input bg-[#0b142c]"
                      >
                        <option value="technician">Lab Technician</option>
                        <option value="accounts">Accounts Office</option>
                        {role === "admin" && (
                          <>
                            <option value="authority">Higher Authority</option>
                            <option value="admin">System Admin</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Assign Lab Room (Optional)
                      </label>
                      <select
                        value={newAccount.labId}
                        disabled={newAccount.role !== "technician"}
                        onChange={(e) => setNewAccount({ ...newAccount, labId: e.target.value })}
                        className="w-full rounded-xl px-4 py-2 text-xs glass-input bg-[#0b142c] disabled:opacity-40"
                      >
                        <option value="">Assign Later</option>
                        {labs.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.room} · {l.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Initial Password (Sent to Email)
                      </label>
                      <input
                        type="text"
                        placeholder="Auto-generated if empty"
                        value={newAccount.password}
                        onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                        className="w-full rounded-xl px-4 py-2 text-xs glass-input"
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="primary" className="w-full py-2.5">
                    Save Account & Dispatch Credentials via Email →
                  </Button>
                </form>
              )}

              {/* Staff Directory */}
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
                {staffAccounts.map((account) => {
                  const canRemove =
                    account.id !== "admin-1" &&
                    (role === "admin" || account.role === "technician" || account.role === "accounts");

                  return (
                    <div key={account.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                          {account.name.split(" ").map((w) => w[0]).join("")}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{account.name}</h4>
                          <p className="text-xs text-slate-400">{account.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/[0.03] border border-white/5 text-slate-300">
                          {ROLE_META[account.role]?.label || account.role}
                        </span>

                        {canRemove ? (
                          <Button variant="danger" onClick={() => removeAccount(account)}>
                            Remove
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-500">Protected Account</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 6: PUBLIC AUDIT LEDGER ── */}
          {section === "ledger" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">Public Audit Ledger</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Immutable record of payment discrepancies and financial disclosures.
                </p>
              </div>

              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div key={incident.id} className="glass-card p-6 rounded-2xl border-rose-500/20 bg-rose-500/[0.02]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{incident.ticketId}</span>
                      <span className="text-xs text-slate-500">{incident.createdAt}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{incident.message}</p>
                    {incident.amount && (
                      <div className="text-sm font-extrabold font-display text-amber-400">
                        {formatMoney(incident.amount)}
                      </div>
                    )}
                  </div>
                ))}

                {incidents.length === 0 && (
                  <div className="glass-card p-12 rounded-2xl text-center text-xs text-slate-500">
                    No active discrepancy notices. All university transactions are balanced.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
