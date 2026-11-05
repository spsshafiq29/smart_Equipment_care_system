import { useEffect, useState } from "react";
import DashboardPage from "./DashboardPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import { secsApi } from "./services/secsApi";
import type {
  Announcement,
  AuditIncident,
  DashboardStats,
  EquipmentTypeOption,
  Lab,
  PortalRole,
  PublicIssue,
} from "./workflowTypes";

type Page = "landing" | "login" | "register" | "dashboard";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Submit Issue", href: "#submit" },
  { label: "Track Status", href: "#track" },
  { label: "Lab Directory", href: "#labs" },
  { label: "FAQ", href: "#faq" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Identify the Equipment",
    desc: "Locate the asset tag or serial number on the malfunctioning device. If unavailable, a description is sufficient.",
  },
  {
    step: "02",
    title: "Submit the Report",
    desc: "Fill out the online form with your contact details, lab location, equipment type, and a description of the fault.",
  },
  {
    step: "03",
    title: "Receive a Ticket",
    desc: "A case number is generated and logged immediately. The technical team reviews and prioritises your report within 24 hours.",
  },
  {
    step: "04",
    title: "Track & Resolve",
    desc: "Check live status updates on the transparency tracker at any time. You'll be notified when equipment is repaired.",
  },
];

const PORTAL_CARDS: { role: PortalRole; title: string; description: string; actions: string[] }[] = [
  {
    role: "admin",
    title: "Admin Portal",
    description: "Create staff accounts and control room-level technician assignments.",
    actions: ["Create technician accounts", "Assign or remove labs", "Monitor every workflow"],
  },
  {
    role: "authority",
    title: "Higher Authority",
    description: "Approve budgets, oversee staff access, and investigate disputed payments.",
    actions: ["Approve repair budgets", "Manage staff access", "Open investigations"],
  },
  {
    role: "accounts",
    title: "Accounts Portal",
    description: "Receive approved requests and confirm when funds are released.",
    actions: ["View approved budgets", "Confirm technician payment", "Maintain payment trail"],
  },
  {
    role: "technician",
    title: "Technician Portal",
    description: "See only assigned labs, assess repairs, request budgets, and challenge false payment records.",
    actions: ["View assigned lab issues", "Track repair budgets", "Publish payment concerns"],
  },
];

const STATUS_COLORS: Record<string, string> = {
  Resolved: "bg-green-100 text-green-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Under Review": "bg-amber-100 text-amber-700",
  Assigned: "bg-violet-100 text-violet-800",
  "Budget Requested": "bg-amber-100 text-amber-800",
  "Payment Review": "bg-cyan-100 text-cyan-800",
  "Rejected by Higher Authority": "bg-red-100 text-red-800",
  "Payment Disputed": "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "text-red-500 font-bold",
  High: "text-red-400",
  Medium: "text-amber-400",
  Low: "text-green-400",
};

const FAQS = [
  {
    q: "Who can submit an equipment report?",
    a: "Any registered student, lecturer, or researcher with an active university ID can submit a report. The system connects directly to lab coordinators and assigned technicians.",
  },
  {
    q: "How long does it take for an issue to be resolved?",
    a: "Critical issues are addressed within 24 hours. High priority issues take up to 3 days, while standard repairs take 3–7 working days depending on parts and budget approval.",
  },
  {
    q: "Can I report an issue anonymously?",
    a: "You must provide a valid university email for verification. On the public transparency tracker, your email is masked (e.g. sa***@uitc.edu) to protect your privacy.",
  },
  {
    q: "What if the equipment poses a safety risk?",
    a: "Mark the issue as 'Critical' priority during submission. Do not operate the equipment and alert the lab supervisor immediately.",
  },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 text-white/70 hover:text-white transition-colors duration-150"
      >
        <span className="font-medium text-[15px] leading-snug">{q}</span>
        <span className="text-xl text-white/30 shrink-0">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="pb-5 text-sm text-white/40 leading-relaxed pr-8">{a}</p>}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [portalRole, setPortalRole] = useState<PortalRole>("admin");
  const [mobileOpen, setMobileOpen] = useState(false);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");

  // Load all dynamic data from backend API
  const loadDynamicData = async () => {
    try {
      setIsLoading(true);
      const [statsData, labsData, issuesData, eqData, annData, incData] = await Promise.all([
        secsApi.stats.getDashboardStats().catch(() => null),
        secsApi.labs.getLabs().catch(() => []),
        secsApi.issues.getPublicIssues().catch(() => []),
        secsApi.meta.getEquipmentTypes().catch(() => []),
        secsApi.meta.getAnnouncements().catch(() => []),
        secsApi.audit.getIncidents().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      if (labsData) setLabs(labsData);
      if (issuesData) setIssues(issuesData);
      if (eqData) setEquipmentTypes(eqData);
      if (annData) setAnnouncements(annData);
      if (incData) setIncidents(incData);
    } catch (err) {
      console.error("Failed to load initial SECS data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDynamicData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      // Find matching labId from selected room/name
      const selectedLab = labs.find((l) => `${l.room} · ${l.name}` === formData.lab || l.room === formData.lab);
      const res = await secsApi.issues.submitIssue({
        labId: selectedLab?.id || "lab-1",
        labName: formData.lab,
        equipmentType: formData.equipmentType,
        assetTag: formData.assetTag,
        description: formData.description,
        priority: formData.priority,
        reporterName: formData.name,
        reporterEmail: formData.email,
      });

      setSubmittedTicket(res.issue.id);
      // Refresh dynamic tracker and stats immediately from backend
      loadDynamicData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to submit issue. Please check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openPortal(role: PortalRole) {
    try {
      // Authenticate with demo credentials to get real session token
      await secsApi.auth.login({ portal: role, email: `${role}@uitc.edu` });
      setPortalRole(role);
      setPage("dashboard");
    } catch {
      // Fallback direct navigation
      setPortalRole(role);
      setPage("dashboard");
    }
  }

  if (page === "login") {
    return (
      <LoginPage
        onNavigate={(p) => setPage(p)}
        onLogin={(role) => {
          setPortalRole(role);
          setPage("dashboard");
        }}
      />
    );
  }

  if (page === "register") {
    return <RegisterPage onNavigate={(p) => setPage(p)} />;
  }

  if (page === "dashboard") {
    return (
      <DashboardPage
        initialRole={portalRole}
        issues={issues}
        setIssues={setIssues}
        incidents={incidents}
        setIncidents={setIncidents}
        onLogout={() => {
          secsApi.auth.logout();
          setPage("landing");
        }}
      />
    );
  }

  return (
    <div className="min-h-full text-white" style={{ background: "#070f20" }}>
      {/* ── FULL-SCREEN HERO (nav embedded) ── */}
      <section
        id="home"
        className="relative min-h-screen flex flex-col overflow-hidden text-white"
        style={{ background: "linear-gradient(135deg, #050d1f 0%, #071428 50%, #0a1e3a 100%)" }}
      >
        {/* Background: lab photo collage */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1800&h=1000&fit=crop&auto=format"
            alt=""
            className="w-full h-full object-cover object-center opacity-20"
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(5,13,31,0.97) 0%, rgba(7,20,40,0.85) 50%, rgba(5,13,31,0.6) 100%)",
            }}
          />
        </div>

        {/* Decorative grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Glowing orbs */}
        <div
          className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #d4550a 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-1/3 left-1/3 w-72 h-72 rounded-full opacity-8 blur-3xl"
          style={{ background: "radial-gradient(circle, #0e2d5c 0%, transparent 70%)" }}
        />

        {/* NAV */}
        <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 h-16 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-base"
              style={{ background: "linear-gradient(135deg, #d4550a, #e8700a)" }}
            >
              S
            </div>
            <div>
              <span style={{ fontFamily: "var(--font-display)" }} className="text-white text-base leading-none tracking-tight">
                SECS
              </span>
              <span className="hidden sm:inline text-white/30 text-xs ml-2">Smart Equipment Care System</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="text-white/50 hover:text-white transition-colors duration-150">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => document.querySelector("#portal-access")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm text-white/60 hover:text-white px-4 py-1.5 rounded border border-white/10 hover:border-white/25 transition-all duration-150"
            >
              Staff Portals
            </button>
            <button
              onClick={() => setPage("register")}
              className="text-sm font-semibold px-4 py-1.5 rounded transition-colors duration-150 text-white"
              style={{ background: "linear-gradient(135deg, #d4550a, #b83d00)" }}
            >
              Register
            </button>
            <button className="md:hidden text-white/60 ml-1" onClick={() => setMobileOpen(!mobileOpen)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </nav>
        {mobileOpen && (
          <div className="relative z-20 bg-[#071428] border-b border-white/10 px-6 py-4 flex flex-col gap-3 text-sm">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="text-white/50 hover:text-white" onClick={() => setMobileOpen(false)}>
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* HERO CONTENT */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-6 md:px-10 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 text-xs font-semibold uppercase tracking-widest">UITC University · Live Operations</span>
              </div>

              <h1 style={{ fontFamily: "var(--font-display)" }} className="text-4xl sm:text-5xl lg:text-6xl leading-[1.1] mb-6 text-white">
                Smart Equipment<br />
                <span style={{ color: "#d4550a" }}>Care System</span><br />
                <span className="text-white/60 text-3xl sm:text-4xl lg:text-5xl">(SECS)</span>
              </h1>

              <p className="text-white/55 text-lg leading-relaxed mb-4 max-w-lg">
                A fully dynamic university platform for reporting, tracking, and resolving lab equipment issues — transparently, digitally, and fast.
              </p>

              <div className="flex flex-col gap-2 mb-8">
                {[
                  "🔬 Microscope or lab device malfunctioning? Report it in seconds.",
                  "📡 Live public tracking shows every handoff and responsible office.",
                  "🛡️ Transparent financial ledger ensures complete accountability.",
                ].map((line) => (
                  <p key={line} className="text-white/50 text-sm">
                    {line}
                  </p>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#submit"
                  className="font-semibold px-7 py-3.5 rounded-lg text-white transition-all duration-200 hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #d4550a, #b83d00)" }}
                >
                  Report Equipment Fault ↓
                </a>
                <button
                  onClick={() => setPage("login")}
                  className="px-7 py-3.5 rounded-lg border border-white/20 hover:border-white/40 text-white/70 hover:text-white transition-all duration-200 text-sm font-medium"
                >
                  Sign In to Portal
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                <span className="text-white/30 text-xs self-center mr-1">Designed for:</span>
                {["Students", "Teachers", "Technicians", "Higher Authority", "Accounts Office"].map((r) => (
                  <span key={r} className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-white/40">
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: visual card cluster with dynamic stats */}
            <div className="hidden lg:flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ height: 220 }}>
                <img
                  src="https://images.unsplash.com/photo-1532094349884-543559c02254?w=700&h=300&fit=crop&auto=format"
                  alt="University laboratory"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(5,13,31,0.7) 0%, transparent 60%)" }} />
                <div className="absolute bottom-4 left-4">
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-0.5">Campus Infrastructure</p>
                  <p className="text-white font-semibold text-sm">
                    {labs.length > 0 ? `${labs.length} University Labs Connected` : "Active University Labs"}
                  </p>
                </div>
              </div>

              {/* Dynamic Stats row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: stats?.issuesResolvedFormatted || "2,400+", label: "Issues Resolved" },
                  { value: stats?.avgResponseTime || "48 hr", label: "Avg. Response" },
                  { value: String(stats?.labsSupported || labs.length || "14"), label: "Labs Active" },
                  { value: stats?.satisfactionRate || "98%", label: "Satisfaction" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-white/10 p-4 text-center"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <div style={{ fontFamily: "var(--font-display)", color: "#d4550a" }} className="text-2xl mb-0.5">
                      {s.value}
                    </div>
                    <div className="text-white/35 text-[10px] uppercase tracking-wider leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* SLA tier strip */}
              <div className="rounded-xl border border-white/10 p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3 font-semibold">SLA Auto-Escalation Tiers</p>
                <div className="flex gap-2">
                  {[
                    { label: "Critical", time: "24 h", color: "#ef4444" },
                    { label: "High", time: "3 days", color: "#f97316" },
                    { label: "Medium", time: "7 days", color: "#eab308" },
                    { label: "Low", time: "14 days", color: "#22c55e" },
                  ].map((t) => (
                    <div
                      key={t.label}
                      className="flex-1 rounded-lg border px-2 py-2 text-center"
                      style={{ borderColor: t.color + "40", background: t.color + "10" }}
                    >
                      <div className="text-[10px] font-semibold mb-0.5" style={{ color: t.color }}>
                        {t.label}
                      </div>
                      <div className="text-white/40 text-[10px]">{t.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom scroll cue */}
        <div className="relative z-10 flex justify-center pb-6">
          <a href="#how" className="flex flex-col items-center gap-1 text-white/20 hover:text-white/40 transition-colors">
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── DYNAMIC ANNOUNCEMENT BANNER ── */}
      {announcements.length > 0 && (
        <div
          className="bg-amber-400/10 border-y border-amber-400/20 px-6 py-3 text-sm text-amber-300 flex items-center justify-center gap-2"
          style={{ background: "#0a1628" }}
        >
          <span className="font-semibold text-amber-400">⚠ Notice:</span>
          <span>{announcements[0]?.message}</span>
        </div>
      )}

      {/* ── STAFF PORTAL ACCESS ── */}
      <section id="portal-access" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col gap-4 mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2 text-amber-400">Role-based workspaces</p>
            <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl md:text-4xl text-white">
              Open and test every staff portal
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
              Each portal connects to real backend data and enforces permissions according to the university workflow rules.
            </p>
          </div>
          <button
            onClick={() => setPage("login")}
            className="self-start rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Open secure sign in
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PORTAL_CARDS.map((portal) => (
            <article
              key={portal.role}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-amber-400/30"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-sm font-black text-amber-400">
                {portal.title.split(" ").map((word) => word[0]).join("")}
              </div>
              <h3 className="text-lg font-semibold text-white">{portal.title}</h3>
              <p className="mt-2 min-h-16 text-sm leading-5 text-white/40">{portal.description}</p>
              <ul className="my-5 space-y-2">
                {portal.actions.map((action) => (
                  <li key={action} className="flex items-center gap-2 text-xs text-white/55">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/10 text-[10px] text-emerald-300">
                      ✓
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openPortal(portal.role)}
                className="mt-auto w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                Launch {portal.title}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-20" style={{ color: "white" }}>
        <div className="mb-12">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "#d4550a" }}>
            Process
          </p>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl md:text-4xl text-white">
            How the Reporting System Works
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="relative p-6 rounded-xl border border-white/8 hover:border-white/15 transition-colors"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="text-5xl font-bold mb-4 text-white/10" style={{ fontFamily: "var(--font-display)" }}>
                {item.step}
              </div>
              <div className="w-10 h-0.5 mb-4" style={{ background: "#d4550a" }} />
              <h3 className="font-semibold text-base mb-2 text-white">{item.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LAB DIRECTORY & EQUIPMENT (DYNAMIC) ── */}
      <section id="labs" className="border-y border-white/8 py-14 scroll-mt-20" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-2">Live Directory</p>
              <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl text-white">
                University Lab Directory
              </h2>
              <p className="mt-2 text-sm text-white/40">
                Current status, responsible technicians, and open ticket counts queried directly from the backend.
              </p>
            </div>
            <button
              onClick={loadDynamicData}
              className="mt-3 md:mt-0 self-start text-xs text-white/50 hover:text-white px-3 py-1.5 rounded border border-white/10"
            >
              ↻ Refresh Data
            </button>
          </div>

          <div className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {labs.map((lab) => (
              <article key={lab.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs font-semibold text-amber-400">{lab.room}</p>
                    <h3 className="mt-1 font-semibold text-white">{lab.name}</h3>
                    <p className="mt-1 text-xs text-white/35">{lab.department}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${lab.technicianId ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-amber-400"}`}
                      title={lab.technicianId ? "Technician assigned" : "Awaiting assignment"}
                    />
                    {lab.openIssues > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300">
                        {lab.openIssues} open
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 border-t border-white/8 pt-3 text-xs text-white/45 flex justify-between">
                  <span>
                    Responsible: <strong className="text-white/70">{lab.technicianName || "Assigned"}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, lab: `${lab.room} · ${lab.name}` }));
                      document.querySelector("#submit")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-amber-400 hover:underline"
                  >
                    Select Lab →
                  </button>
                </div>
              </article>
            ))}
          </div>

          <p className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-6">Supported Equipment Categories</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {equipmentTypes.map((eq) => (
              <div
                key={eq.label}
                onClick={() => {
                  setFormData((prev) => ({ ...prev, equipmentType: eq.label }));
                  document.querySelector("#submit")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="border border-white/8 rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 cursor-pointer hover:border-orange-500/40 hover:bg-orange-500/5"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <span className="text-2xl">{eq.icon}</span>
                <span className="text-xs font-medium text-center leading-tight text-white/40">{eq.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBMIT FORM (CONNECTED TO API) ── */}
      <section id="submit" className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-5 gap-12 items-start">
        <div className="md:col-span-2">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "#d4550a" }}>
            Report a Problem
          </p>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl md:text-4xl mb-4 text-white">
            Submit Your Equipment Issue
          </h2>
          <p className="text-white/45 text-sm leading-relaxed mb-6">
            Use the form to report any fault or malfunction. Submissions are processed immediately and automatically assigned to the responsible lab technician.
          </p>
          <div className="rounded-xl border border-white/8 p-5 space-y-3" style={{ background: "rgba(255,255,255,0.03)" }}>
            {["Instant case number generation", "24-hour review for high-priority equipment", "Live status updates on public tracker"].map((txt) => (
              <div key={txt} className="flex items-center gap-3 text-sm">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                  style={{ background: "#d4550a" }}
                >
                  ✓
                </span>
                <span className="text-white/60">{txt}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 rounded-xl border border-white/10 p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
          {submittedTicket ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <span className="text-2xl text-green-400">✓</span>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)" }} className="text-2xl mb-2 text-white">
                Report Submitted to SECS!
              </h3>
              <p className="text-white/45 text-sm mb-2">
                Your ticket number is <strong className="text-amber-400 text-base">{submittedTicket}</strong>
              </p>
              <p className="text-white/45 text-sm mb-6">
                The responsible lab technician has received your submission and the public tracker has been updated.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => document.querySelector("#track")?.scrollIntoView({ behavior: "smooth" })}
                  className="px-5 py-2.5 rounded text-sm font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors"
                >
                  Track this report ↓
                </button>
                <button
                  onClick={() => {
                    setSubmittedTicket(null);
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
                  className="px-5 py-2.5 rounded text-sm font-medium transition-colors text-white"
                  style={{ background: "#0e2d5c" }}
                >
                  Submit Another Report
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-white/40 mb-1.5">Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="Sarah Chen"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-white/40 mb-1.5">University Email *</label>
                  <input
                    required
                    type="email"
                    placeholder="s.chen@uitc.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-white/40 mb-1.5">Lab / Location *</label>
                  <select
                    required
                    value={formData.lab}
                    onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm text-white bg-[#0a1628] border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition"
                  >
                    <option value="">Select a lab</option>
                    {labs.map((lab) => (
                      <option key={lab.id} value={`${lab.room} · ${lab.name}`}>
                        {lab.room} · {lab.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-white/40 mb-1.5">Equipment Type *</label>
                  <select
                    required
                    value={formData.equipmentType}
                    onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm text-white bg-[#0a1628] border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition"
                  >
                    <option value="">Select type</option>
                    {equipmentTypes.map((eq) => (
                      <option key={eq.label} value={eq.label}>
                        {eq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-white/40 mb-1.5">Asset Tag / Serial No.</label>
                  <input
                    type="text"
                    placeholder="e.g. LAB-0042 or Cisco SW-08"
                    value={formData.assetTag}
                    onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-white/40 mb-1.5">Priority Level *</label>
                  <div className="flex gap-2 mt-1">
                    {["low", "medium", "high", "critical"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: p })}
                        className={`flex-1 py-2 rounded text-xs font-semibold capitalize border transition-colors ${
                          formData.priority === p
                            ? p === "critical"
                              ? "bg-red-700 border-red-700 text-white"
                              : p === "high"
                              ? "bg-red-600 border-red-600 text-white"
                              : p === "medium"
                              ? "bg-amber-500 border-amber-500 text-white"
                              : "bg-green-600 border-green-600 text-white"
                            : "border-white/10 text-white/30 hover:border-white/25"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-white/40 mb-1.5">Description of Problem *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue in detail — what happened, error codes displayed, parts affected..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md px-3 py-2.5 text-sm text-white placeholder-white/20 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white font-semibold py-3 rounded-md transition-colors duration-200 hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #d4550a, #b83d00)" }}
              >
                {isSubmitting ? "Submitting to SECS Backend..." : "Submit Report →"}
              </button>
              <p className="text-xs text-white/25 text-center">
                Submissions automatically trigger laboratory technician assignment and tracking.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── LIVE RECENT ISSUES TABLE (DYNAMIC API) ── */}
      <section id="track" className="border-y border-white/8 py-14 scroll-mt-20" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "#d4550a" }}>
                Transparency
              </p>
              <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl text-white">
                Live Public Issue Tracker
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/40">
                Track any report in real time. Stage, responsible office or technician, and resolution status are updated live from the database.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                {issues.length} active reports
              </span>
              <button
                onClick={loadDynamicData}
                className="text-xs text-white/50 hover:text-white px-2.5 py-1 rounded border border-white/10"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
          <div className="mb-4 flex max-w-lg items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <svg className="h-4 w-4 shrink-0 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              value={ticketSearch}
              onChange={(event) => setTicketSearch(event.target.value)}
              placeholder="Search by ticket number, item, or lab (e.g. TKT-2891)"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
            />
            {ticketSearch && (
              <button onClick={() => setTicketSearch("")} className="text-xs text-white/40 hover:text-white">
                Clear
              </button>
            )}
          </div>
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-sm">
                <thead>
                  <tr className="border-b border-white/8" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold">Ticket ID</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold">Lab</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold">Equipment</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold">Reporter</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold">Submitted</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold">Priority</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold">Status</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold">Current stage</th>
                    <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold">Pending with</th>
                  </tr>
                </thead>
                <tbody>
                  {issues
                    .filter((issue) => {
                      const q = ticketSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        issue.id.toLowerCase().includes(q) ||
                        issue.item.toLowerCase().includes(q) ||
                        (issue.labName || issue.lab || "").toLowerCase().includes(q)
                      );
                    })
                    .map((issue) => (
                      <tr key={issue.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-amber-300 font-bold">{issue.id}</td>
                        <td className="px-5 py-3.5 font-medium text-white/80">{issue.labName || issue.lab}</td>
                        <td className="px-5 py-3.5 text-white/50">{issue.item}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-white/40">{issue.reporter || issue.reporterEmail}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-white/45">{issue.createdAt || issue.submittedAt}</td>
                        <td className={`px-5 py-3.5 text-xs font-semibold ${PRIORITY_COLORS[issue.priority] ?? "text-white/60"}`}>
                          {issue.priority}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={issue.status} />
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-white/60">{issue.currentStage}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              issue.pendingWith === "Closed" ? "bg-emerald-400/10 text-emerald-300" : "bg-orange-400/10 text-orange-300"
                            }`}
                          >
                            {issue.pendingWith}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          {issues.length === 0 && !isLoading && (
            <div className="py-8 text-center text-sm text-white/35">No equipment issues currently recorded.</div>
          )}
        </div>
      </section>

      {/* ── PUBLIC PAYMENT INCIDENTS (DYNAMIC AUDIT LEDGER) ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest font-semibold text-red-300">Public accountability</p>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="mt-2 text-3xl text-white">
            Payment discrepancy notices
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            When Accounts records a payment that a technician says was not received, the incident is published directly to this public audit ledger.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {incidents.map((incident) => (
            <article key={incident.id} className="rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-semibold text-red-300">Payment disputed</span>
                <span className="font-mono text-xs text-amber-300">{incident.ticketId}</span>
                <span className="text-xs text-white/25">{incident.createdAt}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/65">{incident.message}</p>
              <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-xs text-white/35">
                <span>Reported by: Anonymous technician</span>
                {incident.amount && <span className="font-semibold text-white/60">৳{incident.amount.toLocaleString("en-BD")}</span>}
              </div>
            </article>
          ))}
        </div>
        {incidents.length === 0 && (
          <div className="rounded-xl border border-white/10 p-6 text-center text-sm text-white/40">
            No active payment discrepancies on file. All verified repair handovers are accounted for.
          </div>
        )}
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "#d4550a" }}>
            FAQ
          </p>
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl md:text-4xl text-white">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="border-t border-white/10">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0e2d5c 0%, #071428 100%)" }} />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1400&h=400&fit=crop&auto=format)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl md:text-4xl mb-4 text-white">
            Found a problem in the lab?
          </h2>
          <p className="text-white/50 mb-8">
            Don&apos;t leave it for the next person. Submit a report now — it takes less than 2 minutes.
          </p>
          <a
            href="#submit"
            className="inline-block text-white font-semibold px-8 py-3.5 rounded-lg transition-all duration-200 hover:scale-105"
            style={{ background: "linear-gradient(135deg, #d4550a, #b83d00)" }}
          >
            Report Equipment Issue
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 py-10" style={{ background: "#040c1a" }}>
        <div className="max-w-7xl mx-auto px-6 grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#d4550a" }}
              >
                S
              </div>
              <span style={{ fontFamily: "var(--font-display)" }} className="text-white text-base">
                SECS
              </span>
            </div>
            <p className="leading-relaxed text-xs text-white/30">
              Smart Equipment Care System — a centralised online fault reporting platform for UITC university laboratory equipment.
            </p>
          </div>
          <div>
            <h4 className="text-white/60 font-semibold mb-3 text-xs uppercase tracking-widest">Quick Links</h4>
            <ul className="space-y-2 text-xs text-white/30">
              {[
                { label: "Submit an Issue", href: "#submit" },
                { label: "Track My Ticket", href: "#track" },
                { label: "Lab Directory", href: "#labs" },
                { label: "Staff Portals", href: "#portal-access" },
                { label: "FAQ", href: "#faq" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-white/60 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white/60 font-semibold mb-3 text-xs uppercase tracking-widest">Contact</h4>
            <ul className="space-y-2 text-xs text-white/30">
              <li>📧 labsupport@uitc.edu</li>
              <li>📞 +880 (1800) 555-0192</li>
              <li>🕐 Mon–Fri, 8:00 am – 6:00 pm</li>
              <li className="pt-1">Building C, Room 101, Campus North</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-white/8 text-xs text-center text-white/20">
          © 2026 UITC University Facilities & IT Division. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
