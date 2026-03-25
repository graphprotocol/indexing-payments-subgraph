import {
  IndexingAgreementAccepted as AcceptedEvent,
  IndexingAgreementCanceled as CanceledEvent,
  IndexingAgreementUpdated as UpdatedEvent,
  IndexingFeesCollectedV1 as FeesCollectedEvent,
} from '../generated/SubgraphService/SubgraphService'
import {
  IndexingAgreementAccepted,
  IndexingAgreementCanceled,
  IndexingAgreementUpdated,
  IndexingFeesCollected,
  IndexerDeploymentLatest,
} from '../generated/schema'

export function handleIndexingAgreementAccepted(event: AcceptedEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
  let entity = new IndexingAgreementAccepted(id)

  entity.indexer = event.params.indexer
  entity.payer = event.params.payer
  entity.agreementId = event.params.agreementId
  entity.allocationId = event.params.allocationId
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleIndexingAgreementCanceled(event: CanceledEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
  let entity = new IndexingAgreementCanceled(id)

  entity.indexer = event.params.indexer
  entity.payer = event.params.payer
  entity.agreementId = event.params.agreementId
  entity.canceledBy = event.params.canceledOnBehalfOf
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleIndexingAgreementUpdated(event: UpdatedEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
  let entity = new IndexingAgreementUpdated(id)

  entity.indexer = event.params.indexer
  entity.payer = event.params.payer
  entity.agreementId = event.params.agreementId
  entity.allocationId = event.params.allocationId
  entity.version = event.params.version
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleIndexingFeesCollectedV1(event: FeesCollectedEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
  let entity = new IndexingFeesCollected(id)

  entity.indexer = event.params.indexer
  entity.payer = event.params.payer
  entity.agreementId = event.params.agreementId
  entity.allocationId = event.params.allocationId
  entity.subgraphDeploymentId = event.params.subgraphDeploymentId
  entity.currentEpoch = event.params.currentEpoch
  entity.tokensCollected = event.params.tokensCollected
  entity.entities = event.params.entities
  entity.poi = event.params.poi
  entity.poiBlockNumber = event.params.poiBlockNumber
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  // Track latest collection per (indexer, deployment) pair.
  // Dipper uses the claimed entity count to compute the full fee rate.
  // Fishermen use the same entity to compare claims across indexers.
  // Note: agreementId reflects whichever agreement collected most recently.
  // If an indexer has multiple agreements for the same deployment, only the
  // last collection's agreementId is stored. The entity count is still
  // correct — a subgraph has the same entity count regardless of which
  // agreement produced the collection.
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
