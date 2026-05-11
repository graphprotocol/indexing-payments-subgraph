import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { IndexingAgreement } from '../generated/schema'

export const BIGINT_ZERO = BigInt.fromI32(0)

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
    // Default to 20-byte zero address rather than Bytes.empty(). Graph-node
    // serializes empty Bytes on non-nullable fields with unpredictable
    // padding (observed as "0x00000000" in practice), which breaks strict
    // 20-byte-address parsers on the consumer side.
    agreement.canceledBy = Address.zero() as Bytes
    agreement.tokensCollected = BIGINT_ZERO
    agreement.lastStateChangeBlock = BIGINT_ZERO
  }
  return agreement
}
