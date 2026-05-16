import { prisma } from '@/lib/prisma'

export async function logAudit(params: {
  userId?: string
  userEmail?: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: string
  entityId: string
  entityName?: string
  changes?: Record<string, unknown>
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      entityName: params.entityName,
      changes: params.changes ? JSON.stringify(params.changes) : null,
    },
  })
}
