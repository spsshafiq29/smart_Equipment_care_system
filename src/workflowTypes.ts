export type PortalRole = "admin" | "authority" | "accounts" | "technician"
export type PublicRole = "student" | "teacher" | "researcher"
export type AllRoles = PortalRole | PublicRole

export type BudgetFlowStatus = "Pending Higher Authority" | "Rejected by Higher Authority" | "Approved by Higher Authority" | "Payment approved by Accounts"

export interface PublicIssue {
  id: string
  labId: string
  labName: string
  lab?: string
  equipmentType: string
  assetTag?: string
  item: string
  description?: string
  priority: string
  status: string
  currentStage: string
  pendingWith: string
  reporter?: string
  reporterEmail?: string
  reporterName?: string
  submittedAt?: string
  createdAt: string
  assignedTechnicianId: string
  budgetAmount?: number
  budgetDescription?: string
  budgetStatus?: BudgetFlowStatus
  resolvedAt?: string
}

export interface AuditIncident {
  id: number
  ticketId: string
  message: string
  createdAt: string
  amount?: number
  reportedByRole?: string
}

export interface Lab {
  id: string
  room: string
  name: string
  department: string
  technicianId: string | null
  technicianName?: string
  openIssues: number
}

export type BudgetStatus = "Pending approval" | "Approved" | "Payment confirmed"

export interface Budget {
  id: string
  ticketId: string
  ticket?: string
  labName: string
  lab?: string
  purpose: string
  amount: number
  technicianId: string
  status: BudgetStatus
  approvedBy?: string
  paidAt?: string
  createdAt?: string
}

export interface StaffAccount {
  id: string
  name: string
  email: string
  role: PortalRole
  department?: string
  assignedLabs?: string[]
  isActive?: boolean
}

export interface DashboardStats {
  issuesResolvedFormatted: string
  issuesResolvedCount: number
  avgResponseTime: string
  labsSupported: number
  satisfactionRate: string
  openIssues: number
  approvedBudgetTotal: number
  publicConcernsCount: number
  totalStaffCount: number
  registeredLabsCount: number
}

export interface EquipmentTypeOption {
  icon: string
  label: string
}

export interface Announcement {
  id: string
  message: string
  active: boolean
  createdAt: string
}
