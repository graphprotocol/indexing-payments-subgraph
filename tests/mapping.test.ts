import { assert, describe, test, clearStore, afterEach } from 'matchstick-as'
import { Address, Bytes, BigInt, ethereum } from '@graphprotocol/graph-ts'
import { handleIndexingAgreementAccepted, handleIndexingAgreementCanceled } from '../src/mapping'
import {
  IndexingAgreementAccepted as AcceptedEvent,
  IndexingAgreementCanceled as CanceledEvent,
} from '../generated/SubgraphService/SubgraphService'
import { newMockEvent } from 'matchstick-as'

function createAcceptedEvent(
  indexer: Address,
  payer: Address,
  agreementId: Bytes,
  allocationId: Address,
  subgraphDeploymentId: Bytes,
  version: i32,
  versionTerms: Bytes,
): AcceptedEvent {
  let event = changetype<AcceptedEvent>(newMockEvent())

  event.parameters = new Array()
  event.parameters.push(new ethereum.EventParam('indexer', ethereum.Value.fromAddress(indexer)))
  event.parameters.push(new ethereum.EventParam('payer', ethereum.Value.fromAddress(payer)))
  event.parameters.push(
    new ethereum.EventParam('agreementId', ethereum.Value.fromFixedBytes(agreementId)),
  )
  event.parameters.push(
    new ethereum.EventParam('allocationId', ethereum.Value.fromAddress(allocationId)),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'subgraphDeploymentId',
      ethereum.Value.fromFixedBytes(subgraphDeploymentId),
    ),
  )
  event.parameters.push(new ethereum.EventParam('version', ethereum.Value.fromI32(version)))
  event.parameters.push(
    new ethereum.EventParam('versionTerms', ethereum.Value.fromBytes(versionTerms)),
  )

  return event
}

function createCanceledEvent(
  indexer: Address,
  payer: Address,
  agreementId: Bytes,
  canceledOnBehalfOf: Address,
): CanceledEvent {
  let event = changetype<CanceledEvent>(newMockEvent())

  event.parameters = new Array()
  event.parameters.push(new ethereum.EventParam('indexer', ethereum.Value.fromAddress(indexer)))
  event.parameters.push(new ethereum.EventParam('payer', ethereum.Value.fromAddress(payer)))
  event.parameters.push(
    new ethereum.EventParam('agreementId', ethereum.Value.fromFixedBytes(agreementId)),
  )
  event.parameters.push(
    new ethereum.EventParam('canceledOnBehalfOf', ethereum.Value.fromAddress(canceledOnBehalfOf)),
  )

  return event
}

describe('IndexingAgreementAccepted', () => {
  afterEach(() => {
    clearStore()
  })

  test('creates entity with correct fields', () => {
    let indexer = Address.fromString('0x0000000000000000000000000000000000000001')
    let payer = Address.fromString('0x0000000000000000000000000000000000000002')
    let agreementId = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')
    let allocationId = Address.fromString('0x0000000000000000000000000000000000000003')
    let subgraphDeploymentId = Bytes.fromHexString('0x' + 'ab'.repeat(32))
    let versionTerms = Bytes.fromHexString('0xdeadbeef')

    let event = createAcceptedEvent(
      indexer,
      payer,
      agreementId,
      allocationId,
      subgraphDeploymentId,
      1,
      versionTerms,
    )
    handleIndexingAgreementAccepted(event)

    let id = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
    assert.entityCount('IndexingAgreementAccepted', 1)
    assert.fieldEquals('IndexingAgreementAccepted', id, 'indexer', indexer.toHexString())
    assert.fieldEquals('IndexingAgreementAccepted', id, 'payer', payer.toHexString())
    assert.fieldEquals('IndexingAgreementAccepted', id, 'agreementId', agreementId.toHexString())
    assert.fieldEquals('IndexingAgreementAccepted', id, 'allocationId', allocationId.toHexString())
  })

  test('handles multiple events', () => {
    let indexer = Address.fromString('0x0000000000000000000000000000000000000001')
    let payer = Address.fromString('0x0000000000000000000000000000000000000002')
    let allocationId = Address.fromString('0x0000000000000000000000000000000000000003')
    let subgraphDeploymentId = Bytes.fromHexString('0x' + 'ab'.repeat(32))
    let versionTerms = Bytes.fromHexString('0xdeadbeef')

    let agreementId1 = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')
    let agreementId2 = Bytes.fromHexString('0x1112131415161718191a1b1c1d1e1f20')

    let event1 = createAcceptedEvent(
      indexer,
      payer,
      agreementId1,
      allocationId,
      subgraphDeploymentId,
      1,
      versionTerms,
    )
    let event2 = createAcceptedEvent(
      indexer,
      payer,
      agreementId2,
      allocationId,
      subgraphDeploymentId,
      1,
      versionTerms,
    )
    // Give event2 a different tx hash so entity IDs differ
    event2.transaction.hash = Bytes.fromHexString(
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    ) as Bytes

    handleIndexingAgreementAccepted(event1)
    handleIndexingAgreementAccepted(event2)

    assert.entityCount('IndexingAgreementAccepted', 2)
  })
})

describe('IndexingAgreementCanceled', () => {
  afterEach(() => {
    clearStore()
  })

  test('creates entity with canceledBy mapped from canceledOnBehalfOf', () => {
    let indexer = Address.fromString('0x0000000000000000000000000000000000000001')
    let payer = Address.fromString('0x0000000000000000000000000000000000000002')
    let agreementId = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')
    let canceledOnBehalfOf = Address.fromString('0x0000000000000000000000000000000000000002')

    let event = createCanceledEvent(indexer, payer, agreementId, canceledOnBehalfOf)
    handleIndexingAgreementCanceled(event)

    let id = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
    assert.entityCount('IndexingAgreementCanceled', 1)
    assert.fieldEquals('IndexingAgreementCanceled', id, 'indexer', indexer.toHexString())
    assert.fieldEquals('IndexingAgreementCanceled', id, 'payer', payer.toHexString())
    assert.fieldEquals('IndexingAgreementCanceled', id, 'agreementId', agreementId.toHexString())
    assert.fieldEquals(
      'IndexingAgreementCanceled',
      id,
      'canceledBy',
      canceledOnBehalfOf.toHexString(),
    )
  })
})
