import { assert, describe, test, clearStore, afterEach } from 'matchstick-as'
import { Address, Bytes, BigInt, ethereum } from '@graphprotocol/graph-ts'
import {
  handleIndexingAgreementAccepted,
  handleIndexingAgreementCanceled,
  handleIndexingFeesCollectedV1,
} from '../src/mapping'
import {
  IndexingAgreementAccepted as AcceptedEvent,
  IndexingAgreementCanceled as CanceledEvent,
  IndexingFeesCollectedV1 as FeesCollectedEvent,
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

function createFeesCollectedEvent(
  indexer: Address,
  payer: Address,
  agreementId: Bytes,
  allocationId: Address,
  subgraphDeploymentId: Bytes,
  currentEpoch: BigInt,
  tokensCollected: BigInt,
  entities: BigInt,
  poi: Bytes,
  poiBlockNumber: BigInt,
  metadata: Bytes,
): FeesCollectedEvent {
  let event = changetype<FeesCollectedEvent>(newMockEvent())

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
  event.parameters.push(
    new ethereum.EventParam('currentEpoch', ethereum.Value.fromUnsignedBigInt(currentEpoch)),
  )
  event.parameters.push(
    new ethereum.EventParam('tokensCollected', ethereum.Value.fromUnsignedBigInt(tokensCollected)),
  )
  event.parameters.push(
    new ethereum.EventParam('entities', ethereum.Value.fromUnsignedBigInt(entities)),
  )
  event.parameters.push(new ethereum.EventParam('poi', ethereum.Value.fromFixedBytes(poi)))
  event.parameters.push(
    new ethereum.EventParam('poiBlockNumber', ethereum.Value.fromUnsignedBigInt(poiBlockNumber)),
  )
  event.parameters.push(new ethereum.EventParam('metadata', ethereum.Value.fromBytes(metadata)))

  return event
}

describe('IndexingFeesCollectedV1', () => {
  afterEach(() => {
    clearStore()
  })

  test('creates immutable entity and mutable IndexerDeploymentLatest', () => {
    let indexer = Address.fromString('0x0000000000000000000000000000000000000001')
    let payer = Address.fromString('0x0000000000000000000000000000000000000002')
    let agreementId = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')
    let allocationId = Address.fromString('0x0000000000000000000000000000000000000003')
    let subgraphDeploymentId = Bytes.fromHexString('0x' + 'ab'.repeat(32))
    let currentEpoch = BigInt.fromI32(42)
    let tokensCollected = BigInt.fromI32(1000000)
    let entities = BigInt.fromI32(5000)
    let poi = Bytes.fromHexString('0x' + 'cc'.repeat(32))
    let poiBlockNumber = BigInt.fromI32(12345)
    let metadata = Bytes.fromHexString('0xdeadbeef')

    let event = createFeesCollectedEvent(
      indexer,
      payer,
      agreementId,
      allocationId,
      subgraphDeploymentId,
      currentEpoch,
      tokensCollected,
      entities,
      poi,
      poiBlockNumber,
      metadata,
    )
    handleIndexingFeesCollectedV1(event)

    // Immutable entity created
    let immutableId = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
    assert.entityCount('IndexingFeesCollected', 1)
    assert.fieldEquals('IndexingFeesCollected', immutableId, 'entities', '5000')
    assert.fieldEquals('IndexingFeesCollected', immutableId, 'tokensCollected', '1000000')
    assert.fieldEquals('IndexingFeesCollected', immutableId, 'indexer', indexer.toHexString())

    // Mutable entity created
    let compositeId = indexer.toHexString() + '-' + subgraphDeploymentId.toHexString()
    assert.entityCount('IndexerDeploymentLatest', 1)
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'entities', '5000')
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'tokensCollected', '1000000')
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'indexer', indexer.toHexString())
  })

  test('second collection updates mutable entity', () => {
    let indexer = Address.fromString('0x0000000000000000000000000000000000000001')
    let payer = Address.fromString('0x0000000000000000000000000000000000000002')
    let agreementId = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')
    let allocationId = Address.fromString('0x0000000000000000000000000000000000000003')
    let subgraphDeploymentId = Bytes.fromHexString('0x' + 'ab'.repeat(32))
    let poi = Bytes.fromHexString('0x' + 'cc'.repeat(32))
    let metadata = Bytes.fromHexString('0xdeadbeef')

    // First collection: 5000 entities
    let event1 = createFeesCollectedEvent(
      indexer,
      payer,
      agreementId,
      allocationId,
      subgraphDeploymentId,
      BigInt.fromI32(42),
      BigInt.fromI32(1000000),
      BigInt.fromI32(5000),
      poi,
      BigInt.fromI32(12345),
      metadata,
    )
    handleIndexingFeesCollectedV1(event1)

    // Second collection: 8000 entities (subgraph grew)
    let event2 = createFeesCollectedEvent(
      indexer,
      payer,
      agreementId,
      allocationId,
      subgraphDeploymentId,
      BigInt.fromI32(43),
      BigInt.fromI32(2000000),
      BigInt.fromI32(8000),
      poi,
      BigInt.fromI32(12400),
      metadata,
    )
    event2.transaction.hash = Bytes.fromHexString(
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    ) as Bytes
    handleIndexingFeesCollectedV1(event2)

    // Two immutable entities
    assert.entityCount('IndexingFeesCollected', 2)

    // One mutable entity, updated to latest values
    let compositeId = indexer.toHexString() + '-' + subgraphDeploymentId.toHexString()
    assert.entityCount('IndexerDeploymentLatest', 1)
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'entities', '8000')
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'tokensCollected', '2000000')
  })
})
