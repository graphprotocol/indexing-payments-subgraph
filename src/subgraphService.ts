import { ethereum } from '@graphprotocol/graph-ts'
import {
  IndexingAgreementAccepted as AcceptedEvent,
  IndexingAgreementUpdated as UpdatedEvent,
  IndexingFeesCollectedV1 as FeesCollectedEvent,
} from '../generated/SubgraphService/SubgraphService'
import { IndexerDeploymentLatest, IndexingFeeCollection } from '../generated/schema'
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
