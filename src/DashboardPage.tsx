import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import { secsApi } from "./services/secsApi"
import type {
  AuditIncident,
  Budget,
  BudgetStatus,
  Lab,
  PortalRole,
  PublicIssue,
  StaffAccount,
} from "./workflowTypes"

type Role = PortalRole
type Section = "overview" | "reports" | "labs" | "budgets" | "users" | "ledger"
type TechnicianQueue = "incoming" | "work"

interface Technician {
  id: string
  name: string
  department: string
  email: string
}

const ROLE_META: Record<Role, {
  label: string
  initials: string
  user: string
  title: string
}> = {
  admin: {
    label: "System Admin",
    initials: "SA",
    user: "Mahmud Kabir",
    title: "Facilities Administrator",
  },
  authority: {
    label: "Higher Authority",
    initials: "SH",
    user: "Dr. Samina Haque",
    title: "Director, Academic Operations",
  },
  accounts: {
    label: "Accounts",
    initials: "NI",
    user: "Nusrat Islam",
    title: "Senior Accounts Officer",
  },
  technician: {
    label: "Lab Technician",
    initials: "AR",
    user: "Ashik Rahman",
    title: "CSE & EEE Technician",
  },
}

const NAV_ITEMS: { id: Section label: string roles: Role[] icon: IconName }[] =
  [
    {
      id: "overview",
      label: "Overview",
      roles: ["admin", "authority", "accounts", "technician"],
      icon: "grid",
    },
    {
      id: "reports",
      label: "Issue workflow",
      roles: ["admin", "authority", "accounts", "technician"],
      icon: "alert",
    },
    {
      id: "labs",
      label: "Lab assignments",
      roles: ["admin", "authority", "technician"],
      icon: "lab",
    },
    {
      id: "budgets",
      label: "Budgets & payments",
      roles: ["admin", "authority", "accounts", "technician"],
      icon: "wallet",
    },
    {
      id: "users",
      label: "User accounts",
      roles: ["admin", "authority"],
      icon: "users",
    },
    {
      id: "ledger",
      label: "Public audit ledger",
      roles: ["admin", "authority", "accounts", "technician"],
      icon: "shield",
    },
  ]

type IconName = "grid" | "lab" | "wallet" | "users" | "shield" | "bell" | "search" | "menu" | "close" | "check" | "alert" | "arrow"

const ICON_PATHS: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
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
}

function Icon({
  name,
  className = "w-5 h-5",
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  )
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
}) {
  const variants = {
    primary: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    secondary:
      "border border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500",
    ghost: "text-slate-400 hover:bg-slate-800 hover:text-white",
    danger:
      "border border-red-400/20 bg-red-400/10 text-red-300 hover:bg-red-400/20",
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function StatusPill({ status }: { status: BudgetStatus }) {
  const style =
    status === "Payment confirmed"
      ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
      : status === "Approved"
        ? "bg-sky-400/10 text-sky-300 border-sky-400/20"
        : "bg-amber-400/10 text-amber-300 border-amber-400/20"
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  )
}

function formatMoney(amount: number) {
  return `৳${amount.toLocaleString("en-BD")}`
}

interface DashboardProps {
  initialRole: Role
  issues: PublicIssue[]
  setIssues: Dispatch<SetStateAction<PublicIssue[]>>
  incidents: AuditIncident[]
  setIncidents: Dispatch<SetStateAction<AuditIncident[]>>
  onLogout: () => void
}

export default function DashboardPage({
  initialRole,
  issues,
  setIssues,
  incidents,
  setIncidents,
  onLogout,
}: DashboardProps) {
  const [role, setRole] = useState<Role>(initialRole)
  const [section, setSection] = useState<Section>("overview")
  const [mobileNav, setMobileNav] = useState(false)

  // Dynamic Backend State
  const [labs, setLabs] = useState<Lab[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([])
  const [notifications, setNotifications] = useState<string[]>([])
  const [notice, setNotice] = useState("")
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [newAccount, setNewAccount] = useState({
    name: "",
    email: "",
    role: "technician",
    labId: "",
  })
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, {
    amount: string
    description: string
  }>>({})
  const [reportSearch, setReportSearch] = useState("")
  const [technicianQueue, setTechnicianQueue] =
    useState<TechnicianQueue>("incoming")
  const [showNotifications, setShowNotifications] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load all dynamic backend data
  const loadData = async () => {
    try {
      setIsLoading(true)
      const [
        labsData,
        issuesData,
        budgetsData,
        usersData,
        incidentsData,
        notifsData,
      ] = await Promise.all([
        secsApi.labs.getLabs().catch(() => []),
        secsApi.issues.getIssues({ role }).catch(() => []),
        secsApi.budgets.getBudgets().catch(() => []),
        secsApi.users.getUsers().catch(() => []),
        secsApi.audit.getIncidents().catch(() => []),
        secsApi.notifications
          .getNotifications(role)
          .catch(() => ({ data: [] })),
      ])

      setLabs(labsData)
      setIssues(issuesData)
      setBudgets(budgetsData)
      setStaffAccounts(usersData)
      setIncidents(incidentsData)
      if (notifsData?.data) {
        setNotifications(notifsData.data.map((n: any) => n.message))
      }
    } catch (e) {
      console.error("Failed to load dashboard data:", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [role])

  // Technicians derived from users
  const technicians: Technician[] = useMemo(() => {
    return staffAccounts
      .filter((u) => u.role === "technician")
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department || "Engineering",
      }))
  }, [staffAccounts])

  const technicianMap = useMemo(() => {
    return Object.fromEntries(technicians.map((t) => [t.id, t]))
  }, [technicians])

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role))
  const assignedLabs =
    role === "technician"
      ? labs.filter((lab) => lab.technicianId === "tech-1")
      : labs
  const visibleBudgets =
    role === "technician"
      ? budgets.filter((budget) => budget.technicianId === "tech-1")
      : budgets

  const technicianAssignedIssues = issues.filter(
    (issue) => issue.assignedTechnicianId === "tech-1",
  )
  const technicianIncomingIssues = technicianAssignedIssues.filter(
    (issue) => issue.status === "Assigned",
  )
  const technicianWorkIssues = technicianAssignedIssues
    .filter((issue) => issue.status !== "Assigned")
    .sort(
      (a, b) =>
        Number(a.status === "Resolved") - Number(b.status === "Resolved"),
    )

  const roleVisibleIssues =
    role === "technician"
      ? reportSearch.trim()
        ? technicianAssignedIssues
        : technicianQueue === "incoming"
          ? technicianIncomingIssues
          : technicianWorkIssues
      : issues

  const visibleIssues = roleVisibleIssues.filter((issue) =>
    issue.id.toLowerCase().includes(reportSearch.trim().toLowerCase()),
  )
  const approvedTotal = budgets
    .filter((budget) => budget.status !== "Pending approval")
    .reduce((sum, budget) => sum + budget.amount, 0)
  const pendingPayments = budgets.filter(
    (budget) => budget.status === "Approved",
  )

  function switchRole(nextRole: Role) {
    setRole(nextRole)
    setSection("overview")
    setMobileNav(false)
    setNotice(`Switched to ${ROLE_META[nextRole].label} workspace.`)
  }

  // --- Dynamic API Operations ---
  async function assignTechnician(labId: string, technicianId: string) {
    try {
      await secsApi.labs.assignTechnician(labId, technicianId || null)
      setNotice(
        technicianId
          ? "Lab technician assignment updated."
          : "Technician removed from this lab.",
      )
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to update lab assignment.")
    }
  }

  async function approveBudget(id: string) {
    try {
      await secsApi.budgets.approveBudget(id)
      setNotice(`${id} approved and forwarded to Accounts for payment release.`)
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to approve budget.")
    }
  }

  async function confirmPayment(id: string) {
    try {
      await secsApi.budgets.confirmPayment(id)
      setNotice(`${id} payment confirmed. Visible on public audit ledger.`)
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to confirm payment.")
    }
  }

  async function cancelIssue(id: string) {
    try {
      await secsApi.issues.updateStatus(id, { action: "cancel_report" })
      setNotice(`${id} was cancelled by Higher Authority.`)
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to cancel issue.")
    }
  }

  async function confirmNoBudget(issue: PublicIssue) {
    try {
      await secsApi.issues.updateStatus(issue.id, {
        action: "confirm_no_budget",
      })
      setNotice(`${issue.id} confirmed for repair without budget.`)
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to update status.")
    }
  }

  async function requestIssueBudget(issue: PublicIssue) {
    const draft = budgetDrafts[issue.id]
    const amount = Number(draft?.amount)
    if (!amount || !draft?.description.trim()) {
      setNotice(
        "Enter both the required budget amount and a clear description.",
      )
      return
    }

    try {
      await secsApi.issues.updateStatus(issue.id, {
        action: "request_budget",
        budgetAmount: amount,
        budgetDescription: draft.description.trim(),
      })
      setNotice(`${issue.id} budget request sent to Higher Authority.`)
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to submit budget request.")
    }
  }

  async function decideIssueBudget(issue: PublicIssue, approved: boolean) {
    try {
      await secsApi.issues.updateStatus(issue.id, {
        action: approved ? "approve_budget" : "reject_budget",
      })
      setNotice(
        approved
          ? `${issue.id} approved and sent to Accounts.`
          : `${issue.id} budget request rejected.`,
      )
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to process budget decision.")
    }
  }

  async function approveIssuePayment(issue: PublicIssue) {
    try {
      await secsApi.issues.updateStatus(issue.id, { action: "approve_payment" })
      setNotice(`${issue.id} payment approved and returned to technician.`)
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to approve payment.")
    }
  }

  async function completeIssue(issue: PublicIssue) {
    try {
      await secsApi.issues.updateStatus(issue.id, { action: "complete_repair" })
      setNotice(`${issue.id} marked complete. Public status is now Resolved.`)
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to complete repair.")
    }
  }

  async function disputeIssuePayment(issue: PublicIssue) {
    const message = noteDrafts[issue.id]?.trim()
    if (!message) {
      setNotice("Write a description before publishing a payment concern.")
      return
    }

    try {
      await secsApi.issues.updateStatus(issue.id, {
        action: "dispute_payment",
        disputeMessage: message,
      })
      setNoteDrafts((current) => ({ ...current, [issue.id]: "" }))
      setNotice(
        "The discrepancy is now public on the landing page ledger. Your name is hidden.",
      )
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to publish payment concern.")
    }
  }

  async function createAccount(event: React.FormEvent) {
    event.preventDefault()
    if (
      !newAccount.name.trim() ||
      !newAccount.email.toLowerCase().endsWith(".edu")
    ) {
      setNotice("Enter a name and a valid university .edu email.")
      return
    }
    if (
      role === "authority" &&
      (newAccount.role === "authority" || newAccount.role === "admin")
    ) {
      setNotice(
        "Only System Admin can create Higher Authority or Admin accounts.",
      )
      return
    }

    try {
      await secsApi.users.createUser({
        name: newAccount.name.trim(),
        email: newAccount.email.trim(),
        role: newAccount.role,
        labId: newAccount.labId || undefined,
      })

      setNewAccount({ name: "", email: "", role: "technician", labId: "" })
      setShowAccountForm(false)
      setNotice("Staff account created in database. Credentials sent to email.")
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to create account.")
    }
  }

  async function removeAccount(account: StaffAccount) {
    if (account.role === "authority" && role !== "admin") {
      setNotice(
        "Higher Authority accounts can only be removed by System Admin.",
      )
      return
    }
    if (account.id === "admin-1") {
      setNotice("The primary System Admin account cannot be removed.")
      return
    }

    try {
      await secsApi.users.deleteUser(account.id)
      setNotice(`${account.name}'s account was removed from the database.`)
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to remove account.")
    }
  }

  async function publishNote(budget: Budget) {
    const message = noteDrafts[budget.id]?.trim()
    if (!message) return

    try {
      await secsApi.audit.publishConcern({
        ticketId: budget.ticketId,
        message,
        amount: budget.amount,
      })
      setNoteDrafts((current) => ({ ...current, [budget.id]: "" }))
      setNotice(
        "Your payment concern is now public and visible to Higher Authority.",
      )
      await loadData()
    } catch (err: any) {
      setNotice(err?.message || "Failed to publish concern.")
    }
  }

  const pageTitle =
    NAV_ITEMS.find((item) => item.id === section)?.label ?? "Overview"

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform lg:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 font-black text-slate-950">
              S
            </div>
            <div>
              <div className="font-display text-xl leading-none text-white">
                SECS
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Live Backend Portal
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="p-2 lg:hidden"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" />
          </Button>
        </div>

        <div className="px-4 py-5">
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workspace view
          </label>
          <select
            value={role}
            onChange={(event) => switchRole(event.target.value as Role)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
          >
            <option value="admin">System Admin</option>
            <option value="authority">Higher Authority</option>
            <option value="accounts">Accounts</option>
            <option value="technician">Lab Technician</option>
          </select>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Switch role to test dynamic permission-based workflows.
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {visibleNav.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => {
                setSection(item.id)
                setMobileNav(false)
              }}
              className={`w-full justify-start px-3 py-3 ${
                section === item.id ? "bg-amber-400/10 text-amber-300" : ""
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
              {item.id === "budgets" && pendingPayments.length > 0 && (
                <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] text-slate-950">
                  {pendingPayments.length}
                </span>
              )}
            </Button>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-900 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-amber-300">
              {ROLE_META[role].initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {ROLE_META[role].user}
              </div>
              <div className="truncate text-xs text-slate-500">
                {ROLE_META[role].title}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onLogout}
          >
            Sign out
          </Button>
        </div>
      </aside>

      {mobileNav && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-slate-800 bg-slate-950/90 px-5 backdrop-blur-xl md:px-8">
          <Button
            variant="ghost"
            className="p-2 lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" />
          </Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-amber-400">
              {ROLE_META[role].label} workspace
            </p>
            <h1 className="font-display text-2xl text-white">{pageTitle}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded border border-slate-800 bg-slate-900"
            >
              {isLoading ? "Syncing..." : "↻ Sync DB"}
            </button>
            <div className="relative">
              <Button
                variant="secondary"
                className="relative p-2.5"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <Icon name="bell" className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-950">
                    {notifications.length}
                  </span>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-50">
                  <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-white flex justify-between">
                    <span>Workflow notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          await secsApi.notifications.markAllRead(role)
                          setNotifications([])
                        }}
                        className="text-[11px] text-amber-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {notifications.length ? (
                    notifications.map((message, index) => (
                      <div
                        key={`${message}-${index}`}
                        className="border-b border-slate-800 px-4 py-3 text-xs leading-5 text-slate-300 last:border-0"
                      >
                        {message}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-xs text-slate-500">
                      No new notifications
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-5 md:p-8">
          {notice && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              <Icon name="check" className="h-4 w-4 shrink-0" />
              <span className="flex-1">{notice}</span>
              <Button
                variant="ghost"
                className="p-1 text-amber-200"
                onClick={() => setNotice("")}
                aria-label="Dismiss"
              >
                <Icon name="close" className="h-4 w-4" />
              </Button>
            </div>
          )}

          {section === "overview" && (
            <div className="space-y-7">
              <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-900/40 p-6 md:p-8">
                <div className="max-w-2xl">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                    Good day, {ROLE_META[role].user.split(" ")[0]}
                  </span>
                  <h2 className="mt-3 font-display text-3xl text-white md:text-4xl">
                    {role === "technician"
                      ? "Your assigned labs need attention."
                      : role === "accounts"
                        ? "Keep every payment accountable."
                        : "University Equipment Live Ledger."}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                    {role === "technician"
                      ? "Only issues from your assigned labs are shown. Payment records can be challenged publicly if funds are not received."
                      : "Lab ownership, approvals, and dispatches are recorded end-to-end so no handover can happen without a visible audit trail."}
                  </p>
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label:
                      role === "technician"
                        ? "My assigned labs"
                        : "Registered labs",
                    value:
                      role === "technician" ? assignedLabs.length : labs.length,
                    helper: "Room-level access",
                  },
                  {
                    label: "Open equipment issues",
                    value: assignedLabs.reduce(
                      (sum, lab) => sum + (lab.openIssues || 0),
                      0,
                    ),
                    helper: "Across visible labs",
                  },
                  {
                    label: "Approved budget",
                    value: formatMoney(approvedTotal),
                    helper: "Active cycle",
                  },
                  {
                    label: "Public concerns",
                    value: incidents.length,
                    helper: "Audit ledger",
                  },
                ].map((stat) => (
                  <article
                    key={stat.label}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
                  >
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">{stat.helper}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <section className="rounded-2xl border border-slate-800 bg-slate-900/70 xl:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-800 p-5">
                    <div>
                      <h3 className="font-semibold text-white">
                        Labs needing attention
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Prioritised by unresolved issues
                      </p>
                    </div>
                    <Button variant="ghost" onClick={() => setSection("labs")}>
                      View all <Icon name="arrow" className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {[...assignedLabs]
                      .sort((a, b) => (b.openIssues || 0) - (a.openIssues || 0))
                      .slice(0, 4)
                      .map((lab) => (
                        <div
                          key={lab.id}
                          className="flex items-center gap-4 p-4 md:px-5"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-amber-300">
                            <Icon name="lab" className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {lab.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {lab.room} · {lab.department}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold ${
                                lab.openIssues || 0
                                  ? "text-amber-300"
                                  : "text-emerald-300"
                              }`}
                            >
                              {lab.openIssues || 0} open
                            </p>
                            <p className="text-xs text-slate-600">
                              {lab.technicianId &&
                              technicianMap[lab.technicianId]
                                ? technicianMap[lab.technicianId].name
                                : "Unassigned"}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-lg bg-amber-400/10 p-2 text-amber-300">
                      <Icon name="shield" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        Audit coverage
                      </h3>
                      <p className="text-xs text-slate-500">
                        Workflow visibility
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {[
                      "Room assigned to technician",
                      "Budget approved by authority",
                      "Payment confirmed by accounts",
                      "Technician receipt or concern",
                    ].map((label, index) => (
                      <div key={label} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                            <Icon name="check" className="h-3.5 w-3.5" />
                          </span>
                          {index < 3 && (
                            <span className="mt-1 h-7 w-px bg-slate-700" />
                          )}
                        </div>
                        <p className="pt-0.5 text-sm text-slate-300">{label}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {section === "reports" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="font-display text-3xl text-white">
                    Issue workflow
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500">
                    {role === "technician"
                      ? "Incoming student reports and assessed repair work are kept in separate queues."
                      : role === "authority"
                        ? "Review reports, cancel invalid submissions, and approve or reject technician budgets."
                        : role === "accounts"
                          ? "Only authority-approved budgets are actionable here."
                          : "Monitor every handoff from submission through completion."}
                  </p>
                </div>
                <div className="relative">
                  <Icon
                    name="search"
                    className="absolute left-3 top-3 h-4 w-4 text-slate-500"
                  />
                  <input
                    value={reportSearch}
                    onChange={(event) => setReportSearch(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-400 lg:w-80"
                    placeholder="Search ticket number or item"
                  />
                </div>
              </div>

              {role === "technician" && (
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                  <button
                    onClick={() => setTechnicianQueue("incoming")}
                    className={`rounded-2xl border p-5 text-left transition ${
                      technicianQueue === "incoming"
                        ? "border-amber-400/40 bg-amber-400/10"
                        : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            technicianQueue === "incoming"
                              ? "text-amber-300"
                              : "text-white"
                          }`}
                        >
                          1. New student reports
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Unassessed reports received directly from students.
                          Confirm no budget or submit a budget request.
                        </p>
                      </div>
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-950 px-2 text-sm font-bold text-white">
                        {technicianIncomingIssues.length}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setTechnicianQueue("work")}
                    className={`rounded-2xl border p-5 text-left transition ${
                      technicianQueue === "work"
                        ? "border-sky-400/40 bg-sky-400/10"
                        : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            technicianQueue === "work"
                              ? "text-sky-300"
                              : "text-white"
                          }`}
                        >
                          2. Budget & repair queue
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Requested, approved, funded and no-budget repairs.
                          Each ticket shows who must act next.
                        </p>
                      </div>
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-950 px-2 text-sm font-bold text-white">
                        {technicianWorkIssues.length}
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {visibleIssues.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center text-sm text-slate-500">
                  No issues matched this filter.
                </div>
              )}

              <div className="space-y-4">
                {visibleIssues.map((issue, issueIndex) => {
                  const canAssess =
                    role === "technician" &&
                    (issue.status === "Assigned" ||
                      issue.budgetStatus === "Rejected by Higher Authority")
                  const canComplete =
                    role === "technician" &&
                    (issue.status === "In Progress" ||
                      issue.budgetStatus === "Payment approved by Accounts")

                  return (
                    <article
                      key={issue.id}
                      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"
                    >
                      <div className="p-5">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {role === "technician" && (
                                <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-800 px-1.5 text-[10px] font-bold text-slate-400">
                                  {issueIndex + 1}
                                </span>
                              )}
                              <span className="font-mono text-xs font-bold text-amber-300">
                                {issue.id}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  issue.status.includes("Rejected") ||
                                  issue.status.includes("Disputed")
                                    ? "bg-red-400/10 text-red-300"
                                    : issue.status === "Resolved"
                                      ? "bg-emerald-400/10 text-emerald-300"
                                      : "bg-sky-400/10 text-sky-300"
                                }`}
                              >
                                {issue.status}
                              </span>
                              <span className="text-xs text-slate-600">
                                {issue.createdAt || issue.submittedAt}
                              </span>
                            </div>
                            <h3 className="mt-3 text-lg font-semibold text-white">
                              {issue.item}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {issue.labName || issue.lab} · Reporter{" "}
                              {issue.reporter || issue.reporterEmail}
                            </p>
                            {issue.description && (
                              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                                {issue.description}
                              </p>
                            )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:w-[430px]">
                            <div className="rounded-xl bg-slate-950/70 p-3">
                              <p className="text-[10px] uppercase tracking-widest text-slate-600">
                                Current stage
                              </p>
                              <p className="mt-1 text-sm text-slate-300">
                                {issue.currentStage}
                              </p>
                            </div>
                            <div className="rounded-xl bg-slate-950/70 p-3">
                              <p className="text-[10px] uppercase tracking-widest text-slate-600">
                                Waiting for
                              </p>
                              <p className="mt-1 text-sm font-medium text-amber-300">
                                {issue.pendingWith}
                              </p>
                            </div>
                          </div>
                        </div>

                        {issue.budgetAmount && (
                          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                  Budget request
                                </p>
                                <p className="mt-2 text-sm text-slate-300">
                                  {issue.budgetDescription}
                                </p>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-xl font-semibold text-white">
                                  {formatMoney(issue.budgetAmount)}
                                </p>
                                <p className="mt-1 text-xs text-amber-300">
                                  {issue.budgetStatus}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {(canAssess ||
                        canComplete ||
                        (role === "authority" &&
                          issue.pendingWith !== "Closed") ||
                        (role === "accounts" &&
                          issue.budgetStatus ===
                            "Approved by Higher Authority")) && (
                        <div className="border-t border-slate-800 bg-slate-950/30 p-5">
                          {canAssess && (
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <Button onClick={() => confirmNoBudget(issue)}>
                                  <Icon name="check" className="h-4 w-4" />
                                  Confirm: no budget needed
                                </Button>
                                <span className="text-xs text-slate-600">
                                  or submit a budget request with justification
                                </span>
                              </div>
                              <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                                <input
                                  type="number"
                                  min="1"
                                  value={budgetDrafts[issue.id]?.amount ?? ""}
                                  onChange={(event) =>
                                    setBudgetDrafts((current) => ({
                                      ...current,
                                      [issue.id]: {
                                        amount: event.target.value,
                                        description:
                                          current[issue.id]?.description ?? "",
                                      },
                                    }))
                                  }
                                  placeholder="Amount (৳)"
                                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                                />
                                <input
                                  value={
                                    budgetDrafts[issue.id]?.description ?? ""
                                  }
                                  onChange={(event) =>
                                    setBudgetDrafts((current) => ({
                                      ...current,
                                      [issue.id]: {
                                        amount: current[issue.id]?.amount ?? "",
                                        description: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Parts or service justification required..."
                                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                                />
                                <Button
                                  variant="secondary"
                                  onClick={() => requestIssueBudget(issue)}
                                >
                                  Request budget
                                </Button>
                              </div>
                            </div>
                          )}

                          {role === "authority" && (
                            <div className="flex flex-wrap gap-3">
                              {issue.budgetStatus ===
                                "Pending Higher Authority" && (
                                <>
                                  <Button
                                    onClick={() =>
                                      decideIssueBudget(issue, true)
                                    }
                                  >
                                    <Icon name="check" className="h-4 w-4" />
                                    Approve budget
                                  </Button>
                                  <Button
                                    variant="danger"
                                    onClick={() =>
                                      decideIssueBudget(issue, false)
                                    }
                                  >
                                    Reject budget
                                  </Button>
                                </>
                              )}
                              {issue.status !== "Resolved" &&
                                issue.status !==
                                  "Rejected by Higher Authority" && (
                                  <Button
                                    variant="danger"
                                    onClick={() => cancelIssue(issue.id)}
                                  >
                                    Cancel entire report
                                  </Button>
                                )}
                            </div>
                          )}

                          {role === "accounts" &&
                            issue.budgetStatus ===
                              "Approved by Higher Authority" && (
                              <Button
                                onClick={() => approveIssuePayment(issue)}
                              >
                                <Icon name="wallet" className="h-4 w-4" />
                                Approve payment & send to technician
                              </Button>
                            )}

                          {canComplete && (
                            <div className="space-y-4">
                              <Button onClick={() => completeIssue(issue)}>
                                <Icon name="check" className="h-4 w-4" />
                                Confirm repair complete
                              </Button>
                              {issue.budgetStatus ===
                                "Payment approved by Accounts" && (
                                <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
                                  <p className="text-sm font-semibold text-red-200">
                                    Accounts marked payment approved, but funds
                                    were not received?
                                  </p>
                                  <div className="mt-3 flex flex-col gap-2 md:flex-row">
                                    <textarea
                                      value={noteDrafts[issue.id] ?? ""}
                                      onChange={(event) =>
                                        setNoteDrafts((current) => ({
                                          ...current,
                                          [issue.id]: event.target.value,
                                        }))
                                      }
                                      placeholder="Describe discrepancy. Published to public transparency ledger anonymously."
                                      className="min-h-20 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-400"
                                    />
                                    <Button
                                      variant="danger"
                                      className="self-end"
                                      onClick={() => disputeIssuePayment(issue)}
                                    >
                                      Publish anonymously
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </div>
          )}

          {section === "labs" && (
            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <div className="flex flex-col gap-3 border-b border-slate-800 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display text-2xl text-white">
                    {role === "technician"
                      ? "My assigned labs"
                      : "Lab room assignments"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {role === "technician"
                      ? "You can only see issues from these assigned rooms."
                      : "Control room-by-room technician responsibilities in real-time."}
                  </p>
                </div>
                <span className="self-start rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                  {assignedLabs.length} rooms visible
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Room & lab</th>
                      <th className="px-5 py-3 font-semibold">Department</th>
                      <th className="px-5 py-3 font-semibold">Open issues</th>
                      <th className="px-5 py-3 font-semibold">
                        Responsible technician
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {assignedLabs.map((lab) => (
                      <tr key={lab.id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-white">
                            {lab.name}
                          </p>
                          <p className="mt-1 font-mono text-xs text-amber-300">
                            {lab.room}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-400">
                          {lab.department}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs ${
                              lab.openIssues || 0
                                ? "bg-amber-400/10 text-amber-300"
                                : "bg-emerald-400/10 text-emerald-300"
                            }`}
                          >
                            {lab.openIssues || 0} issues
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {role === "admin" || role === "authority" ? (
                            <select
                              value={lab.technicianId ?? ""}
                              onChange={(event) =>
                                assignTechnician(lab.id, event.target.value)
                              }
                              className="w-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-400"
                            >
                              <option value="">Unassigned / remove</option>
                              {technicians.map((tech) => (
                                <option key={tech.id} value={tech.id}>
                                  {tech.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              <p className="text-sm text-slate-200">
                                {lab.technicianId &&
                                technicianMap[lab.technicianId]
                                  ? technicianMap[lab.technicianId].name
                                  : "Unassigned"}
                              </p>
                              <p className="text-xs text-slate-600">
                                {lab.technicianId &&
                                technicianMap[lab.technicianId]
                                  ? technicianMap[lab.technicianId].email
                                  : ""}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === "budgets" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="font-display text-3xl text-white">
                    Budget control desk
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Authority approval → Accounts payment → Technician
                    verification.
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  Dynamic audit trail logged for all disbursements
                </span>
              </div>
              <div className="grid gap-4">
                {visibleBudgets.map((budget) => {
                  const tech = technicianMap[budget.technicianId] || {
                    name: "Assigned Tech",
                  }
                  return (
                    <article
                      key={budget.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-amber-300">
                              {budget.id}
                            </span>
                            <StatusPill status={budget.status} />
                            <span className="text-xs text-slate-600">
                              {budget.ticketId || budget.ticket}
                            </span>
                          </div>
                          <h3 className="font-semibold text-white">
                            {budget.purpose}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {budget.labName || budget.lab} · Responsible:{" "}
                            {tech.name}
                          </p>
                        </div>
                        <div className="lg:text-right">
                          <p className="text-2xl font-semibold text-white">
                            {formatMoney(budget.amount)}
                          </p>
                          {budget.paidAt && (
                            <p className="mt-1 text-xs text-emerald-300">
                              Accounts confirmed · {budget.paidAt}
                            </p>
                          )}
                        </div>
                        <div className="flex min-w-48 justify-start lg:justify-end">
                          {role === "authority" &&
                            budget.status === "Pending approval" && (
                              <Button onClick={() => approveBudget(budget.id)}>
                                <Icon name="check" className="h-4 w-4" />
                                Approve budget
                              </Button>
                            )}
                          {role === "accounts" &&
                            budget.status === "Approved" && (
                              <Button onClick={() => confirmPayment(budget.id)}>
                                <Icon name="wallet" className="h-4 w-4" />
                                Confirm paid
                              </Button>
                            )}
                          {((role === "authority" &&
                            budget.status !== "Pending approval") ||
                            (role === "accounts" &&
                              budget.status !== "Approved") ||
                            role === "admin") && (
                            <span className="text-xs text-slate-600">
                              No action required
                            </span>
                          )}
                        </div>
                      </div>
                      {role === "technician" &&
                        budget.status === "Payment confirmed" && (
                          <div className="mt-5 border-t border-slate-800 pt-5">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                              Did you actually receive this payment?
                            </p>
                            <div className="flex flex-col gap-2 md:flex-row">
                              <textarea
                                value={noteDrafts[budget.id] ?? ""}
                                onChange={(event) =>
                                  setNoteDrafts((current) => ({
                                    ...current,
                                    [budget.id]: event.target.value,
                                  }))
                                }
                                placeholder="Describe any difference between the Accounts record and funds received..."
                                className="min-h-20 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-400"
                              />
                              <Button
                                variant="danger"
                                className="self-end"
                                onClick={() => publishNote(budget)}
                              >
                                <Icon name="alert" className="h-4 w-4" />
                                Publish concern
                              </Button>
                            </div>
                            <p className="mt-2 text-xs text-slate-600">
                              This concern will be published directly to the
                              public transparency ledger.
                            </p>
                          </div>
                        )}
                    </article>
                  )
                })}
              </div>
            </div>
          )}

          {section === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display text-3xl text-white">
                    Access & staff accounts
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    System Admin and Higher Authority can create staff accounts
                    and control portal access.
                  </p>
                </div>
                <Button onClick={() => setShowAccountForm(!showAccountForm)}>
                  <Icon name="users" className="h-4 w-4" />
                  Create account
                </Button>
              </div>

              {showAccountForm && (
                <form
                  onSubmit={createAccount}
                  className="grid gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 md:grid-cols-2 xl:grid-cols-5 xl:items-end"
                >
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Full name
                    <input
                      value={newAccount.name}
                      onChange={(event) =>
                        setNewAccount({
                          ...newAccount,
                          name: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-amber-400"
                      placeholder="Staff member name"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    University email
                    <input
                      value={newAccount.email}
                      onChange={(event) =>
                        setNewAccount({
                          ...newAccount,
                          email: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-amber-400"
                      placeholder="name@uitc.edu"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Portal role
                    <select
                      value={newAccount.role}
                      onChange={(event) =>
                        setNewAccount({
                          ...newAccount,
                          role: event.target.value,
                          labId: "",
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-amber-400"
                    >
                      <option value="technician">Lab Technician</option>
                      <option value="accounts">Accounts</option>
                      {role === "admin" && (
                        <>
                          <option value="authority">Higher Authority</option>
                          <option value="admin">System Admin</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Assign lab now
                    <select
                      value={newAccount.labId}
                      disabled={newAccount.role !== "technician"}
                      onChange={(event) =>
                        setNewAccount({
                          ...newAccount,
                          labId: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <option value="">Assign later</option>
                      {labs.map((lab) => (
                        <option key={lab.id} value={lab.id}>
                          {lab.room} · {lab.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button type="submit" className="py-2.5">
                    Save to Database
                  </Button>
                </form>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: "Active staff accounts",
                    value: staffAccounts.length,
                    note: "Across all portal roles",
                  },
                  {
                    label: "Lab technicians",
                    value: technicians.length,
                    note: "Assigned room by room",
                  },
                  {
                    label: "Unassigned labs",
                    value: labs.filter((lab) => !lab.technicianId).length,
                    note: "Needs access owner",
                  },
                ].map((item) => (
                  <article
                    key={item.label}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
                  >
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">{item.note}</p>
                  </article>
                ))}
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                <div className="border-b border-slate-800 p-5">
                  <h3 className="font-semibold text-white">
                    Staff account directory
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Real database records of faculty and facility operators.
                  </p>
                </div>
                <div className="divide-y divide-slate-800">
                  {staffAccounts.map((account) => {
                    const isTech = account.role === "technician"
                    const canRemove =
                      account.id !== "admin-1" &&
                      (role === "admin" ||
                        account.role === "technician" ||
                        account.role === "accounts")

                    return (
                      <div
                        key={account.id}
                        className="flex flex-col gap-3 p-5 md:flex-row md:items-center"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-amber-300">
                          {account.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">
                            {account.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {account.email}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                          {ROLE_META[account.role]?.label || account.role}
                        </span>
                        {isTech && (
                          <span className="text-xs text-slate-500">
                            {
                              labs.filter(
                                (lab) => lab.technicianId === account.id,
                              ).length
                            }{" "}
                            labs assigned
                          </span>
                        )}
                        {canRemove ? (
                          <Button
                            variant="danger"
                            className="self-start px-3 py-1.5 md:self-auto"
                            onClick={() => removeAccount(account)}
                          >
                            Remove account
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-600">
                            {account.role === "authority" && role !== "admin"
                              ? "Admin controlled"
                              : "Protected"}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          )}

          {section === "ledger" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-400/10 to-transparent p-6">
                <div className="flex gap-4">
                  <div className="rounded-xl bg-amber-400/10 p-3 text-amber-300">
                    <Icon name="shield" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-white">
                      Public accountability ledger
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                      Every role can see confirmed payments and technician
                      concerns. Accounts cannot delete concerns; only Higher
                      Authority can close an investigation after adding a
                      resolution.
                    </p>
                  </div>
                </div>
              </section>
              <div className="space-y-4">
                {incidents.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
                    No payment concerns have been published.
                  </div>
                ) : (
                  incidents.map((incident) => (
                    <article
                      key={incident.id}
                      className="rounded-2xl border border-red-400/20 bg-slate-900/70 p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row">
                        <div className="rounded-xl bg-red-400/10 p-3 text-red-300 self-start">
                          <Icon name="alert" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                              Payment disputed
                            </span>
                            <span className="font-mono text-xs text-amber-300">
                              {incident.ticketId}
                            </span>
                            <span className="text-xs text-slate-600">
                              {incident.createdAt}
                            </span>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-slate-200">
                            {incident.message}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
                            <span>
                              Published by{" "}
                              <strong className="text-slate-300">
                                Anonymous technician
                              </strong>
                            </span>
                            {incident.amount && (
                              <span>
                                Recorded amount{" "}
                                <strong className="text-slate-300">
                                  {formatMoney(incident.amount)}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
