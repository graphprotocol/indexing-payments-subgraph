import { IndexingAgreement, Offer } from '../generated/schema'
import {
  AgreementAccepted,
  AgreementCanceled,
  AgreementUpdated,
  RCACollected,
  OfferStored as OfferStoredEvent,
} from '../generated/RecurringCollector/RecurringCollector'
import { createOrLoadIndexingAgreement, BIGINT_ZERO } from './helpers'

export function handleAgreementAccepted(event: AgreementAccepted): void {
  let agreement = createOrLoadIndexingAgreement(event.params.agreementId)

  agreement.payer = event.params.payer
  agreement.indexer = event.params.serviceProvider
  agreement.state = 'Accepted'
  agreement.acceptedAt = event.params.acceptedAt
  agreement.lastCollectionAt = event.params.acceptedAt
  agreement.endsAt = event.params.endsAt
  agreement.maxInitialTokens = event.params.maxInitialTokens
  agreement.maxOngoingTokensPerSecond = event.params.maxOngoingTokensPerSecond
  agreement.minSecondsPerCollection = event.params.minSecondsPerCollection.toI32()
  agreement.maxSecondsPerCollection = event.params.maxSecondsPerCollection.toI32()
  agreement.canceledAt = BIGINT_ZERO
  agreement.tokensCollected = BIGINT_ZERO

  agreement.save()
}

export function handleAgreementCanceled(event: AgreementCanceled): void {
  let agreement = IndexingAgreement.load(event.params.agreementId)
  if (agreement == null) return

  // canceledBy enum: 0=ServiceProvider, 1=Payer
  if (event.params.canceledBy == 0) {
    agreement.state = 'CanceledByServiceProvider'
  } else {
    agreement.state = 'CanceledByPayer'
  }
  agreement.canceledAt = event.params.canceledAt
  agreement.save()
}

export function handleAgreementUpdated(event: AgreementUpdated): void {
  let agreement = IndexingAgreement.load(event.params.agreementId)
  if (agreement == null) return

  agreement.lastUpdatedAt = event.params.updatedAt
  agreement.endsAt = event.params.endsAt
  agreement.maxInitialTokens = event.params.maxInitialTokens
  agreement.maxOngoingTokensPerSecond = event.params.maxOngoingTokensPerSecond
  agreement.minSecondsPerCollection = event.params.minSecondsPerCollection.toI32()
  agreement.maxSecondsPerCollection = event.params.maxSecondsPerCollection.toI32()
  agreement.save()
}

export function handleRCACollected(event: RCACollected): void {
  let agreement = IndexingAgreement.load(event.params.agreementId)
  if (agreement == null) return

  agreement.lastCollectionAt = event.block.timestamp
  agreement.tokensCollected = agreement.tokensCollected.plus(event.params.tokens)
  agreement.save()
}

export function handleOfferStored(event: OfferStoredEvent): void {
  // First-offer entity keyed by agreementId (bytes16). Immutable: if an
  // entity already exists, a duplicate OfferStored event for the same
  // agreement id (e.g. dipper crashed and re-submitted, or a chain reorg
  // re-emitted) carries the same offerHash by construction and we return
  // early. Writing to an immutable entity a second time is a graph-node
  // error that would halt the subgraph, so the guard is load-bearing.
  let existing = Offer.load(event.params.agreementId)
  if (existing != null) {
    return
  }
  let offer = new Offer(event.params.agreementId)
  offer.payer = event.params.payer
  offer.offerType = event.params.offerType
  offer.offerHash = event.params.offerHash
  offer.createdAtBlock = event.block.number
  offer.createdAtTimestamp = event.block.timestamp
  offer.createdAtTx = event.transaction.hash
  offer.save()
}
