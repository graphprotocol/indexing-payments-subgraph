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
}
