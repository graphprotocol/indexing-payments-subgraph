import {
  IndexingAgreementAccepted as AcceptedEvent,
  IndexingAgreementCanceled as CanceledEvent,
} from '../generated/SubgraphService/SubgraphService'
import { IndexingAgreementAccepted, IndexingAgreementCanceled } from '../generated/schema'

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
