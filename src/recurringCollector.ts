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

// CancelAgreementBy enum from IRecurringCollector.sol: 0 = ServiceProvider,
// 1 = Payer, 2 = ThirdParty. The contract treats anything that isn't Payer as
// ServiceProvider; ThirdParty is currently unreachable from SubgraphService.
const CANCEL_BY_PAYER: i32 = 1

export function handleAgreementAccepted(event: AgreementAccepted): void {
  let agreement = createOrLoadIndexingAgreement(event.params.agreementId)

  // The contract sets `agreement.acceptedAt = uint64(block.timestamp)` inside
  // accept(), so the event's block timestamp is the canonical value.
  agreement.payer = event.params.payer
  agreement.indexer = event.params.serviceProvider
  // Link to the Indexer registration record by address. Safe to set even if that
  // record isn't indexed yet — the reference resolves once the indexer registers.
  agreement.indexerInfo = event.params.serviceProvider
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

  // The actual canceler address is written by handleIndexingAgreementCanceled,
  // which fires in the same tx and reads canceledOnBehalfOf. The contract sets
  // canceledAt = block.timestamp inside cancel(), so the event timestamp is canonical.
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
  // Fires for OFFER_TYPE_NEW and again for each OFFER_TYPE_UPDATE that changes the
  // stored hash. The contract overwrites in place, so refresh offerType/offerHash
  // every event; createdAt stays pinned to the first NEW to mark the initial offer.
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
  // Fires when a signer cancels a stored RCA/RCAU offer; the contract deletes the
  // on-chain entry, so mark the Offer not-live by stamping canceledAt with the event
  // timestamp. Consumers query `canceledAt > 0` to decide "safe to re-submit".
  let offer = Offer.load(event.params.agreementId)
  if (offer == null) return
  offer.canceledAt = event.block.timestamp
  offer.save()
}
