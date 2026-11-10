import { useEffect, useMemo, useState } from "react";
import DashboardPage from "./DashboardPage";
import LoginPage from "./LoginPage";
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
  { label: "Overview", href: "#overview" },
  { label: "Laboratories", href: "#facilities" },
  { label: "Submit Requisition", href: "#requisition" },
  { label: "Transparency Ledger", href: "#transparency" },
  { label: "Safety Protocols", href: "#safety" },
  { label: "FAQ", href: "#faq" },
];

const PROTOCOL_STEPS = [
  {
    step: "01",
    tag: "IDENTIFICATION",
    title: "Inspect & Note Asset ID",
    desc: "Examine the malfunctioning lab instrument, locate its official university asset barcode or serial tag, and note the room number.",
  },
  {
    step: "02",
    tag: "REQUISITION",
    title: "Submit Technical Fault",
    desc: "File the defect through this portal with hardware classification, symptom details, and operational urgency tier.",
  },
  {
    step: "03",
    tag: "DISPATCH",
    title: "Automated Room Assignment",
    desc: "A verified sequential TKT ID is generated in PostgreSQL. The assigned laboratory technician is instantly alerted in their queue.",
  },
  {
    step: "04",
    tag: "RESOLUTION",
    title: "Audit & Verified Signoff",
    desc: "Technician performs diagnosis and repair. Budget approvals and parts funding are logged, and email notice is dispatched to the reporter.",
  },
];

const STATUS_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Resolved: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/25", dot: "bg-emerald-400" },
  "In Progress": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/25", dot: "bg-blue-400" },
  "Under Review": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/25", dot: "bg-amber-400" },
  Assigned: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/25", dot: "bg-sky-400" },
  "Budget Requested": { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30", dot: "bg-amber-400" },
  "Payment Review": { bg: "bg-indigo-500/10", text: "text-indigo-300", border: "border-indigo-500/25", dot: "bg-indigo-400" },
  "Funds Approved": { bg: "bg-teal-500/10", text: "text-teal-300", border: "border-teal-500/25", dot: "bg-teal-400" },
  "Rejected by Higher Authority": { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/25", dot: "bg-rose-400" },
  "Payment Disputed": { bg: "bg-rose-500/15", text: "text-rose-300", border: "border-rose-500/35", dot: "bg-rose-400" },
};

const PRIORITY_STYLES: Record<string, { label: string; badge: string; dot: string }> = {
  Critical: { label: "Critical (24h)", badge: "bg-rose-500/10 text-rose-300 border-rose-500/30", dot: "bg-rose-400" },
  High: { label: "High (72h)", badge: "bg-orange-500/10 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  Medium: { label: "Medium (7d)", badge: "bg-amber-500/10 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  Low: { label: "Low (14d)", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
};

const FAQS = [
  {
    q: "Who is authorized to report laboratory equipment defects?",
    a: "Any university student, faculty member, or researcher with a valid university email address can submit an issue report. Reports are authenticated and dispatched directly to the technician responsible for that specific laboratory room.",
  },
  {
    q: "How does the system ensure resolution accountability?",
    a: "Every report is logged with a permanent, sequential ticket number in our PostgreSQL database. When funding is requested, both Higher Authority approvals and Accounts Office disbursements are recorded permanently. If an issue is unresolved after 7 days, automated condition update emails are dispatched.",
  },
  {
    q: "Is my personal email address publicly exposed?",
    a: "No. On the public transparency tracker, all reporter email addresses are cryptographically masked (e.g. sa***@campus.edu) to strictly protect your privacy while maintaining public verification integrity.",
  },
  {
    q: "What procedure should be followed for electrical hazards or safety risks?",
    a: "Select the 'Critical' priority level during submission. This triggers a strict 24-hour SLA alert. You should immediately cease operating the equipment and inform the lab instructor or technician on duty.",
  },
];

function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_MAP[status] || {
    bg: "bg-slate-800",
    text: "text-slate-300",
    border: "border-slate-700",
    dot: "bg-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${conf.bg} ${conf.text} ${conf.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
      {status}
    </span>
  );
}

function FAQAccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 text-slate-200 hover:text-white transition-colors"
      >
        <span className="font-semibold text-sm leading-snug">{q}</span>
        <span className={`text-base font-mono font-bold transition-transform duration-200 ${open ? "rotate-45 text-blue-400" : "text-slate-500"}`}>
          +
        </span>
      </button>
      {open && (
        <div className="pb-4 text-xs text-slate-400 leading-relaxed pr-6">
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

  // Dynamic Backend State
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

  // Search & Filter State
  const [ticketSearch, setTicketSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [labDeptFilter, setLabDeptFilter] = useState<string>("all");
  const [quickSearchId, setQuickSearchId] = useState("");

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
      document.title = "Smart Equipment Care System (SECS) · University Lab Operations";
    }
  }, [universityName]);

  useEffect(() => {
    const saved = getCurrentUser();
    const token = getToken();
    if (saved && token) {
      setCurrentUser(saved);
    }
    if (token) {
      secsApi.auth.me().then((user) => {
        if (user) setCurrentUser(user);
      }).catch(() => {});
    }
    loadDynamicData();
  }, []);

  // Department tabs computed dynamically from labs
  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const l of labs) {
      if (l.department) set.add(l.department);
    }
    return Array.from(set);
  }, [labs]);

  const filteredLabs = useMemo(() => {
    if (labDeptFilter === "all") return labs;
    return labs.filter((l) => l.department === labDeptFilter);
  }, [labs, labDeptFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Please provide your full name and official email address.");
      setIsSubmitting(false);
      return;
    }
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    if (!isValidEmail) {
      setFormError("Please enter a valid email address (e.g. name@campus.edu or name@gmail.com).");
      setIsSubmitting(false);
      return;
    }
    if (!formData.lab) {
      setFormError("Please select the affected laboratory room.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.equipmentType) {
      setFormError("Please select the equipment classification.");
      setIsSubmitting(false);
      return;
    }
    if (formData.equipmentType === "Others" && !customEquipmentName.trim()) {
      setFormError("Please specify the custom device or hardware name.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 5) {
      setFormError("Please provide an engineering symptom description of at least 5 characters.");
      setIsSubmitting(false);
      return;
    }

    const finalEquipmentType = formData.equipmentType === "Others"
      ? customEquipmentName.trim()
      : formData.equipmentType;

    try {
      const selectedLab = labs.find((l) => `${l.room} · ${l.name}` === formData.lab || l.id === formData.lab);
      const res = await secsApi.issues.submitIssue({
        labId: selectedLab?.id,
        labName: selectedLab ? `${selectedLab.room} · ${selectedLab.name}` : formData.lab,
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
      setFormError(err?.message || "Failed to submit fault report to university database.");
    } finally {
      setIsSubmitting(false);
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

  function handleQuickLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!quickSearchId.trim()) return;
    setTicketSearch(quickSearchId.trim());
    document.querySelector("#transparency")?.scrollIntoView({ behavior: "smooth" });
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
    <div className="min-h-full bg-[#070c17] text-slate-100 antialiased selection:bg-blue-600/30 selection:text-white">
      {/* ── TOP INSTITUTIONAL STATUS BAR ── */}
      <div className="bg-[#050912] border-b border-white/[0.06] text-xs text-slate-400 py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {universityName ? `${universityName} · Campus Operations` : "Division of Engineering Facilities & Laboratory Infrastructure"}
            </span>
            <span className="hidden md:inline-block text-slate-600">|</span>
            <span className="hidden md:inline-block text-slate-400">
              ISO/IEC 17025 Standardized Instrument Registry
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <span className="text-amber-400">⚠️</span>
              Emergency Support: <strong className="text-slate-200">24/7 Priority SLA Alert</strong>
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
              Active Operations
            </span>
          </div>
        </div>
      </div>

      {/* ── ONE-TIME ADMIN SETUP BANNER (DISMISSES AUTOMATICALLY ONCE INITIALIZED) ── */}
      {!adminConfigured && (
        <aside aria-label="First-time setup banner" className="bg-amber-500 text-slate-950 px-6 py-2 border-b border-amber-600 font-medium text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">Notice:</span>
              <span>Primary Master Administrator account is not yet configured for this installation.</span>
            </div>
            <button
              onClick={() => {
                setPortalRole("admin");
                setPage("setup-admin");
              }}
              className="px-3 py-1 rounded bg-slate-950 text-amber-300 hover:text-white font-bold text-xs transition-colors"
            >
              Configure Master Admin Now →
            </button>
          </div>
        </aside>
      )}

      {/* ── PRIMARY NAVIGATION BAR ── */}
      <nav className="sticky top-0 z-50 bg-[#070c17]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg text-white tracking-tight">SECS</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                  v2.6
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none hidden sm:block">
                {universityName || "Smart Equipment Care System"}
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors duration-150 py-1"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* User / Authentication Actions */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f172a] border border-white/10 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200 font-medium">{currentUser.name}</span>
                  <span className="font-mono text-[10px] uppercase text-blue-400 px-1 py-0.2 rounded bg-blue-500/10">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={() => setPage("dashboard")}
                  className="px-3.5 py-1.5 rounded-lg btn-institutional-primary text-xs font-semibold"
                >
                  Workspace →
                </button>
                <button
                  onClick={handleLogout}
                  className="hidden sm:inline-block text-xs text-slate-400 hover:text-white px-2.5 py-1.5"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage("register")}
                  className="hidden sm:inline-block px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/10 transition-colors"
                >
                  Register
                </button>
                <button
                  onClick={() => setPage("login")}
                  className="px-3.5 py-1.5 rounded-lg btn-institutional-primary text-xs font-semibold"
                >
                  Sign In →
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && (
          <div className="lg:hidden bg-[#0a1122] border-t border-white/10 px-4 py-4 space-y-2 text-xs">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-slate-300 hover:text-white py-1.5 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              {currentUser ? (
                <>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setPage("dashboard");
                    }}
                    className="w-full py-2 rounded-lg btn-institutional-primary text-center font-semibold"
                  >
                    Open Workspace ({currentUser.name})
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="w-full py-2 rounded-lg text-rose-300 hover:bg-rose-500/10 text-center font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setPage("login");
                    }}
                    className="w-full py-2 rounded-lg btn-institutional-primary text-center font-semibold"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setPage("register");
                    }}
                    className="w-full py-2 rounded-lg bg-white/[0.04] text-slate-300 text-center font-medium border border-white/10"
                  >
                    Create Academic Account
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION: ARCHITECTURAL & PURPOSEFUL ── */}
      <header id="overview" className="border-b border-white/[0.08] relative overflow-hidden bg-gradient-to-b from-[#091122] via-[#070c17] to-[#070c17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Centralized University Laboratory Maintenance Infrastructure</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight leading-[1.16]">
                Precision Equipment Care, <br />
                <span className="text-blue-400">Verifiable Accountability,</span> <br />
                Zero Laboratory Downtime.
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                An authoritative university platform connecting students, researchers, faculty, certified lab technicians, and fiscal administrators. Log instrument defects with instant automated dispatch, transparent audit trails, and strict SLA resolution timelines.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#requisition"
                  className="px-5 py-2.5 rounded-lg btn-institutional-primary text-xs font-semibold flex items-center gap-2"
                >
                  <span>File Equipment Requisition</span>
                  <span>↓</span>
                </a>
                <a
                  href="#transparency"
                  className="px-5 py-2.5 rounded-lg btn-institutional-secondary text-xs font-semibold"
                >
                  Track Existing Ticket
                </a>
                <button
                  onClick={() => setPage("login")}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Staff Portal Sign In →
                </button>
              </div>

              {/* Concrete Key Operational Standards */}
              <div className="pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Max Response Time</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">&lt; 24 Hours</div>
                  <div className="text-[10px] text-blue-400 mt-0.5">Automated tech dispatch</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Connected Labs</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">{labs.length || "12"} Facilities</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Active research rooms</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Audit Compliance</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">100% Verified</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">PostgreSQL ledger</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Resolved Hardware</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{stats?.issuesResolvedCount ?? issues.filter(i => i.status === "Resolved").length} Units</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Back in operation</div>
                </div>
              </div>
            </div>

            {/* Right: Operational Dispatch Monitor & Instant Lookup */}
            <div className="lg:col-span-5 space-y-4">
              <div className="surface-card rounded-xl p-5 border border-white/[0.1] shadow-xl">
                <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 radar-indicator" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Live Operations Monitor
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {issues.length} Active Tickets
                  </span>
                </div>

                {/* Instant Ticket Quick Lookup */}
                <form onSubmit={handleQuickLookup} className="mt-4 mb-4">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Fast Ticket Verification
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Ticket ID (e.g. TKT-1006)"
                      value={quickSearchId}
                      onChange={(e) => setQuickSearchId(e.target.value)}
                      className="flex-1 form-input rounded-lg px-3 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg btn-institutional-primary text-xs font-semibold whitespace-nowrap"
                    >
                      Track
                    </button>
                  </div>
                </form>

                {/* Real Recent Incident Feed */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Recent Requisitions
                  </span>
                  {issues.slice(0, 3).map((iss) => (
                    <div
                      key={iss.id}
                      className="p-3 rounded-lg bg-[#0b1325] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-400 text-xs">{iss.id}</span>
                          <span className="text-slate-400 truncate text-[11px]">{iss.labName || iss.lab}</span>
                        </div>
                        <div className="font-semibold text-slate-200 truncate mt-0.5">{iss.item}</div>
                      </div>
                      <StatusBadge status={iss.status} />
                    </div>
                  ))}
                  {issues.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No hardware faults reported. Facilities functioning smoothly.
                    </div>
                  )}
                </div>

                {/* Direct Help Desk Note */}
                <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
                  <span>Facilities Staff on Duty: <strong className="text-slate-200">Available</strong></span>
                  <a href="#facilities" className="text-blue-400 hover:text-blue-300 font-semibold">
                    Browse All Labs →
                  </a>
                </div>
              </div>

              {/* Priority Standards Strip */}
              <div className="surface-card rounded-xl p-3.5 border border-white/[0.08] text-xs">
                <div className="text-[11px] font-semibold text-slate-300 mb-2">Priority Response Protocol (SLA)</div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    <div className="font-bold">Critical</div>
                    <div className="text-slate-400">24 Hours</div>
                  </div>
                  <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300">
                    <div className="font-bold">High</div>
                    <div className="text-slate-400">3 Days</div>
                  </div>
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    <div className="font-bold">Medium</div>
                    <div className="text-slate-400">7 Days</div>
                  </div>
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <div className="font-bold">Low</div>
                    <div className="text-slate-400">14 Days</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── CAMPUS ANNOUNCEMENT BANNER ── */}
      {announcements.length > 0 && (
        <aside aria-label="Official Campus Announcement" className="bg-[#0b162d] border-b border-blue-500/20 px-4 sm:px-6 py-2.5 text-xs text-blue-200">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
              Campus Notice
            </span>
            <span className="truncate">{announcements[0]?.message}</span>
          </div>
        </aside>
      )}

      {/* ── WORKFLOW: 4-STAGE ARCHITECTURAL PROTOCOL ── */}
      <section className="py-16 border-b border-white/[0.08] bg-[#080f1e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 block mb-1">
              Standard Operating Procedure
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Lifecycle of an Equipment Requisition
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1.5">
              Clear institutional protocols ensure every report is assigned to an identifiable laboratory technician with verified funding milestones.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROTOCOL_STEPS.map((step, idx) => (
              <div key={step.step} className="surface-card rounded-xl p-5 flex flex-col justify-between relative">
                <div>
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-mono font-bold text-blue-400 text-sm">Step {step.step}</span>
                    <span className="text-[10px] font-mono uppercase text-slate-500">{step.tag}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-slate-500 flex items-center justify-between font-mono">
                  <span>Phase {idx + 1} of 4</span>
                  <span>✓ Standardized</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LABORATORY DIRECTORY & ROOM ASSIGNMENTS ── */}
      <section id="facilities" className="py-16 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 block mb-1">
                Campus Facilities
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                University Laboratory Directory
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Designated instructional facilities, assigned lead technicians, and active maintenance coverage.
              </p>
            </div>

            {/* Department Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setLabDeptFilter("all")}
                className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${labDeptFilter === "all"
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/5"
                  }`}
              >
                All Facilities ({labs.length})
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setLabDeptFilter(dept)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${labDeptFilter === dept
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/5"
                    }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Laboratory Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {filteredLabs.map((lab) => (
              <div key={lab.id} className="surface-card rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/25">
                      Room {lab.room}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active Coverage
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{lab.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{lab.department || "Engineering Sciences"}</p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Lead Technician</span>
                    <span className="font-semibold text-slate-200">{lab.technicianName || "Assigned on Dispatch"}</span>
                  </div>
                  <button
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, lab: `${lab.room} · ${lab.name}` }));
                      document.querySelector("#requisition")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 transition-all"
                  >
                    Select Room →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Category Picker */}
          {equipmentTypes.length > 0 && (
            <div className="p-5 rounded-xl bg-[#091224] border border-white/[0.06]">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Quick Requisition by Equipment Classification
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {equipmentTypes.map((eq) => (
                  <button
                    key={eq.label}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, equipmentType: eq.label }));
                      document.querySelector("#requisition")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="p-3 rounded-lg bg-[#0e1933] hover:bg-[#15254a] border border-white/5 hover:border-blue-500/30 text-center transition-all flex flex-col items-center gap-1.5"
                  >
                    <span className="text-xl">{eq.icon}</span>
                    <span className="text-xs font-medium text-slate-300 leading-tight truncate w-full">{eq.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, equipmentType: "Others" }));
                    document.querySelector("#requisition")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="p-3 rounded-lg bg-[#0e1933] hover:bg-[#15254a] border border-amber-500/30 text-center transition-all flex flex-col items-center gap-1.5"
                >
                  <span className="text-xl">➕</span>
                  <span className="text-xs font-semibold text-amber-300 leading-tight">Others</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── CORE FAULT REQUISITION FORM ── */}
      <section id="requisition" className="py-16 border-b border-white/[0.08] bg-[#070d1c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Guidelines & Protocols */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 block mb-1">
                  Official Requisition Entry
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                  Report Hardware Malfunction
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Experiencing an instrument breakdown, power delivery fault, calibration failure, or broken optical component? Log your technical report below.
                </p>
              </div>

              {/* Strict SLA Matrix Box */}
              <div className="surface-card rounded-xl p-4 border border-white/[0.08]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Institutional Resolution Guarantees
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    <span className="font-semibold">Critical: 24-Hour Protocol</span>
                    <span className="text-[11px] opacity-80">Safety, smoke, or complete lab halt</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">
                    <span className="font-semibold">High: 72-Hour Resolution</span>
                    <span className="text-[11px] opacity-80">Core workstation or instructional rig</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <span className="font-semibold">Medium: 7-Day Resolution</span>
                    <span className="text-[11px] opacity-80">Minor measurement instrument</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    <span className="font-semibold">Low: 14-Day Routine</span>
                    <span className="text-[11px] opacity-80">Preventive maintenance or cosmetic defect</span>
                  </div>
                </div>
              </div>

              {/* Compliance checklist */}
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Sequential Tracking ID:</strong> Guaranteed unique PostgreSQL ID generated instantly.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Direct Staff Mapping:</strong> Automatically assigned to the certified room technician.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Student Email Masking:</strong> External viewers only see masked credentials for privacy.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Automated Email Dispatch:</strong> Progress and completion updates delivered via Brevo API.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Requisition Form */}
            <div className="lg:col-span-7">
              <div className="surface-card rounded-xl p-6 sm:p-8 border border-white/[0.1] shadow-2xl">
                {submittedTicket ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 text-2xl">
                      ✓
                    </div>
                    <h3 className="text-xl font-bold font-display text-white mb-1">
                      Requisition Registered Successfully
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Official University Maintenance Tracking Voucher
                    </p>

                    <div className="p-4 rounded-xl bg-[#091122] border border-blue-500/30 inline-block mb-4">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                        Tracking Voucher ID
                      </div>
                      <div className="font-mono text-2xl font-bold text-blue-400">
                        {submittedTicket}
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                      Your ticket has been written to the university database and routed directly to the designated laboratory technician. Track live resolution progress below.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setTicketSearch(submittedTicket);
                          document.querySelector("#transparency")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="px-5 py-2.5 rounded-lg btn-institutional-primary text-xs font-semibold"
                      >
                        Locate in Transparency Tracker ↓
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
                        className="px-4 py-2.5 rounded-lg btn-institutional-secondary text-xs font-semibold"
                      >
                        Submit Another Requisition
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div className="border-b border-white/[0.08] pb-3 mb-2">
                      <h3 className="text-base font-bold text-white">Lab Equipment Fault Report Form</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Please provide accurate facility and hardware details.</p>
                    </div>

                    {formError && (
                      <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
                        {formError}
                      </div>
                    )}

                    {/* Reporter Name & Email */}
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                          Reporter Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Shafiq Mollah or Dr. Tanvir"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full rounded-lg px-3.5 py-2 text-xs form-input"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                          Reporter Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. shafiq@campus.edu or user@gmail.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-lg px-3.5 py-2 text-xs form-input"
                        />
                      </div>
                    </div>

                    {/* Laboratory & Equipment Selection */}
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                          Laboratory Facility *
                        </label>
                        <select
                          required
                          value={formData.lab}
                          onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
                          className="w-full rounded-lg px-3.5 py-2 text-xs form-input bg-[#0a1122]"
                        >
                          <option value="">Select campus lab room</option>
                          {labs.map((lab) => (
                            <option key={lab.id} value={`${lab.room} · ${lab.name}`}>
                              Room {lab.room} · {lab.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                          Equipment Classification *
                        </label>
                        <select
                          required
                          value={formData.equipmentType}
                          onChange={(e) => {
                            setFormData({ ...formData, equipmentType: e.target.value });
                            if (e.target.value !== "Others") setCustomEquipmentName("");
                          }}
                          className="w-full rounded-lg px-3.5 py-2 text-xs form-input bg-[#0a1122]"
                        >
                          <option value="">Select equipment type</option>
                          {equipmentTypes.map((eq) => (
                            <option key={eq.label} value={eq.label}>
                              {eq.label}
                            </option>
                          ))}
                          <option value="Others">Others (Custom Device)</option>
                        </select>

                        {formData.equipmentType === "Others" && (
                          <div className="mt-2">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 block mb-1">
                              Custom Equipment / Device Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Optical Spectrum Analyzer, 3D Printer"
                              value={customEquipmentName}
                              onChange={(e) => setCustomEquipmentName(e.target.value)}
                              className="w-full rounded-lg px-3 py-1.5 text-xs form-input border-amber-500/40 text-amber-100 placeholder-slate-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Asset Tag & Urgency Tier */}
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                          Hardware Asset Tag / Serial (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. CSE-OSC-04 or SN-88214"
                          value={formData.assetTag}
                          onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                          className="w-full rounded-lg px-3.5 py-2 text-xs form-input font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                          Urgency Priority Tier *
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {["low", "medium", "high", "critical"].map((p) => {
                            const isSelected = formData.priority === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setFormData({ ...formData, priority: p })}
                                className={`py-1.5 rounded text-[11px] font-bold uppercase transition-all ${isSelected
                                    ? p === "critical"
                                      ? "bg-rose-600 text-white"
                                      : p === "high"
                                        ? "bg-orange-600 text-white"
                                        : p === "medium"
                                          ? "bg-amber-500 text-slate-950"
                                          : "bg-emerald-600 text-white"
                                    : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/5"
                                  }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Defect Description */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                        Technical Symptom Description *
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Detail the failure mode, error codes, burning smell, power supply failure, or broken cables..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-lg px-3.5 py-2 text-xs form-input resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-lg btn-institutional-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
                    >
                      {isSubmitting ? "Persisting Requisition to Database…" : "Submit Equipment Fault Ticket →"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PUBLIC TRANSPARENCY TRACKER ── */}
      <section id="transparency" className="py-16 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 block mb-1">
                Public Accountability
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                Live Transparency Tracker
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Real-time visibility into all campus laboratory maintenance tickets, assigned personnel, and fiscal milestones.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                {issues.length} Tickets Synchronized
              </span>
              <button
                onClick={loadDynamicData}
                className="text-xs font-medium px-3 py-1 rounded bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/10"
              >
                ↻ Refresh Live
              </button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="surface-card rounded-xl p-3.5 mb-5 flex flex-col sm:flex-row gap-3 items-center justify-between border border-white/[0.08]">
            <div className="relative w-full sm:max-w-md">
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Filter by Ticket ID (e.g. TKT-1006), hardware, or room..."
                className="w-full form-input rounded-lg pl-3 pr-8 py-1.5 text-xs font-mono"
              />
              {ticketSearch && (
                <button
                  onClick={() => setTicketSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {["all", "Assigned", "In Progress", "Budget Requested", "Resolved"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`text-xs px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${statusFilter === status
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-white/[0.02] text-slate-400 hover:text-white border border-white/5"
                    }`}
                >
                  {status === "all" ? "All Statuses" : status}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="surface-card rounded-xl overflow-hidden border border-white/[0.08]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#091122] text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="px-4 py-3 font-mono">Ticket</th>
                    <th className="px-4 py-3">Equipment Item</th>
                    <th className="px-4 py-3">Lab Facility</th>
                    <th className="px-4 py-3">Masked Reporter</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Current Stage</th>
                    <th className="px-4 py-3">Responsible Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
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
                      const pConf = PRIORITY_STYLES[issue.priority] || { label: issue.priority, badge: "bg-slate-800 text-slate-400 border-slate-700" };
                      const assignedTechName = labs.find(
                        (l) => l.id === issue.labId || (l.room && (issue.labName || issue.lab || "").toLowerCase().includes(l.room.toLowerCase()))
                      )?.technicianName || issue.pendingWith || "Lab Coordinator";

                      return (
                        <tr key={issue.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-blue-400">{issue.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-100">{issue.item}</td>
                          <td className="px-4 py-3 text-slate-300">{issue.labName || issue.lab}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{issue.reporter || issue.reporterEmail}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${pConf.badge}`}>
                              {issue.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={issue.status} />
                          </td>
                          <td className="px-4 py-3 text-slate-400">{issue.currentStage}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 font-medium">
                              {assignedTechName}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {issues.length === 0 && !isLoading && (
              <div className="py-14 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 text-lg">
                  ✓
                </div>
                <h4 className="text-sm font-bold text-white">Clean System Slate</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  All laboratory hardware is operating smoothly. Submit the first report above to initialize live tracking.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── PUBLIC FINANCIAL AUDIT & INCIDENT LEDGER ── */}
      <section className="py-16 border-b border-white/[0.08] bg-[#080e1c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 block mb-1">
              Financial Accountability
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Public Incident & Expenditure Audit Ledger
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Immutable log of payment disbursements, funding approvals, or technician receipt concerns.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="surface-card rounded-xl p-4 border border-rose-500/20 bg-rose-500/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase">
                      Payment Disputed
                    </span>
                    <span className="font-mono text-xs text-amber-300 font-bold">{incident.ticketId}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{incident.createdAt}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">{incident.message}</p>
                <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                  <span>Author: Verified Technician</span>
                  {incident.amount && (
                    <span className="font-mono font-bold text-amber-300">৳{incident.amount.toLocaleString("en-BD")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {incidents.length === 0 && (
            <div className="surface-card p-6 rounded-xl text-center text-xs text-slate-400 border border-white/[0.06]">
              All repair budgets and accounts disbursements have been reconciled and verified without discrepancy.
            </div>
          )}
        </div>
      </section>

      {/* ── SAFETY PROTOCOLS & HAZARD MITIGATION ── */}
      <section id="safety" className="py-16 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Safety Compliance
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Campus Laboratory Emergency Protocols
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Mandatory steps for handling hazardous malfunctions, electrical sparks, and chemical spill risks.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="surface-card rounded-xl p-5 border border-rose-500/20">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm mb-3">
                ⚡
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Electrical / Spark Hazard</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Immediately hit the room&apos;s Emergency Power Off (EPO) button. Cease all device operations, evacuate the immediate workstation, and submit a Critical ticket.
              </p>
            </div>

            <div className="surface-card rounded-xl p-5 border border-amber-500/20">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm mb-3">
                ⚠️
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Laser & Optical Alignment</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                De-energize optical sources. Do not attempt manual calibration of misaligned laser optics or high-voltage supplies without a certified technician.
              </p>
            </div>

            <div className="surface-card rounded-xl p-5 border border-blue-500/20">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm mb-3">
                🛡️
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Centrifuge & Autoclave</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If excessive vibration or pressure seal leakage is detected, abort cycle immediately. Allow chamber to depressurize before reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-16 border-b border-white/[0.08] max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 block mb-1">Support</span>
          <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="surface-card rounded-xl p-5 border border-white/[0.08]">
          {FAQS.map((faq) => (
            <FAQAccordionItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── INSTITUTIONAL FOOTER ── */}
      <footer className="py-12 bg-[#040812] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              S
            </div>
            <div>
              <span className="font-display font-bold text-sm text-white">
                {universityName || "Smart Equipment Care System (SECS)"}
              </span>
              <p className="text-[11px] text-slate-500">
                Division of Campus Engineering Facilities & Laboratory Infrastructure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-slate-400">
            <a href="#overview" className="hover:text-white transition-colors">Overview</a>
            <a href="#facilities" className="hover:text-white transition-colors">Laboratories</a>
            <a href="#requisition" className="hover:text-white transition-colors">Requisition</a>
            <a href="#transparency" className="hover:text-white transition-colors">Transparency</a>
            <a href="#safety" className="hover:text-white transition-colors">Safety</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} University Equipment Care Division. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
