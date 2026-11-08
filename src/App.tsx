import { useEffect, useState } from "react";
import DashboardPage from "./DashboardPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import { getCurrentUser, getToken, secsApi } from "./services/secsApi";
import type {
  Announcement,
  AuditIncident,
  DashboardStats,
  EquipmentTypeOption,
  Lab,
  PortalRole,
  PublicIssue,
  StaffAccount,
} from "./workflowTypes";

type Page = "landing" | "login" | "register" | "dashboard" | "setup-admin";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Submit Fault", href: "#submit" },
  { label: "Transparency Tracker", href: "#track" },
  { label: "Lab Directory", href: "#labs" },
  { label: "Staff Portals", href: "#portal-access" },
  { label: "FAQ", href: "#faq" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Inspect & Tag",
    desc: "Locate the asset tag, serial number, or room number on the malfunctioning lab device.",
    icon: "🔍",
  },
  {
    step: "02",
    title: "Submit Online",
    desc: "Provide your university credentials, equipment type, priority, and a concise description of the failure.",
    icon: "📝",
  },
  {
    step: "03",
    title: "Auto-Routing",
    desc: "A sequential TKT ID is generated. The system auto-assigns the assigned technician for that lab within seconds.",
    icon: "⚡",
  },
  {
    step: "04",
    title: "Live Tracking & Resolution",
    desc: "Track status publicly. When fixed, you receive automated email verification via Brevo SMTP.",
    icon: "✅",
  },
];

const PORTAL_CARDS: { role: PortalRole; title: string; subtitle: string; description: string; actions: string[]; icon: string; accentColor: string }[] = [
  {
    role: "admin",
    title: "System Admin",
    subtitle: "Facilities & Operations",
    description: "Manage laboratory rooms, technician assignments, and overall campus access control.",
    actions: ["Manage lab assignments", "Control staff access", "Audit system workflows"],
    icon: "🛡️",
    accentColor: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  },
  {
    role: "authority",
    title: "Higher Authority",
    subtitle: "Institutional Governance",
    description: "Review, approve or reject repair budget requests, and conduct financial oversight.",
    actions: ["Approve repair budgets", "Audit payment discrepancies", "Departmental oversight"],
    icon: "🏛️",
    accentColor: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  },
  {
    role: "accounts",
    title: "Accounts Office",
    subtitle: "Fiscal Management",
    description: "Verify approved purchase requisitions and disburse repair funds to technicians.",
    actions: ["Process approved funds", "Confirm disbursements", "Uphold payment records"],
    icon: "💳",
    accentColor: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  },
  {
    role: "technician",
    title: "Lab Technician",
    subtitle: "Technical Repair Staff",
    description: "Diagnose faults, request parts funding, confirm fixes, and dispute false payments.",
    actions: ["Room-specific queue", "Request parts funding", "Resolve & close tickets"],
    icon: "🔧",
    accentColor: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
  },
];

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
  High: { label: "High", color: "text-orange-400", badge: "bg-orange-500/15 border-orange-500/30 text-orange-300" },
  Medium: { label: "Medium", color: "text-amber-400", badge: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
  Low: { label: "Low", color: "text-emerald-400", badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
};

const FAQS = [
  {
    q: "Who is eligible to report laboratory equipment faults?",
    a: "Any university student, faculty member, or researcher with an active email address can submit an issue report. Reports are authenticated and dispatched directly to the technician responsible for that specific laboratory room.",
  },
  {
    q: "How does the system ensure resolution accountability?",
    a: "Every report is logged with a public sequential ticket number. When funding is requested, both Higher Authority approvals and Accounts Office disbursements are recorded permanently. If an issue is unresolved after 7 days, automated condition update emails are dispatched.",
  },
  {
    q: "Is my personal email address publicly exposed?",
    a: "No. On the public transparency tracker, all reporter email addresses are cryptographically masked (e.g. sa***@campus.edu) to strictly protect your privacy while maintaining public verification integrity.",
  },
  {
    q: "What procedure should be followed for high-hazard or electrical safety risks?",
    a: "Select the 'Critical' priority level during submission. This marks the ticket with a strict 24-hour SLA alert. You should immediately cease operating the equipment and inform the lab instructor on duty.",
  },
];

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

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 text-slate-300 hover:text-white transition-colors"
      >
        <span className="font-semibold text-base leading-snug">{q}</span>
        <span className={`text-xl font-bold transition-transform duration-200 ${open ? "rotate-45 text-blue-400" : "text-slate-500"}`}>
          +
        </span>
      </button>
      {open && (
        <div className="pb-5 text-sm text-slate-400 leading-relaxed pr-6">
          {a}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [portalRole, setPortalRole] = useState<PortalRole>("admin");
  const [currentUser, setCurrentUser] = useState<StaffAccount | null>(() => getCurrentUser());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminConfigured, setAdminConfigured] = useState<boolean>(false);
  const [universityName, setUniversityName] = useState<string>("");

  // Dynamic Backend Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeOption[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [incidents, setIncidents] = useState<AuditIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    lab: "",
    equipmentType: "",
    assetTag: "",
    description: "",
    priority: "medium",
  });
  const [customEquipmentName, setCustomEquipmentName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadDynamicData = async () => {
    try {
      setIsLoading(true);
      const [statsData, labsData, issuesData, eqData, annData, incData, adminStatus, univName] = await Promise.all([
        secsApi.stats.getDashboardStats().catch(() => null),
        secsApi.labs.getLabs().catch(() => []),
        secsApi.issues.getPublicIssues().catch(() => []),
        secsApi.meta.getEquipmentTypes().catch(() => []),
        secsApi.meta.getAnnouncements().catch(() => []),
        secsApi.audit.getIncidents().catch(() => []),
        secsApi.auth.checkAdminStatus().catch(() => ({ adminConfigured: false })),
        secsApi.settings.getUniversityName().catch(() => ""),
      ]);

      if (statsData) setStats(statsData);
      if (labsData) setLabs(labsData);
      if (issuesData) setIssues(issuesData);
      if (eqData) setEquipmentTypes(eqData);
      if (annData) setAnnouncements(annData);
      if (incData) setIncidents(incData);
      if (adminStatus) setAdminConfigured(adminStatus.adminConfigured);
      if (typeof univName === "string") setUniversityName(univName);
    } catch (err) {
      console.error("Failed to load initial SECS data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (universityName) {
      document.title = `${universityName} · Smart Equipment Care System`;
    } else {
      document.title = "Smart Equipment Care System (SECS)";
    }
  }, [universityName]);

  useEffect(() => {
    // Check local session
    const saved = getCurrentUser();
    const token = getToken();
    if (saved && token) {
      setCurrentUser(saved);
    }
    // Optionally verify with server
    if (token) {
      secsApi.auth.me().then((user) => {
        if (user) setCurrentUser(user);
      }).catch(() => {
        // Session expired or unverified
      });
    }

    loadDynamicData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Please provide your name and email address.");
      setIsSubmitting(false);
      return;
    }
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    if (!isValidEmail) {
      setFormError("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.lab) {
      setFormError("Please select the affected laboratory room.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.equipmentType) {
      setFormError("Please select the equipment type.");
      setIsSubmitting(false);
      return;
    }
    if (formData.equipmentType === "Others" && !customEquipmentName.trim()) {
      setFormError("Please specify the custom device / equipment name.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 5) {
      setFormError("Please describe the fault with at least 5 characters.");
      setIsSubmitting(false);
      return;
    }

    const finalEquipmentType = formData.equipmentType === "Others"
      ? customEquipmentName.trim()
      : formData.equipmentType;

    try {
      const selectedLab = labs.find((l) => `${l.room} · ${l.name}` === formData.lab);
      const res = await secsApi.issues.submitIssue({
        labId: selectedLab?.id || "lab-1",
        labName: formData.lab,
        equipmentType: finalEquipmentType,
        assetTag: formData.assetTag.trim() || undefined,
        description: formData.description.trim(),
        priority: formData.priority,
        reporterName: formData.name.trim(),
        reporterEmail: formData.email.trim(),
      });

      setSubmittedTicket(res.issue.id);
      setCustomEquipmentName("");
      if (res?.issue) {
        setIssues((prev) => [res.issue, ...prev.filter((i) => i.id !== res.issue.id)]);
      }
      await loadDynamicData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to submit fault report.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openPortal(role: PortalRole) {
    if (currentUser) {
      setPage("dashboard");
    } else if (role === "admin" && adminConfigured === false) {
      setPortalRole("admin");
      setPage("setup-admin");
    } else {
      setPortalRole(role);
      setPage("login");
    }
  }

  function handleLoginSuccess(user: StaffAccount) {
    setCurrentUser(user);
    setAdminConfigured(true);
    setPage("dashboard");
  }

  async function handleLogout() {
    await secsApi.auth.logout();
    setCurrentUser(null);
    setPage("landing");
  }

  if (page === "setup-admin") {
    return (
      <LoginPage
        initialPortal="admin"
        initialView={adminConfigured ? "login" : "setup-admin"}
        onNavigate={(p) => setPage(p)}
        onLogin={handleLoginSuccess}
      />
    );
  }

  if (page === "login") {
    return (
      <LoginPage
        initialPortal={portalRole}
        initialView={portalRole === "admin" && adminConfigured === false ? "setup-admin" : "login"}
        onNavigate={(p) => setPage(p)}
        onLogin={handleLoginSuccess}
      />
    );
  }

  if (page === "register") {
    return (
      <LoginPage
        initialView="register"
        onNavigate={(p) => setPage(p)}
        onLogin={handleLoginSuccess}
      />
    );
  }

  if (page === "dashboard") {
    return (
      <DashboardPage
        currentUser={currentUser}
        initialRole={(currentUser?.role as any) || portalRole}
        issues={issues}
        setIssues={setIssues}
        incidents={incidents}
        setIncidents={setIncidents}
        onLogout={handleLogout}
        onNavigateHome={() => setPage("landing")}
        onUniversityNameChange={(name) => setUniversityName(name)}
      />
    );
  }

  return (
    <div className="min-h-full bg-[#050a18] text-slate-100 selection:bg-blue-500/30">
      {/* ── ONE-TIME MASTER ADMIN SETUP BANNER (AUTO-HIDES ONCE INITIALIZED) ── */}
      {!adminConfigured && (
        <aside aria-label="First-time setup banner" className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 text-slate-950 px-6 py-2.5 shadow-lg border-b border-amber-400/40 relative z-[60]">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <span className="text-base">👑</span>
              <span>First-Time Deployment Notice: Primary System Administrator account has not been configured yet.</span>
            </div>
            <button
              onClick={() => {
                setPortalRole("admin");
                setPage("setup-admin");
              }}
              className="px-4 py-1.5 rounded-lg bg-slate-950 text-amber-300 hover:text-white font-bold text-xs shadow hover:bg-slate-900 transition-all flex items-center gap-1.5"
            >
              <span>Setup Master Admin Now (One-Time) →</span>
            </button>
          </div>
        </aside>
      )}

      {/* ── STICKY GLASS NAVIGATION ── */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-tight text-white">SECS</span>
              <span className="hidden sm:inline-block text-xs font-semibold text-blue-400 tracking-wider ml-2.5 uppercase">
                {universityName ? `${universityName} · Smart Equipment Care` : "Smart Equipment Care System"}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-400">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-semibold">{currentUser.name}</span>
                  <span className="text-blue-400 font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={() => setPage("dashboard")}
                  className="text-xs font-semibold px-4 py-2 rounded-xl btn-primary shadow-md shadow-blue-500/20"
                >
                  My Workspace →
                </button>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex text-xs font-semibold px-3 py-2 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:text-white transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                {!adminConfigured && (
                  <button
                    onClick={() => {
                      setPortalRole("admin");
                      setPage("setup-admin");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 hover:brightness-110 transition-all animate-pulse"
                  >
                    <span>👑</span> One-Time Admin Setup
                  </button>
                )}
                <button
                  onClick={() => document.querySelector("#portal-access")?.scrollIntoView({ behavior: "smooth" })}
                  className="hidden sm:flex text-xs font-semibold px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white transition-all"
                >
                  Staff Portals
                </button>
                <button
                  onClick={() => setPage("register")}
                  className="hidden sm:flex text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  Register
                </button>
                <button
                  onClick={() => setPage("login")}
                  className="text-xs font-semibold px-4 py-2 rounded-xl btn-primary"
                >
                  Sign In →
                </button>
              </>
            )}
            <button
              className="lg:hidden text-slate-400 p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden bg-[#070e24] border-t border-white/5 px-6 py-5 flex flex-col gap-3.5 text-sm">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-slate-400 hover:text-white py-1"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              {currentUser ? (
                <>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setPage("dashboard");
                    }}
                    className="w-full text-center py-2.5 rounded-xl btn-primary text-xs font-semibold"
                  >
                    Open Workspace ({currentUser.name})
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-center py-2.5 rounded-xl border border-rose-500/30 text-rose-300 text-xs font-semibold"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  {!adminConfigured && (
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        setPortalRole("admin");
                        setPage("setup-admin");
                      }}
                      className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>👑</span> Setup Master Admin (One-Time)
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setPage("register");
                    }}
                    className="w-full text-center py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-white"
                  >
                    Register Student / Faculty
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setPage("login");
                    }}
                    className="w-full text-center py-2.5 rounded-xl btn-primary text-xs font-semibold"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION ── */}
      <header id="home" className="relative min-h-[92vh] flex items-center overflow-hidden border-b border-white/5">
        {/* Ambient lighting meshes */}
        <div className="absolute top-1/4 left-1/4 w-[38rem] h-[38rem] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[32rem] h-[32rem] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Subtle geometric dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-16">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-7">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                {universityName ? `${universityName} · Live Campus Operations` : "Live Campus Operations"}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-white tracking-tight leading-[1.12] mb-6">
                Smart Equipment <br />
                <span className="gradient-brand">Care & Maintenance</span> <br />
                System
              </h1>

              <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-xl">
                A unified university platform for logging laboratory device faults, tracking repairs with complete financial transparency, and guaranteeing SLA response times.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <a
                  href="#submit"
                  className="font-semibold px-7 py-3.5 rounded-xl btn-primary text-sm flex items-center gap-2.5"
                >
                  <span>Report Equipment Fault</span>
                  <span className="text-base">↓</span>
                </a>
                <button
                  onClick={() => setPage("login")}
                  className="font-semibold px-7 py-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-slate-200 hover:text-white transition-all text-sm"
                >
                  Staff Portal Sign In
                </button>
                {!adminConfigured && (
                  <button
                    onClick={() => {
                      setPortalRole("admin");
                      setPage("setup-admin");
                    }}
                    className="font-semibold px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20 text-sm flex items-center gap-2 transition-all animate-pulse"
                  >
                    <span>👑</span>
                    <span>Master Admin Setup (One-Time)</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs text-slate-500 mr-2">Dedicated portals for:</span>
                {["Students", "Faculty", "Technicians", "Higher Authority", "Accounts"].map((role) => (
                  <span
                    key={role}
                    className="text-xs px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-slate-400 font-medium"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Metric Showcase Card Cluster */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Image banner card */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 h-52 glass-card">
                <img
                  src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&fit=crop&auto=format"
                  alt="University laboratory equipment"
                  className="w-full h-full object-cover object-center opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050a18] via-[#050a18]/60 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                      Campus Lab Infrastructure
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-0.5">
                      {labs.length > 0 ? `${labs.length} Connected Laboratories` : "Active University Labs"}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Operational
                  </span>
                </div>
              </div>

              {/* Dynamic Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 rounded-xl">
                  <div className="text-xs font-medium text-slate-400">Total Solved Issues</div>
                  <div className="text-2xl font-extrabold font-display text-white mt-1">
                    {stats?.issuesResolvedCount ?? 0}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                    <span>✓</span> Verified database records
                  </div>
                </div>

                <div className="glass-card p-4 rounded-xl">
                  <div className="text-xs font-medium text-slate-400">Approved Budget</div>
                  <div className="text-2xl font-extrabold font-display gradient-amber mt-1">
                    ৳{(stats?.approvedBudgetTotal ?? 0).toLocaleString("en-BD")}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Publicly audited funds</div>
                </div>

                <div className="glass-card p-4 rounded-xl">
                  <div className="text-xs font-medium text-slate-400">Average Response</div>
                  <div className="text-2xl font-extrabold font-display text-white mt-1">
                    {stats?.avgResponseTime || "< 24 hr"}
                  </div>
                  <div className="text-[11px] text-blue-400 mt-0.5">Automated tech dispatch</div>
                </div>

                <div className="glass-card p-4 rounded-xl">
                  <div className="text-xs font-medium text-slate-400">Resolution Rate</div>
                  <div className="text-2xl font-extrabold font-display text-white mt-1">
                    {stats?.satisfactionRate || "99.4%"}
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">SLA compliance</div>
                </div>
              </div>

              {/* SLA Response strip */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-slate-300">Priority SLA Enforcement</span>
                  <span className="text-[10px] text-slate-500">Auto-Escalation Engine</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    <span className="font-bold block">Critical</span>
                    <span className="text-[10px] opacity-75">24 Hours</span>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300">
                    <span className="font-bold block">High</span>
                    <span className="text-[10px] opacity-75">3 Days</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    <span className="font-bold block">Medium</span>
                    <span className="text-[10px] opacity-75">7 Days</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <span className="font-bold block">Low</span>
                    <span className="text-[10px] opacity-75">14 Days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── ANNOUNCEMENTS BAR ── */}
      {announcements.length > 0 && (
        <aside aria-label="Campus Notice" className="bg-blue-600/10 border-y border-blue-500/20 px-6 py-3.5 text-xs text-blue-300 flex items-center justify-center gap-2.5">
          <span className="font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 uppercase tracking-wider text-[10px]">
            Campus Notice
          </span>
          <span>{announcements[0]?.message}</span>
        </aside>
      )}

      {/* ── HOW IT WORKS SECTION ── */}
      <section id="how" className="py-24 border-b border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-2">Process</span>
            <h2 className="text-3xl md:text-4xl font-extrabold font-display text-white tracking-tight">
              From Report to Resolution
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Standardized, digital, and verifiable steps ensure every campus laboratory device is accounted for.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="glass-card p-6 rounded-2xl relative group">
                <div className="text-3xl mb-4">{item.icon}</div>
                <div className="text-xs font-mono font-bold text-blue-400 mb-1">{item.step}</div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STAFF PORTALS SECTION ── */}
      <section id="portal-access" className="py-24 border-b border-white/5 relative bg-[#060d1f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-2">
                Staff Authentication
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold font-display text-white tracking-tight">
                Role-Gated Workspaces
              </h2>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                Each portal features permission-isolated actions, approval queues, and direct integration with our PostgreSQL database.
              </p>
            </div>
            <button
              onClick={() => setPage("login")}
              className="self-start md:self-auto text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] text-slate-300 hover:text-white transition-all"
            >
              Sign In with Credentials
            </button>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PORTAL_CARDS.map((portal) => {
              const isUnconfiguredAdmin = portal.role === "admin" && !adminConfigured;
              return (
                <div
                  key={portal.role}
                  className={`glass-card rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                    isUnconfiguredAdmin
                      ? "border-amber-500/50 shadow-xl shadow-amber-500/15 bg-amber-500/[0.04]"
                      : "border-white/5"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-2xl">{portal.icon}</span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          isUnconfiguredAdmin
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse"
                            : portal.accentColor
                        }`}
                      >
                        {isUnconfiguredAdmin ? "⚡ Setup Required (One-Time)" : portal.subtitle}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{portal.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-5 min-h-[48px]">
                      {isUnconfiguredAdmin
                        ? "Master administrator account has not been set up. Click below to initialize your credentials now."
                        : portal.description}
                    </p>

                    <div className="space-y-2 mb-6 pt-4 border-t border-white/5">
                      {portal.actions.map((act) => (
                        <div key={act} className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="text-emerald-400 text-[11px]">✓</span>
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isUnconfiguredAdmin ? (
                    <button
                      onClick={() => {
                        setPortalRole("admin");
                        setPage("setup-admin");
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs text-center shadow-lg shadow-amber-500/25 hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>👑</span> Setup Master Admin (One-Time) →
                    </button>
                  ) : (
                    <button
                      onClick={() => openPortal(portal.role)}
                      className="w-full py-2.5 rounded-xl btn-primary text-xs font-semibold text-center"
                    >
                      Enter {portal.title} →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LAB DIRECTORY (DYNAMIC) ── */}
      <section id="labs" className="py-24 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-2">Campus Map</span>
              <h2 className="text-3xl font-extrabold font-display text-white tracking-tight">
                University Laboratory Directory
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Room-by-room status, assigned technicians, and active fault ticket counts.
              </p>
            </div>
            <button
              onClick={loadDynamicData}
              className="self-start text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10"
            >
              ↻ Refresh Labs
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {labs.map((lab) => (
              <div key={lab.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                      {lab.room}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${lab.technicianId ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-amber-400"
                        }`}
                      title={lab.technicianId ? "Technician Assigned" : "Awaiting Technician"}
                    />
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{lab.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{lab.department}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Tech: <strong className="text-slate-200">{lab.technicianName || "Unassigned"}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, lab: `${lab.room} · ${lab.name}` }));
                      document.querySelector("#submit")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold text-xs"
                  >
                    Select Lab →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Supported Categories */}
          {equipmentTypes.length > 0 && (
            <div className="pt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-4">
                Supported Equipment Classifications
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {equipmentTypes.map((eq) => (
                  <button
                    key={eq.label}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, equipmentType: eq.label }));
                      document.querySelector("#submit")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="glass-card p-4 rounded-xl flex flex-col items-center gap-2 hover:border-blue-500/40 text-center"
                  >
                    <span className="text-2xl">{eq.icon}</span>
                    <span className="text-xs font-medium text-slate-300">{eq.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, equipmentType: "Others" }));
                    document.querySelector("#submit")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="glass-card p-4 rounded-xl flex flex-col items-center gap-2 hover:border-amber-500/40 text-center"
                >
                  <span className="text-2xl">➕</span>
                  <span className="text-xs font-medium text-amber-300">Others</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── REPORT SUBMISSION FORM ── */}
      <section id="submit" className="py-24 border-b border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            {/* Guidelines Column */}
            <div className="lg:col-span-5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-2">
                Public Submission Portal
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
                Report an Equipment Fault
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Experienced an equipment failure, calibration error, or power disruption? Submit a ticket directly to campus maintenance.
              </p>

              <div className="space-y-4">
                {[
                  { title: "Instant Sequential Ticket Number", desc: "A verifiable TKT-xxxx ID is generated upon submission." },
                  { title: "Automatic Room-Tech Assignment", desc: "Routes straight to the staff technician assigned to the lab." },
                  { title: "Public Masked Privacy", desc: "Your identity remains masked to external viewers (sa***@campus.edu)." },
                  { title: "Email Notifications via Brevo", desc: "Receive email updates upon resolution or 7-day progress reviews." },
                ].map((item) => (
                  <div key={item.title} className="glass-card p-4 rounded-xl flex items-start gap-3.5">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 text-blue-400 text-xs font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Card */}
            <div className="lg:col-span-7">
              <div className="glass-card rounded-2xl p-7 sm:p-9 shadow-2xl">
                {submittedTicket ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold font-display text-white mb-2">Report Successfully Registered!</h3>
                    <p className="text-slate-400 text-xs mb-3">Your official university ticket identifier is:</p>
                    <div className="inline-block px-5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 font-mono text-xl font-extrabold text-blue-400 mb-6">
                      {submittedTicket}
                    </div>
                    <p className="text-slate-400 text-xs max-w-md mx-auto mb-8 leading-relaxed">
                      The assigned laboratory technician has received your ticket in their workflow queue. You can track ongoing progress on the public tracker below.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        onClick={() => document.querySelector("#track")?.scrollIntoView({ behavior: "smooth" })}
                        className="px-6 py-2.5 rounded-xl btn-primary text-xs font-semibold"
                      >
                        Track Ticket Live ↓
                      </button>
                      <button
                        onClick={() => {
                          setSubmittedTicket(null);
                          setCustomEquipmentName("");
                          setFormData({
                            name: "",
                            email: "",
                            lab: "",
                            equipmentType: "",
                            assetTag: "",
                            description: "",
                            priority: "medium",
                          });
                        }}
                        className="px-6 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-xs font-semibold text-slate-300"
                      >
                        Submit Another Ticket
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div className="border-b border-white/5 pb-4 mb-2">
                      <h3 className="text-lg font-bold text-white">Equipment Fault Requisition</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Please provide accurate hardware identifiers.</p>
                    </div>

                    {formError && (
                      <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                        {formError}
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Reporter Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Dr. Tanvir or Student Name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm glass-input"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Reporter Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. your.email@gmail.com or student@uits.edu.bd"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm glass-input"
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
                          value={formData.lab}
                          onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm glass-input bg-[#0b142c]"
                        >
                          <option value="">Select laboratory</option>
                          {labs.map((lab) => (
                            <option key={lab.id} value={`${lab.room} · ${lab.name}`}>
                              {lab.room} · {lab.name}
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
                          value={formData.equipmentType}
                          onChange={(e) => {
                            setFormData({ ...formData, equipmentType: e.target.value });
                            if (e.target.value !== "Others") setCustomEquipmentName("");
                          }}
                          className="w-full rounded-xl px-4 py-2.5 text-sm glass-input bg-[#0b142c]"
                        >
                          <option value="">Select equipment type</option>
                          {equipmentTypes.map((eq) => (
                            <option key={eq.label} value={eq.label}>
                              {eq.label}
                            </option>
                          ))}
                          <option value="Others">Others</option>
                        </select>

                        {formData.equipmentType === "Others" && (
                          <div className="mt-2.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                              Specify Custom Device / Equipment Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Digital Multimeter, 3D Printer, Laser Cutter"
                              value={customEquipmentName}
                              onChange={(e) => setCustomEquipmentName(e.target.value)}
                              className="w-full rounded-xl px-4 py-2 text-sm glass-input border-amber-500/50 focus:border-amber-400 text-white placeholder-slate-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Asset Tag or Serial (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SW-08 or SPEC-2026"
                          value={formData.assetTag}
                          onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                          className="w-full rounded-xl px-4 py-2.5 text-sm glass-input font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Priority Tier *
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {["low", "medium", "high", "critical"].map((p) => {
                            const isSelected = formData.priority === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setFormData({ ...formData, priority: p })}
                                className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${isSelected
                                    ? p === "critical"
                                      ? "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
                                      : p === "high"
                                        ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
                                        : p === "medium"
                                          ? "bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30"
                                          : "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                                    : "border border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15"
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
                        Detailed Fault Description *
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Detail the failure mode, error lights, operating temperature, or broken mechanical components..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-xl px-4 py-2.5 text-sm glass-input resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? "Dispatching Requisition…" : "Submit Equipment Fault Ticket →"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PUBLIC TRANSPARENCY TRACKER ── */}
      <section id="track" className="py-24 border-b border-white/5 bg-[#060c1d]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-2">
                Public Accountability
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold font-display text-white tracking-tight">
                Live Transparency Tracker
              </h2>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                Every ticket, approval milestone, budget allocation, and assigned technician is publicly verifiable in real time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                {issues.length} Issues Tracked
              </span>
              <button
                onClick={loadDynamicData}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.02] text-slate-300"
              >
                ↻ Refresh Live
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-card p-4 rounded-2xl mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="m20 20-4-4" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Search by ticket ID, equipment, or lab room..."
                className="w-full rounded-xl pl-10 pr-9 py-2 text-xs glass-input"
              />
              {ticketSearch && (
                <button
                  onClick={() => setTicketSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {["all", "Assigned", "In Progress", "Budget Requested", "Resolved"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${statusFilter === status
                      ? "bg-blue-600 text-white font-semibold"
                      : "border border-white/5 bg-white/[0.02] text-slate-400 hover:text-white"
                    }`}
                >
                  {status === "all" ? "All Tickets" : status}
                </button>
              ))}
            </div>
          </div>

          {/* Issues Data Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="px-5 py-4">Ticket</th>
                    <th className="px-5 py-4">Equipment Item</th>
                    <th className="px-5 py-4">Lab Location</th>
                    <th className="px-5 py-4">Reporter</th>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Current Stage</th>
                    <th className="px-5 py-4">Responsible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {issues
                    .filter((issue) => {
                      const q = ticketSearch.trim().toLowerCase();
                      const matchesSearch =
                        !q ||
                        issue.id.toLowerCase().includes(q) ||
                        issue.item.toLowerCase().includes(q) ||
                        (issue.labName || issue.lab || "").toLowerCase().includes(q);
                      const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((issue) => {
                      const pConf = PRIORITY_BADGES[issue.priority] || { color: "text-slate-400", badge: "bg-slate-800 text-slate-400" };
                      return (
                        <tr key={issue.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3.5 font-mono font-bold text-blue-400">{issue.id}</td>
                          <td className="px-5 py-3.5 font-semibold text-white">{issue.item}</td>
                          <td className="px-5 py-3.5 text-slate-300">{issue.labName || issue.lab}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">{issue.reporter || issue.reporterEmail}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${pConf.badge}`}>
                              {issue.priority}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={issue.status} />
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{issue.currentStage}</td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-1 rounded bg-white/[0.03] border border-white/5 text-slate-300 font-medium">
                              {issue.pendingWith}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {issues.length === 0 && !isLoading && (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 text-2xl">
                  ✨
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Clean System Slate</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No equipment faults currently on record. All laboratory hardware is operating smoothly. Click &quot;Report Equipment Fault&quot; to log the first issue.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── PUBLIC AUDIT LEDGER ── */}
      <section className="py-24 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 block mb-2">
              Financial Transparency
            </span>
            <h2 className="text-3xl font-extrabold font-display text-white tracking-tight">
              Public Incident & Audit Ledger
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl">
              Technicians can publish concerns regarding payment receipt discrepancies directly to this immutable ledger.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {incidents.map((incident) => (
              <div key={incident.id} className="glass-card p-5 rounded-2xl border-rose-500/20 bg-rose-500/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase">
                      Payment Disputed
                    </span>
                    <span className="font-mono text-xs text-amber-400 font-bold">{incident.ticketId}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{incident.createdAt}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{incident.message}</p>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>Author: Verified Technician</span>
                  {incident.amount && (
                    <span className="font-bold text-amber-400">৳{incident.amount.toLocaleString("en-BD")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {incidents.length === 0 && (
            <div className="glass-card p-8 rounded-2xl text-center text-xs text-slate-400">
              No active payment discrepancies on file. All laboratory funding disbursements have been verified by recipients.
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 border-b border-white/5 max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-2">Help Center</span>
          <h2 className="text-3xl font-extrabold font-display text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="glass-card p-6 rounded-2xl">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 bg-[#040814] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              S
            </div>
            <div>
              <span className="font-display font-bold text-sm text-white">SECS</span>
              <p className="text-[11px] text-slate-500">Smart Equipment Care System · University IT Division</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#home" className="hover:text-slate-300 transition-colors">Home</a>
            <a href="#submit" className="hover:text-slate-300 transition-colors">Report</a>
            <a href="#track" className="hover:text-slate-300 transition-colors">Tracker</a>
            <a href="#portal-access" className="hover:text-slate-300 transition-colors">Portals</a>
          </div>

          <div className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} University Equipment Care & Facilities Division.
          </div>
        </div>
      </footer>
    </div>
  );
}
