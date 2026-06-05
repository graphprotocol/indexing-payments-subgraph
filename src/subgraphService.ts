import { ethereum, log } from '@graphprotocol/graph-ts'
import {
  IndexingAgreementAccepted as AcceptedEvent,
  IndexingAgreementCanceled as CanceledEvent,
  IndexingAgreementUpdated as UpdatedEvent,
  IndexingFeesCollectedV1 as FeesCollectedEvent,
} from '../generated/SubgraphService/SubgraphService'
import { ServiceProviderRegistered as RegisteredEvent } from '../generated/SubgraphServiceRegistration/SubgraphService'
import { Indexer, IndexerDeploymentLatest, IndexingFeeCollection } from '../generated/schema'
import { createOrLoadIndexingAgreement, tuplePrefixBytes } from './helpers'

export function handleIndexingAgreementAccepted(event: AcceptedEvent): void {
  let agreement = createOrLoadIndexingAgreement(event.params.agreementId)
  agreement.allocationId = event.params.allocationId
  agreement.subgraphDeploymentId = event.params.subgraphDeploymentId
  agreement.acceptedAtTx = event.transaction.hash

  let decoded = ethereum.decode('(uint256,uint256)', event.params.versionTerms)
  if (decoded != null) {
    let terms = decoded.toTuple()
    agreement.tokensPerSecond = terms[0].toBigInt()
    agreement.tokensPerEntityPerSecond = terms[1].toBigInt()
  }

  agreement.lastStateChangeBlock = event.block.number
  agreement.save()
}

export function handleIndexingAgreementCanceled(event: CanceledEvent): void {
  let agreement = createOrLoadIndexingAgreement(event.params.agreementId)
  // canceledOnBehalfOf is the signer that initiated the cancel — for
  // operator-initiated cancels the operator, not the payer/indexer. Dipper
  // compares it to its own signer to decide CanceledByRequester vs CanceledByIndexer.
  agreement.canceledBy = event.params.canceledOnBehalfOf
  agreement.canceledAtTx = event.transaction.hash
  agreement.lastStateChangeBlock = event.block.number
  agreement.save()
}

export function handleIndexingAgreementUpdated(event: UpdatedEvent): void {
  let agreement = createOrLoadIndexingAgreement(event.params.agreementId)
  agreement.allocationId = event.params.allocationId

  let decoded = ethereum.decode('(uint256,uint256)', event.params.versionTerms)
  if (decoded != null) {
    let terms = decoded.toTuple()
    agreement.tokensPerSecond = terms[0].toBigInt()
    agreement.tokensPerEntityPerSecond = terms[1].toBigInt()
  }

  agreement.lastStateChangeBlock = event.block.number
  agreement.save()
}

export function handleIndexingFeesCollectedV1(event: FeesCollectedEvent): void {
  let collectionId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let collection = new IndexingFeeCollection(collectionId)
  collection.agreement = event.params.agreementId
  collection.currentEpoch = event.params.currentEpoch
  collection.tokensCollected = event.params.tokensCollected
  collection.entities = event.params.entities
  collection.poi = event.params.poi
  collection.poiBlockNumber = event.params.poiBlockNumber
  collection.blockNumber = event.block.number
  collection.blockTimestamp = event.block.timestamp
  collection.transactionHash = event.transaction.hash
  collection.save()

  let compositeId =
    event.params.indexer.toHexString() + '-' + event.params.subgraphDeploymentId.toHexString()
  let latest = IndexerDeploymentLatest.load(compositeId)
  if (latest == null) {
    latest = new IndexerDeploymentLatest(compositeId)
    latest.indexer = event.params.indexer
    latest.subgraphDeploymentId = event.params.subgraphDeploymentId
  }
  latest.agreementId = event.params.agreementId
  latest.entities = event.params.entities
  latest.tokensCollected = event.params.tokensCollected
  latest.poiBlockNumber = event.params.poiBlockNumber
  latest.blockNumber = event.block.number
  latest.blockTimestamp = event.block.timestamp
  latest.save()
}

export function handleServiceProviderRegistered(event: RegisteredEvent): void {
  // The url/geohash/paymentsDestination ride inside the opaque `data` blob the
  // contract re-emits; decode it the way the contract encoded it. We only keep
  // the url (element 0); geohash and paymentsDestination are intentionally dropped.
  let decoded = ethereum.decode('(string,string,address)', tuplePrefixBytes(event.params.data))
  // decode() of a tuple type returns either null or a tuple-kind value, so a null
  // check is sufficient — matching the (uint256,uint256) decode sites above.
  if (decoded == null) {
    // Surface a malformed payload rather than swallowing it; the indexer simply
    // keeps whatever url was last decoded (or none).
    log.warning('ServiceProviderRegistered failed to decode for {} (data: {})', [
      event.params.serviceProvider.toHexString(),
      event.params.data.toHexString(),
    ])
    return
  }

  let indexer = Indexer.load(event.params.serviceProvider)
  if (indexer == null) {
    indexer = new Indexer(event.params.serviceProvider)
  }
  // Re-registration overwrites the on-chain record, so this is last-write-wins.
  indexer.url = decoded.toTuple()[0].toString()
  indexer.lastUpdatedAtBlock = event.block.number
  indexer.lastUpdatedAtTx = event.transaction.hash
  indexer.save()
}
