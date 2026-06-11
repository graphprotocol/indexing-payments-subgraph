import { RoleAdmin } from '../generated/schema'
import {
  RoleGranted,
  RoleRevoked,
  RoleAdminChanged,
} from '../generated/RecurringAgreementManager/RecurringAgreementManager'
import { createOrLoadRoleAssignment, isIndexedRole } from './helpers'

export function handleRoleGranted(event: RoleGranted): void {
  if (!isIndexedRole(event.params.role)) return

  let assignment = createOrLoadRoleAssignment(event.params.role, event.params.account)
  assignment.active = true
  assignment.grantedAtBlock = event.block.number
  assignment.grantedAtTimestamp = event.block.timestamp
  assignment.grantedAtTx = event.transaction.hash
  assignment.grantedBy = event.params.sender
  assignment.save()
}

export function handleRoleRevoked(event: RoleRevoked): void {
  if (!isIndexedRole(event.params.role)) return

  // createOrLoad rather than load: a revoke normally follows a grant, but the
  // guard keeps the mapping correct even if a revoke is the first event seen.
  let assignment = createOrLoadRoleAssignment(event.params.role, event.params.account)
  assignment.active = false
  assignment.revokedAtBlock = event.block.number
  assignment.revokedAtTimestamp = event.block.timestamp
  assignment.revokedAtTx = event.transaction.hash
  assignment.revokedBy = event.params.sender
  assignment.save()
}

export function handleRoleAdminChanged(event: RoleAdminChanged): void {
  if (!isIndexedRole(event.params.role)) return

  let admin = RoleAdmin.load(event.params.role)
  if (admin == null) {
    admin = new RoleAdmin(event.params.role)
    admin.role = event.params.role
  }
  admin.adminRole = event.params.newAdminRole
  admin.previousAdminRole = event.params.previousAdminRole
  admin.updatedAtBlock = event.block.number
  admin.updatedAtTimestamp = event.block.timestamp
  admin.updatedAtTx = event.transaction.hash
  admin.save()
}
