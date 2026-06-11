import { assert, describe, test, clearStore, afterEach, newMockEvent } from 'matchstick-as'
import { Address, Bytes, BigInt, ethereum } from '@graphprotocol/graph-ts'
import {
  handleRoleGranted,
  handleRoleRevoked,
  handleRoleAdminChanged,
} from '../src/recurringAgreementManager'
import {
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
} from '../generated/RecurringAgreementManager/RecurringAgreementManager'

// keccak256 of the role name strings, matching the constants in helpers.ts.
const AGREEMENT_MANAGER_ROLE = Bytes.fromHexString(
  '0xeb1b3455811b30c0dd237887f6349f22cc96ee5963709d7fe356d9b0cefa6d22',
)
const COLLECTOR_ROLE = Bytes.fromHexString(
  '0x14cf45180c3fcf249a5a305e9657ea05c14fd4f4e1800ee0216a8213091711d2',
)
const DATA_SERVICE_ROLE = Bytes.fromHexString(
  '0xb24201cd204615da5223ccceee91f8943c451c6e49dd43dcd78e2cfe6ecd6be8',
)
const GOVERNOR_ROLE = Bytes.fromHexString(
  '0x7935bd0ae54bc31f548c14dba4d37c5c64b3f8ca900cb468fb8abd54d5894f55',
)
const OPERATOR_ROLE = Bytes.fromHexString(
  '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929',
)
// keccak256("PAUSE_ROLE"): a real contract role the subgraph does not index,
// used as the negative case for the ignored-role tests.
const PAUSE_ROLE = Bytes.fromHexString(
  '0x139c2898040ef16910dc9f44dc697df79363da767d8bc92f2e310312b816e46d',
)

const ACCOUNT = Address.fromString('0x0000000000000000000000000000000000000001')
const SENDER = Address.fromString('0x0000000000000000000000000000000000000009')

function idOf(role: Bytes, account: Address): string {
  return role.concat(account).toHexString()
}

function createRoleGrantedEvent(role: Bytes, account: Address): RoleGrantedEvent {
  let event = changetype<RoleGrantedEvent>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(new ethereum.EventParam('role', ethereum.Value.fromFixedBytes(role)))
  event.parameters.push(new ethereum.EventParam('account', ethereum.Value.fromAddress(account)))
  event.parameters.push(new ethereum.EventParam('sender', ethereum.Value.fromAddress(SENDER)))
  return event
}

function createRoleRevokedEvent(role: Bytes, account: Address): RoleRevokedEvent {
  let event = changetype<RoleRevokedEvent>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(new ethereum.EventParam('role', ethereum.Value.fromFixedBytes(role)))
  event.parameters.push(new ethereum.EventParam('account', ethereum.Value.fromAddress(account)))
  event.parameters.push(new ethereum.EventParam('sender', ethereum.Value.fromAddress(SENDER)))
  return event
}

function createRoleAdminChangedEvent(
  role: Bytes,
  previousAdminRole: Bytes,
  newAdminRole: Bytes,
): RoleAdminChangedEvent {
  let event = changetype<RoleAdminChangedEvent>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(new ethereum.EventParam('role', ethereum.Value.fromFixedBytes(role)))
  event.parameters.push(
    new ethereum.EventParam('previousAdminRole', ethereum.Value.fromFixedBytes(previousAdminRole)),
  )
  event.parameters.push(
    new ethereum.EventParam('newAdminRole', ethereum.Value.fromFixedBytes(newAdminRole)),
  )
  return event
}

describe('handleRoleGranted / handleRoleRevoked', () => {
  afterEach(() => {
    clearStore()
  })

  test('granting a DIPs role creates an active RoleAssignment with grant audit fields', () => {
    let event = createRoleGrantedEvent(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    event.block.number = BigInt.fromI32(100)
    event.block.timestamp = BigInt.fromI32(1000)
    handleRoleGranted(event)

    assert.entityCount('RoleAssignment', 1)
    let id = idOf(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    assert.fieldEquals('RoleAssignment', id, 'role', AGREEMENT_MANAGER_ROLE.toHexString())
    assert.fieldEquals('RoleAssignment', id, 'account', ACCOUNT.toHexString())
    assert.fieldEquals('RoleAssignment', id, 'active', 'true')
    assert.fieldEquals('RoleAssignment', id, 'grantedAtBlock', '100')
    assert.fieldEquals('RoleAssignment', id, 'grantedAtTimestamp', '1000')
    // No revoke seen yet — revoke audit fields stay at the zero defaults.
    assert.fieldEquals('RoleAssignment', id, 'revokedAtBlock', '0')
  })

  test('revoking flips active to false and records revoke audit fields, keeping grant fields', () => {
    let granted = createRoleGrantedEvent(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    granted.block.number = BigInt.fromI32(100)
    granted.block.timestamp = BigInt.fromI32(1000)
    handleRoleGranted(granted)

    let revoked = createRoleRevokedEvent(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    revoked.block.number = BigInt.fromI32(200)
    revoked.block.timestamp = BigInt.fromI32(2000)
    handleRoleRevoked(revoked)

    assert.entityCount('RoleAssignment', 1)
    let id = idOf(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    assert.fieldEquals('RoleAssignment', id, 'active', 'false')
    assert.fieldEquals('RoleAssignment', id, 'revokedAtBlock', '200')
    assert.fieldEquals('RoleAssignment', id, 'revokedAtTimestamp', '2000')
    // Grant fields from the earlier grant are retained for history.
    assert.fieldEquals('RoleAssignment', id, 'grantedAtBlock', '100')
  })

  test('a revoke seen before any grant records an inactive assignment', () => {
    let revoked = createRoleRevokedEvent(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    revoked.block.number = BigInt.fromI32(200)
    revoked.block.timestamp = BigInt.fromI32(2000)
    handleRoleRevoked(revoked)

    assert.entityCount('RoleAssignment', 1)
    let id = idOf(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    assert.fieldEquals('RoleAssignment', id, 'active', 'false')
    assert.fieldEquals('RoleAssignment', id, 'revokedAtBlock', '200')
    // Never granted — grant audit fields stay at the zero defaults.
    assert.fieldEquals('RoleAssignment', id, 'grantedAtBlock', '0')
    assert.fieldEquals('RoleAssignment', id, 'grantedBy', Address.zero().toHexString())
  })

  test('granting again after a revoke re-activates and refreshes grant fields', () => {
    let id = idOf(AGREEMENT_MANAGER_ROLE, ACCOUNT)

    let granted = createRoleGrantedEvent(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    granted.block.number = BigInt.fromI32(100)
    handleRoleGranted(granted)

    let revoked = createRoleRevokedEvent(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    revoked.block.number = BigInt.fromI32(200)
    handleRoleRevoked(revoked)
    assert.fieldEquals('RoleAssignment', id, 'active', 'false')

    let regranted = createRoleGrantedEvent(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    regranted.block.number = BigInt.fromI32(300)
    handleRoleGranted(regranted)

    assert.entityCount('RoleAssignment', 1)
    assert.fieldEquals('RoleAssignment', id, 'active', 'true')
    assert.fieldEquals('RoleAssignment', id, 'grantedAtBlock', '300')
    // The last revoke stays recorded.
    assert.fieldEquals('RoleAssignment', id, 'revokedAtBlock', '200')
  })

  test('granting governor or operator is now indexed so admins resolve', () => {
    handleRoleGranted(createRoleGrantedEvent(GOVERNOR_ROLE, ACCOUNT))
    handleRoleGranted(createRoleGrantedEvent(OPERATOR_ROLE, ACCOUNT))

    assert.entityCount('RoleAssignment', 2)
    assert.fieldEquals('RoleAssignment', idOf(GOVERNOR_ROLE, ACCOUNT), 'active', 'true')
    assert.fieldEquals('RoleAssignment', idOf(OPERATOR_ROLE, ACCOUNT), 'active', 'true')
  })

  test('granting collector and data-service roles creates active assignments', () => {
    handleRoleGranted(createRoleGrantedEvent(COLLECTOR_ROLE, ACCOUNT))
    handleRoleGranted(createRoleGrantedEvent(DATA_SERVICE_ROLE, ACCOUNT))

    assert.entityCount('RoleAssignment', 2)
    assert.fieldEquals('RoleAssignment', idOf(COLLECTOR_ROLE, ACCOUNT), 'active', 'true')
    assert.fieldEquals('RoleAssignment', idOf(DATA_SERVICE_ROLE, ACCOUNT), 'active', 'true')
  })

  test('records the transaction hash and acting account on grant and revoke', () => {
    let id = idOf(AGREEMENT_MANAGER_ROLE, ACCOUNT)

    let grantTx = Bytes.fromHexString('0x' + 'ab'.repeat(32))
    let granted = createRoleGrantedEvent(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    granted.transaction.hash = grantTx
    handleRoleGranted(granted)
    assert.fieldEquals('RoleAssignment', id, 'grantedAtTx', grantTx.toHexString())
    assert.fieldEquals('RoleAssignment', id, 'grantedBy', SENDER.toHexString())
    // No revoke seen yet — the revoke actor stays at the zero-address default.
    assert.fieldEquals('RoleAssignment', id, 'revokedBy', Address.zero().toHexString())

    let revokeTx = Bytes.fromHexString('0x' + 'cd'.repeat(32))
    let revoked = createRoleRevokedEvent(AGREEMENT_MANAGER_ROLE, ACCOUNT)
    revoked.transaction.hash = revokeTx
    handleRoleRevoked(revoked)
    assert.fieldEquals('RoleAssignment', id, 'revokedAtTx', revokeTx.toHexString())
    assert.fieldEquals('RoleAssignment', id, 'revokedBy', SENDER.toHexString())
  })

  test('granting a non-indexed role is ignored', () => {
    handleRoleGranted(createRoleGrantedEvent(PAUSE_ROLE, ACCOUNT))
    assert.entityCount('RoleAssignment', 0)
  })
})

describe('handleRoleAdminChanged', () => {
  afterEach(() => {
    clearStore()
  })

  test('records the admin hierarchy for a DIPs role', () => {
    let event = createRoleAdminChangedEvent(AGREEMENT_MANAGER_ROLE, GOVERNOR_ROLE, OPERATOR_ROLE)
    event.block.number = BigInt.fromI32(50)
    event.block.timestamp = BigInt.fromI32(500)
    handleRoleAdminChanged(event)

    assert.entityCount('RoleAdmin', 1)
    let id = AGREEMENT_MANAGER_ROLE.toHexString()
    assert.fieldEquals('RoleAdmin', id, 'role', AGREEMENT_MANAGER_ROLE.toHexString())
    assert.fieldEquals('RoleAdmin', id, 'adminRole', OPERATOR_ROLE.toHexString())
    assert.fieldEquals('RoleAdmin', id, 'previousAdminRole', GOVERNOR_ROLE.toHexString())
    assert.fieldEquals('RoleAdmin', id, 'updatedAtBlock', '50')
  })

  test('admin change for a non-indexed role is ignored', () => {
    handleRoleAdminChanged(createRoleAdminChangedEvent(PAUSE_ROLE, GOVERNOR_ROLE, OPERATOR_ROLE))
    assert.entityCount('RoleAdmin', 0)
  })
})
