import { Address, BigInt, ByteArray, Bytes } from '@graphprotocol/graph-ts'
import { IndexingAgreement, RoleAssignment } from '../generated/schema'

export const BIGINT_ZERO = BigInt.fromI32(0)
// 32-byte zero sentinel. Bytes.empty() serializes with unpredictable padding on
// non-nullable fields; a fixed-length value gives consumers something
// deterministic to check against when no on-chain tx exists yet.
export const BYTES32_ZERO = Bytes.fromHexString('0x' + '00'.repeat(32)) as Bytes

// Role identifiers (keccak256 of the role names). The three DIPs roles drive the
// indexer's trust checks; GOVERNOR/OPERATOR are indexed so RoleAdmin admins resolve to
// holders. PAUSE administers none, omitted — its emergency revokes still emit RoleRevoked.
export const AGREEMENT_MANAGER_ROLE = Bytes.fromHexString(
  '0xeb1b3455811b30c0dd237887f6349f22cc96ee5963709d7fe356d9b0cefa6d22',
) as Bytes
export const COLLECTOR_ROLE = Bytes.fromHexString(
  '0x14cf45180c3fcf249a5a305e9657ea05c14fd4f4e1800ee0216a8213091711d2',
) as Bytes
export const DATA_SERVICE_ROLE = Bytes.fromHexString(
  '0xb24201cd204615da5223ccceee91f8943c451c6e49dd43dcd78e2cfe6ecd6be8',
) as Bytes
export const GOVERNOR_ROLE = Bytes.fromHexString(
  '0x7935bd0ae54bc31f548c14dba4d37c5c64b3f8ca900cb468fb8abd54d5894f55',
) as Bytes
export const OPERATOR_ROLE = Bytes.fromHexString(
  '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929',
) as Bytes

// True when the role is one the subgraph indexes: the three DIPs roles plus the
// governor and operator roles that administer them.
export function isIndexedRole(role: Bytes): boolean {
  return (
    role == AGREEMENT_MANAGER_ROLE ||
    role == COLLECTOR_ROLE ||
    role == DATA_SERVICE_ROLE ||
    role == GOVERNOR_ROLE ||
    role == OPERATOR_ROLE
  )
}

export function createOrLoadRoleAssignment(role: Bytes, account: Bytes): RoleAssignment {
  let id = role.concat(account)
  let assignment = RoleAssignment.load(id)
  if (assignment == null) {
    assignment = new RoleAssignment(id)
    assignment.role = role
    assignment.account = account
    assignment.active = false
    assignment.grantedAtBlock = BIGINT_ZERO
    assignment.grantedAtTimestamp = BIGINT_ZERO
    assignment.grantedAtTx = BYTES32_ZERO
    assignment.grantedBy = Address.zero() as Bytes
    assignment.revokedAtBlock = BIGINT_ZERO
    assignment.revokedAtTimestamp = BIGINT_ZERO
    assignment.revokedAtTx = BYTES32_ZERO
    assignment.revokedBy = Address.zero() as Bytes
  }
  return assignment
}

export function createOrLoadIndexingAgreement(agreementId: Bytes): IndexingAgreement {
  let agreement = IndexingAgreement.load(agreementId)
  if (agreement == null) {
    agreement = new IndexingAgreement(agreementId)
    agreement.payer = Bytes.empty()
    agreement.indexer = Bytes.empty()
    agreement.allocationId = Bytes.empty()
    agreement.subgraphDeploymentId = Bytes.empty()
    agreement.state = 'NotAccepted'
    agreement.acceptedAt = BIGINT_ZERO
    agreement.acceptedAtTx = BYTES32_ZERO
    agreement.lastCollectionAt = BIGINT_ZERO
    agreement.endsAt = BIGINT_ZERO
    agreement.maxInitialTokens = BIGINT_ZERO
    agreement.maxOngoingTokensPerSecond = BIGINT_ZERO
    agreement.tokensPerSecond = BIGINT_ZERO
    agreement.tokensPerEntityPerSecond = BIGINT_ZERO
    agreement.minSecondsPerCollection = 0
    agreement.maxSecondsPerCollection = 0
    agreement.lastUpdatedAt = BIGINT_ZERO
    agreement.canceledAt = BIGINT_ZERO
    agreement.canceledAtTx = BYTES32_ZERO
    // Default to 20-byte zero address rather than Bytes.empty(): graph-node
    // serializes empty Bytes on non-nullable fields with unpredictable padding
    // (observed as "0x00000000"), breaking strict 20-byte-address parsers downstream.
    agreement.canceledBy = Address.zero() as Bytes
    agreement.tokensCollected = BIGINT_ZERO
    agreement.lastStateChangeBlock = BIGINT_ZERO
  }
  return agreement
}

// ethereum.decode expects a standalone dynamic tuple to begin with a 32-byte
// offset word, but abi.encode(url, geohash, dest) on-chain omits that outer
// offset. Prepend it so the registration payload decodes as (string,string,address).
export function tuplePrefixBytes(input: Bytes): Bytes {
  let tuplePrefix = ByteArray.fromHexString(
    '0x0000000000000000000000000000000000000000000000000000000000000020',
  )
  let inputAsTuple = new Uint8Array(tuplePrefix.length + input.length)
  inputAsTuple.set(tuplePrefix, 0)
  inputAsTuple.set(input.subarray(0), tuplePrefix.length)
  return Bytes.fromUint8Array(inputAsTuple)
}
