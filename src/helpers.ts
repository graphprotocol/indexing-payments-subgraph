import { Address, BigInt, ByteArray, Bytes } from '@graphprotocol/graph-ts'
import { IndexingAgreement } from '../generated/schema'

export const BIGINT_ZERO = BigInt.fromI32(0)
// 32-byte zero sentinel. Bytes.empty() serializes with unpredictable padding on
// non-nullable fields; a fixed-length value gives consumers something
// deterministic to check against when no on-chain tx exists yet.
export const BYTES32_ZERO = Bytes.fromHexString('0x' + '00'.repeat(32)) as Bytes

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
