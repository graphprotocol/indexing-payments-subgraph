import { assert, describe, test, clearStore, afterEach } from 'matchstick-as'
import { Address, Bytes, BigInt, ethereum } from '@graphprotocol/graph-ts'
import {
  handleIndexingAgreementAccepted,
  handleIndexingAgreementCanceled,
  handleIndexingAgreementUpdated,
  handleIndexingFeesCollectedV1,
} from '../src/subgraphService'
import {
  IndexingAgreementAccepted as AcceptedEvent,
  IndexingAgreementCanceled as CanceledEvent,
  IndexingAgreementUpdated as UpdatedEvent,
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
    new ethereum.EventParam(
      'canceledOnBehalfOf',
      ethereum.Value.fromAddress(canceledOnBehalfOf),
    ),
  )

  return event
}

function createUpdatedEvent(
  indexer: Address,
  payer: Address,
  agreementId: Bytes,
  allocationId: Address,
  version: i32,
  versionTerms: Bytes,
): UpdatedEvent {
  let event = changetype<UpdatedEvent>(newMockEvent())

  event.parameters = new Array()
  event.parameters.push(new ethereum.EventParam('indexer', ethereum.Value.fromAddress(indexer)))
  event.parameters.push(new ethereum.EventParam('payer', ethereum.Value.fromAddress(payer)))
  event.parameters.push(
    new ethereum.EventParam('agreementId', ethereum.Value.fromFixedBytes(agreementId)),
  )
  event.parameters.push(
    new ethereum.EventParam('allocationId', ethereum.Value.fromAddress(allocationId)),
  )
  event.parameters.push(new ethereum.EventParam('version', ethereum.Value.fromI32(version)))
  event.parameters.push(
    new ethereum.EventParam('versionTerms', ethereum.Value.fromBytes(versionTerms)),
  )

  return event
}

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

// Encode IndexingAgreementTermsV1: (uint256 tokensPerSecond, uint256 tokensPerEntityPerSecond)
function encodeVersionTerms(tokensPerSecond: BigInt, tokensPerEntityPerSecond: BigInt): Bytes {
  let tuple = new ethereum.Tuple()
  tuple.push(ethereum.Value.fromUnsignedBigInt(tokensPerSecond))
  tuple.push(ethereum.Value.fromUnsignedBigInt(tokensPerEntityPerSecond))
  return ethereum.encode(ethereum.Value.fromTuple(tuple))!
}

describe('handleIndexingAgreementAccepted', () => {
  afterEach(() => {
    clearStore()
  })

  test('creates IndexingAgreement with SS-specific fields', () => {
    let indexer = Address.fromString('0x0000000000000000000000000000000000000001')
    let payer = Address.fromString('0x0000000000000000000000000000000000000002')
    let agreementId = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')
    let allocationId = Address.fromString('0x0000000000000000000000000000000000000003')
    let subgraphDeploymentId = Bytes.fromHexString('0x' + 'ab'.repeat(32))
    let tokensPerSecond = BigInt.fromI32(1000)
    let tokensPerEntityPerSecond = BigInt.fromI32(50)
    let versionTerms = encodeVersionTerms(tokensPerSecond, tokensPerEntityPerSecond)

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

    assert.entityCount('IndexingAgreement', 1)
    assert.fieldEquals(
      'IndexingAgreement',
      agreementId.toHexString(),
      'allocationId',
      allocationId.toHexString(),
    )
    assert.fieldEquals(
      'IndexingAgreement',
      agreementId.toHexString(),
      'subgraphDeploymentId',
      subgraphDeploymentId.toHexString(),
    )
    assert.fieldEquals('IndexingAgreement', agreementId.toHexString(), 'tokensPerSecond', '1000')
    assert.fieldEquals(
      'IndexingAgreement',
      agreementId.toHexString(),
      'tokensPerEntityPerSecond',
      '50',
    )
    // State remains NotAccepted until RC handler fires
    assert.fieldEquals('IndexingAgreement', agreementId.toHexString(), 'state', 'NotAccepted')

    // Immutable transition log emitted for event-sourcing consumers
    assert.entityCount('IndexingAgreementAccepted', 1)
  })
})

describe('handleIndexingAgreementCanceled', () => {
  afterEach(() => {
    clearStore()
  })

  test('emits immutable IndexingAgreementCanceled log with canceledBy address', () => {
    let indexer = Address.fromString('0x0000000000000000000000000000000000000001')
    let payer = Address.fromString('0x0000000000000000000000000000000000000002')
    let agreementId = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')
    let canceledOnBehalfOf = Address.fromString('0x0000000000000000000000000000000000000004')

    let event = createCanceledEvent(indexer, payer, agreementId, canceledOnBehalfOf)
    handleIndexingAgreementCanceled(event)

    assert.entityCount('IndexingAgreementCanceled', 1)
    // Aggregated entity state is owned by the RC handler — SS handler must not create one
    assert.entityCount('IndexingAgreement', 0)
  })
})

describe('handleIndexingAgreementUpdated', () => {
  afterEach(() => {
    clearStore()
  })

  test('updates allocation and terms on existing agreement', () => {
    let indexer = Address.fromString('0x0000000000000000000000000000000000000001')
    let payer = Address.fromString('0x0000000000000000000000000000000000000002')
    let agreementId = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')
    let allocationId = Address.fromString('0x0000000000000000000000000000000000000003')
    let subgraphDeploymentId = Bytes.fromHexString('0x' + 'ab'.repeat(32))
    let versionTerms = encodeVersionTerms(BigInt.fromI32(1000), BigInt.fromI32(50))

    // First: accept the agreement
    let acceptEvent = createAcceptedEvent(
      indexer,
      payer,
      agreementId,
      allocationId,
      subgraphDeploymentId,
      1,
      versionTerms,
    )
    handleIndexingAgreementAccepted(acceptEvent)

    // Then: update with new allocation and terms
    let newAllocationId = Address.fromString('0x0000000000000000000000000000000000000009')
    let newVersionTerms = encodeVersionTerms(BigInt.fromI32(2000), BigInt.fromI32(100))
    let updateEvent = createUpdatedEvent(
      indexer,
      payer,
      agreementId,
      newAllocationId,
      1,
      newVersionTerms,
    )
    handleIndexingAgreementUpdated(updateEvent)

    assert.entityCount('IndexingAgreement', 1)
    assert.fieldEquals(
      'IndexingAgreement',
      agreementId.toHexString(),
      'allocationId',
      newAllocationId.toHexString(),
    )
    assert.fieldEquals('IndexingAgreement', agreementId.toHexString(), 'tokensPerSecond', '2000')
    assert.fieldEquals(
      'IndexingAgreement',
      agreementId.toHexString(),
      'tokensPerEntityPerSecond',
      '100',
    )

    // One log per event: the accept and the update each emit their own immutable log
    assert.entityCount('IndexingAgreementAccepted', 1)
    assert.entityCount('IndexingAgreementUpdated', 1)
  })
})

describe('handleIndexingFeesCollectedV1', () => {
  afterEach(() => {
    clearStore()
  })

  test('creates IndexerDeploymentLatest', () => {
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

    let compositeId = indexer.toHexString() + '-' + subgraphDeploymentId.toHexString()
    assert.entityCount('IndexerDeploymentLatest', 1)
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'entities', '5000')
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'tokensCollected', '1000000')
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'indexer', indexer.toHexString())
  })

  test('second collection updates IndexerDeploymentLatest', () => {
    let indexer = Address.fromString('0x0000000000000000000000000000000000000001')
    let payer = Address.fromString('0x0000000000000000000000000000000000000002')
    let agreementId = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')
    let allocationId = Address.fromString('0x0000000000000000000000000000000000000003')
    let subgraphDeploymentId = Bytes.fromHexString('0x' + 'ab'.repeat(32))
    let poi = Bytes.fromHexString('0x' + 'cc'.repeat(32))
    let metadata = Bytes.fromHexString('0xdeadbeef')

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

    let compositeId = indexer.toHexString() + '-' + subgraphDeploymentId.toHexString()
    assert.entityCount('IndexerDeploymentLatest', 1)
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'entities', '8000')
    assert.fieldEquals('IndexerDeploymentLatest', compositeId, 'tokensCollected', '2000000')
  })
})
