import { ethereum } from '@graphprotocol/graph-ts'
import {
  IndexingAgreementAccepted as AcceptedEvent,
  IndexingAgreementCanceled as CanceledEvent,
  IndexingAgreementUpdated as UpdatedEvent,
  IndexingFeesCollectedV1 as FeesCollectedEvent,
} from '../generated/SubgraphService/SubgraphService'
import {
  IndexerDeploymentLatest,
  IndexingFeeCollection,
  IndexingAgreementAccepted,
  IndexingAgreementCanceled,
  IndexingAgreementUpdated,
} from '../generated/schema'
import { createOrLoadIndexingAgreement } from './helpers'

export function handleIndexingAgreementAccepted(event: AcceptedEvent): void {
  let agreement = createOrLoadIndexingAgreement(event.params.agreementId)
  agreement.allocationId = event.params.allocationId
  agreement.subgraphDeploymentId = event.params.subgraphDeploymentId

  let decoded = ethereum.decode('(uint256,uint256)', event.params.versionTerms)
  if (decoded != null) {
    let terms = decoded.toTuple()
    agreement.tokensPerSecond = terms[0].toBigInt()
    agreement.tokensPerEntityPerSecond = terms[1].toBigInt()
  }

  agreement.save()

  let logId = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
  let log = new IndexingAgreementAccepted(logId)
  log.indexer = event.params.indexer
  log.payer = event.params.payer
  log.agreementId = event.params.agreementId
  log.allocationId = event.params.allocationId
  log.blockNumber = event.block.number
  log.blockTimestamp = event.block.timestamp
  log.transactionHash = event.transaction.hash
  log.save()
}

export function handleIndexingAgreementCanceled(event: CanceledEvent): void {
  // State and canceledAt are set by RecurringCollector.handleAgreementCanceled,
  // which emits the canonical cancel event with the canceledBy enum. This
  // handler just writes the immutable transition log for event-sourcing
  // consumers (dipper's chain_listener).
  let logId = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
  let log = new IndexingAgreementCanceled(logId)
  log.indexer = event.params.indexer
  log.payer = event.params.payer
  log.agreementId = event.params.agreementId
  log.canceledBy = event.params.canceledOnBehalfOf
  log.blockNumber = event.block.number
  log.blockTimestamp = event.block.timestamp
  log.transactionHash = event.transaction.hash
  log.save()
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

  agreement.save()

  let logId = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
  let log = new IndexingAgreementUpdated(logId)
  log.indexer = event.params.indexer
  log.payer = event.params.payer
  log.agreementId = event.params.agreementId
  log.allocationId = event.params.allocationId
  log.version = event.params.version
  log.blockNumber = event.block.number
  log.blockTimestamp = event.block.timestamp
  log.transactionHash = event.transaction.hash
  log.save()
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
