export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number      // current page (0-based)
  size: number
  first: boolean
  last: boolean
}

export interface Tenant {
    id: string
    name: string
    email: string
    phone: string
    document: string
    active: boolean
    createdAt: string
    hasMercadoPagoApi?: boolean
}

export interface User {
    id: string
    name: string
    email: string
    active: boolean
    createdAt: string
}

export interface Student {
    id: string
    name: string
    email: string
    phone: string
    document: string
    active: boolean
    createdAt: string
}

export interface Plan {
    id: string
    name: string
    amount: number
    dueDay: number
    active: boolean
    createdAt: string
}

export interface SchoolClass {
    id: string
    name: string
    description: string
    active: boolean
    createdAt: string
}

export interface Enrollment {
    id: string
    studentName: string
    className: string
    planName: string
    amount: number
    startDate: string
    endDate: string
    active: boolean
    createdAt: string
}

export interface Charge {
    id: string
    studentName: string
    amount: number
    dueDate: string
    status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED' | 'LOST' | 'DISPUTED'
    paymentDate: string | null
    pixCode: string | null
    boletoUrl: string | null
    checkoutUrl: string | null
    createdAt: string
}

export interface Dashboard {
    expectedRevenue: number
    receivedRevenue: number
    overdueRevenue: number
    totalActiveStudents: number
    totalPendingCharges: number
    totalPaidCharges: number
    totalOverdueCharges: number
}

export interface LoginRequest {
    email: string
    password: string
}

export interface LoginResponse {
    token: string
    name: string
    tenantId: string
    userId: string
    role: string
}

export interface RegisterRequest {
    name: string
    email: string
    password: string
    schoolName: string
    schoolPhone: string
    schoolDocument: string
}

// ── Auditoria ──────────────────────────────────────────────
export type AuditAction =
  | 'STUDENT_CREATED' | 'STUDENT_UPDATED' | 'STUDENT_DEACTIVATED' | 'STUDENT_REACTIVATED'
  | 'ENROLLMENT_CREATED' | 'ENROLLMENT_DEACTIVATED'
  | 'CHARGE_CREATED' | 'CHARGE_MANUAL_CREATED' | 'CHARGE_CANCELLED'
  | 'CHARGE_PAID_MANUAL' | 'CHARGE_STATUS_UPDATED' | 'CHARGE_WHATSAPP_RESENT'
  | 'CHARGE_PAID_WEBHOOK' | 'CHARGE_EXPIRED_WEBHOOK'
  | 'PLAN_CREATED' | 'PLAN_UPDATED' | 'PLAN_DEACTIVATED'
  | 'CLASS_CREATED' | 'CLASS_UPDATED' | 'CLASS_DEACTIVATED'
  | 'USER_INVITED' | 'USER_REGISTERED' | 'USER_PASSWORD_CHANGED'
  | 'USER_DEACTIVATED' | 'USER_REACTIVATED'

export interface AuditLog {
  id: string
  userEmail: string | null
  action: AuditAction
  entityType: string
  entityId: string | null
  description: string
  createdAt: string
}
