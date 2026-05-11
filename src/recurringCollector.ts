import { IndexingAgreement, Offer } from '../generated/schema'
import {
  AgreementAccepted,
  AgreementCanceled,
  AgreementUpdated,
  RCACollected,
  OfferStored as OfferStoredEvent,
  OfferCancelled as OfferCancelledEvent,
} from '../generated/RecurringCollector/RecurringCollector'
import { createOrLoadIndexingAgreement, BIGINT_ZERO } from './helpers'

// CancelAgreementBy enum from IRecurringCollector.sol:
//   0 = ServiceProvider, 1 = Payer, 2 = ThirdParty
// The contract treats anything that isn't Payer as ServiceProvider when
// emitting the SubgraphService-side IndexingAgreementCanceled event, so we
// mirror that mapping here. ThirdParty (2) is currently unreachable from
// SubgraphService — adding the explicit branch documents the contract's
// intent and keeps the mapping correct if a future data service surfaces it.
const CANCEL_BY_PAYER: i32 = 1

export function handleAgreementAccepted(event: AgreementAccepted): void {
  let agreement = createOrLoadIndexingAgreement(event.params.agreementId)

  // The contract sets `agreement.acceptedAt = uint64(block.timestamp)` inside
  // accept(), so the event's block timestamp is the canonical value.
  agreement.payer = event.params.payer
  agreement.indexer = event.params.serviceProvider
  agreement.state = 'Accepted'
  agreement.acceptedAt = event.block.timestamp
  agreement.lastCollectionAt = event.block.timestamp
  agreement.endsAt = event.params.endsAt
  agreement.maxInitialTokens = event.params.maxInitialTokens
  agreement.maxOngoingTokensPerSecond = event.params.maxOngoingTokensPerSecond
  agreement.minSecondsPerCollection = event.params.minSecondsPerCollection.toI32()
  agreement.maxSecondsPerCollection = event.params.maxSecondsPerCollection.toI32()
  agreement.canceledAt = BIGINT_ZERO
  agreement.tokensCollected = BIGINT_ZERO
  agreement.lastStateChangeBlock = event.block.number

  agreement.save()
}

export function handleAgreementCanceled(event: AgreementCanceled): void {
  let agreement = IndexingAgreement.load(event.params.agreementId)
  if (agreement == null) return

  // The actual canceler address is written by
  // subgraphService.handleIndexingAgreementCanceled, which fires in the
  // same transaction and reads the SubgraphService event's
  // canceledOnBehalfOf parameter. The contract sets
  // `agreement.canceledAt = uint64(block.timestamp)` inside cancel(), so
  // the event's block timestamp is the canonical value.
  if (event.params.canceledBy == CANCEL_BY_PAYER) {
    agreement.state = 'CanceledByPayer'
  } else {
    agreement.state = 'CanceledByServiceProvider'
  }
  agreement.canceledAt = event.block.timestamp
  agreement.lastStateChangeBlock = event.block.number
  agreement.save()
}

export function handleAgreementUpdated(event: AgreementUpdated): void {
  let agreement = IndexingAgreement.load(event.params.agreementId)
  if (agreement == null) return

  agreement.lastUpdatedAt = event.block.timestamp
  agreement.endsAt = event.params.endsAt
  agreement.maxInitialTokens = event.params.maxInitialTokens
  agreement.maxOngoingTokensPerSecond = event.params.maxOngoingTokensPerSecond
  agreement.minSecondsPerCollection = event.params.minSecondsPerCollection.toI32()
  agreement.maxSecondsPerCollection = event.params.maxSecondsPerCollection.toI32()
  agreement.lastStateChangeBlock = event.block.number
  agreement.save()
}

export function handleRCACollected(event: RCACollected): void {
  let agreement = IndexingAgreement.load(event.params.agreementId)
  if (agreement == null) return

  agreement.lastCollectionAt = event.block.timestamp
  agreement.tokensCollected = agreement.tokensCollected.plus(event.params.tokens)
  agreement.lastStateChangeBlock = event.block.number
  agreement.save()
}

export function handleOfferStored(event: OfferStoredEvent): void {
  // OfferStored fires once per agreementId for OFFER_TYPE_NEW and again
  // for each OFFER_TYPE_UPDATE that changes the stored offer hash. The
  // contract overwrites $.rcaOffers / $.rcauOffers in-place, so dipper's
  // idempotency gate has to see the latest terms — keep the entity
  // mutable and refresh offerType / offerHash on every event. `createdAt`
  // fields stay pinned to the first OFFER_TYPE_NEW so consumers can
  // distinguish initial offer from subsequent updates.
  let offer = Offer.load(event.params.agreementId)
  if (offer == null) {
    offer = new Offer(event.params.agreementId)
    offer.createdAtBlock = event.block.number
    offer.createdAtTimestamp = event.block.timestamp
    offer.createdAtTx = event.transaction.hash
  }
  offer.payer = event.params.payer
  offer.offerType = event.params.offerType
  offer.offerHash = event.params.offerHash
  offer.canceledAt = BIGINT_ZERO
  offer.save()
}

export function handleOfferCancelled(event: OfferCancelledEvent): void {
  // OfferCancelled fires when a payer (or any signer at SCOPE_SIGNED)
  // cancels a stored RCA/RCAU offer. The contract deletes the on-chain
  // entry, so dipper's idempotency gate must treat the Offer as no longer
  // live. Set canceledAt to the event's block timestamp; consumers query
  // `canceledAt > 0` to decide "safe to re-submit".
  let offer = Offer.load(event.params.agreementId)
  if (offer == null) return
  offer.canceledAt = event.block.timestamp
  offer.save()
}
