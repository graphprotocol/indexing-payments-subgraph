import { assert, describe, test, clearStore, afterEach, newMockEvent } from 'matchstick-as'
import { Address, Bytes, BigInt, ethereum } from '@graphprotocol/graph-ts'
import {
  handleAgreementAccepted,
  handleAgreementCanceled,
  handleAgreementUpdated,
  handleRCACollected,
  handleOfferStored,
} from '../src/recurringCollector'
import {
  AgreementAccepted as AcceptedEvent,
  AgreementCanceled as CanceledEvent,
  AgreementUpdated as UpdatedEvent,
  RCACollected as RCACollectedEvent,
  OfferStored as OfferStoredEvent,
} from '../generated/RecurringCollector/RecurringCollector'

const DATA_SERVICE = Address.fromString('0x000000000000000000000000000000000000000a')
const PAYER = Address.fromString('0x0000000000000000000000000000000000000002')
const SERVICE_PROVIDER = Address.fromString('0x0000000000000000000000000000000000000001')
const AGREEMENT_ID = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')

function createAcceptedEvent(
  agreementId: Bytes,
  acceptedAt: BigInt,
  endsAt: BigInt,
  maxInitialTokens: BigInt,
  maxOngoingTokensPerSecond: BigInt,
  minSecondsPerCollection: i32,
  maxSecondsPerCollection: i32,
): AcceptedEvent {
  let event = changetype<AcceptedEvent>(newMockEvent())

  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam('dataService', ethereum.Value.fromAddress(DATA_SERVICE)),
  )
  event.parameters.push(new ethereum.EventParam('payer', ethereum.Value.fromAddress(PAYER)))
  event.parameters.push(
    new ethereum.EventParam('serviceProvider', ethereum.Value.fromAddress(SERVICE_PROVIDER)),
  )
  event.parameters.push(
    new ethereum.EventParam('agreementId', ethereum.Value.fromFixedBytes(agreementId)),
  )
  event.parameters.push(
    new ethereum.EventParam('acceptedAt', ethereum.Value.fromUnsignedBigInt(acceptedAt)),
  )
  event.parameters.push(
    new ethereum.EventParam('endsAt', ethereum.Value.fromUnsignedBigInt(endsAt)),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'maxInitialTokens',
      ethereum.Value.fromUnsignedBigInt(maxInitialTokens),
    ),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'maxOngoingTokensPerSecond',
      ethereum.Value.fromUnsignedBigInt(maxOngoingTokensPerSecond),
    ),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'minSecondsPerCollection',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(minSecondsPerCollection)),
    ),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'maxSecondsPerCollection',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(maxSecondsPerCollection)),
    ),
  )

  return event
}

function createCanceledEvent(
  agreementId: Bytes,
  canceledAt: BigInt,
  canceledBy: i32,
): CanceledEvent {
  let event = changetype<CanceledEvent>(newMockEvent())

  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam('dataService', ethereum.Value.fromAddress(DATA_SERVICE)),
  )
  event.parameters.push(new ethereum.EventParam('payer', ethereum.Value.fromAddress(PAYER)))
  event.parameters.push(
    new ethereum.EventParam('serviceProvider', ethereum.Value.fromAddress(SERVICE_PROVIDER)),
  )
  event.parameters.push(
    new ethereum.EventParam('agreementId', ethereum.Value.fromFixedBytes(agreementId)),
  )
  event.parameters.push(
    new ethereum.EventParam('canceledAt', ethereum.Value.fromUnsignedBigInt(canceledAt)),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'canceledBy',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(canceledBy)),
    ),
  )

  return event
}

function createUpdatedEvent(
  agreementId: Bytes,
  updatedAt: BigInt,
  endsAt: BigInt,
  maxInitialTokens: BigInt,
  maxOngoingTokensPerSecond: BigInt,
  minSecondsPerCollection: i32,
  maxSecondsPerCollection: i32,
): UpdatedEvent {
  let event = changetype<UpdatedEvent>(newMockEvent())

  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam('dataService', ethereum.Value.fromAddress(DATA_SERVICE)),
  )
  event.parameters.push(new ethereum.EventParam('payer', ethereum.Value.fromAddress(PAYER)))
  event.parameters.push(
    new ethereum.EventParam('serviceProvider', ethereum.Value.fromAddress(SERVICE_PROVIDER)),
  )
  event.parameters.push(
    new ethereum.EventParam('agreementId', ethereum.Value.fromFixedBytes(agreementId)),
  )
  event.parameters.push(
    new ethereum.EventParam('updatedAt', ethereum.Value.fromUnsignedBigInt(updatedAt)),
  )
  event.parameters.push(
    new ethereum.EventParam('endsAt', ethereum.Value.fromUnsignedBigInt(endsAt)),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'maxInitialTokens',
      ethereum.Value.fromUnsignedBigInt(maxInitialTokens),
    ),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'maxOngoingTokensPerSecond',
      ethereum.Value.fromUnsignedBigInt(maxOngoingTokensPerSecond),
    ),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'minSecondsPerCollection',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(minSecondsPerCollection)),
    ),
  )
  event.parameters.push(
    new ethereum.EventParam(
      'maxSecondsPerCollection',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(maxSecondsPerCollection)),
    ),
  )

  return event
}

function createRCACollectedEvent(
  agreementId: Bytes,
  collectionId: Bytes,
  tokens: BigInt,
  blockTimestamp: BigInt,
): RCACollectedEvent {
  let event = changetype<RCACollectedEvent>(newMockEvent())

  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam('dataService', ethereum.Value.fromAddress(DATA_SERVICE)),
  )
  event.parameters.push(new ethereum.EventParam('payer', ethereum.Value.fromAddress(PAYER)))
  event.parameters.push(
    new ethereum.EventParam('serviceProvider', ethereum.Value.fromAddress(SERVICE_PROVIDER)),
  )
  event.parameters.push(
    new ethereum.EventParam('agreementId', ethereum.Value.fromFixedBytes(agreementId)),
  )
  event.parameters.push(
    new ethereum.EventParam('collectionId', ethereum.Value.fromFixedBytes(collectionId)),
  )
  event.parameters.push(
    new ethereum.EventParam('tokens', ethereum.Value.fromUnsignedBigInt(tokens)),
  )
  event.parameters.push(
    new ethereum.EventParam('dataServiceCut', ethereum.Value.fromUnsignedBigInt(BigInt.zero())),
  )

  event.block.timestamp = blockTimestamp

  return event
}

function createOfferStoredEvent(
  agreementId: Bytes,
  offerType: i32,
  offerHash: Bytes,
): OfferStoredEvent {
  let event = changetype<OfferStoredEvent>(newMockEvent())

  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam('agreementId', ethereum.Value.fromFixedBytes(agreementId)),
  )
  event.parameters.push(new ethereum.EventParam('payer', ethereum.Value.fromAddress(PAYER)))
  event.parameters.push(
    new ethereum.EventParam(
      'offerType',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(offerType)),
    ),
  )
  event.parameters.push(
    new ethereum.EventParam('offerHash', ethereum.Value.fromFixedBytes(offerHash)),
  )

  return event
}

describe('handleAgreementAccepted', () => {
  afterEach(() => {
    clearStore()
  })

  test('creates IndexingAgreement with Accepted state and all RC-specific fields', () => {
    let event = createAcceptedEvent(
      AGREEMENT_ID,
      BigInt.fromI32(1000),
      BigInt.fromI32(2000),
      BigInt.fromI32(500),
      BigInt.fromI32(10),
      60,
      3600,
    )
    handleAgreementAccepted(event)

    let id = AGREEMENT_ID.toHexString()
    assert.entityCount('IndexingAgreement', 1)
    assert.fieldEquals('IndexingAgreement', id, 'payer', PAYER.toHexString())
    assert.fieldEquals('IndexingAgreement', id, 'indexer', SERVICE_PROVIDER.toHexString())
    assert.fieldEquals('IndexingAgreement', id, 'state', 'Accepted')
    assert.fieldEquals('IndexingAgreement', id, 'acceptedAt', '1000')
    assert.fieldEquals('IndexingAgreement', id, 'lastCollectionAt', '1000')
    assert.fieldEquals('IndexingAgreement', id, 'endsAt', '2000')
    assert.fieldEquals('IndexingAgreement', id, 'maxInitialTokens', '500')
    assert.fieldEquals('IndexingAgreement', id, 'maxOngoingTokensPerSecond', '10')
    assert.fieldEquals('IndexingAgreement', id, 'minSecondsPerCollection', '60')
    assert.fieldEquals('IndexingAgreement', id, 'maxSecondsPerCollection', '3600')
    assert.fieldEquals('IndexingAgreement', id, 'canceledAt', '0')
    assert.fieldEquals('IndexingAgreement', id, 'tokensCollected', '0')
  })
})

describe('handleAgreementCanceled', () => {
  afterEach(() => {
    clearStore()
  })

  test('early returns when agreement does not exist', () => {
    let event = createCanceledEvent(AGREEMENT_ID, BigInt.fromI32(1500), 0)
    handleAgreementCanceled(event)

    assert.entityCount('IndexingAgreement', 0)
  })

  test('canceledBy=0 sets state to CanceledByServiceProvider', () => {
    handleAgreementAccepted(
      createAcceptedEvent(
        AGREEMENT_ID,
        BigInt.fromI32(1000),
        BigInt.fromI32(2000),
        BigInt.fromI32(500),
        BigInt.fromI32(10),
        60,
        3600,
      ),
    )

    handleAgreementCanceled(createCanceledEvent(AGREEMENT_ID, BigInt.fromI32(1500), 0))

    let id = AGREEMENT_ID.toHexString()
    assert.fieldEquals('IndexingAgreement', id, 'state', 'CanceledByServiceProvider')
    assert.fieldEquals('IndexingAgreement', id, 'canceledAt', '1500')
  })

  test('canceledBy=1 sets state to CanceledByPayer', () => {
    handleAgreementAccepted(
      createAcceptedEvent(
        AGREEMENT_ID,
        BigInt.fromI32(1000),
        BigInt.fromI32(2000),
        BigInt.fromI32(500),
        BigInt.fromI32(10),
        60,
        3600,
      ),
    )

    handleAgreementCanceled(createCanceledEvent(AGREEMENT_ID, BigInt.fromI32(1500), 1))

    let id = AGREEMENT_ID.toHexString()
    assert.fieldEquals('IndexingAgreement', id, 'state', 'CanceledByPayer')
    assert.fieldEquals('IndexingAgreement', id, 'canceledAt', '1500')
  })
})

describe('handleAgreementUpdated', () => {
  afterEach(() => {
    clearStore()
  })

  test('early returns when agreement does not exist', () => {
    let event = createUpdatedEvent(
      AGREEMENT_ID,
      BigInt.fromI32(1500),
      BigInt.fromI32(3000),
      BigInt.fromI32(800),
      BigInt.fromI32(20),
      120,
      7200,
    )
    handleAgreementUpdated(event)

    assert.entityCount('IndexingAgreement', 0)
  })

  test('updates lastUpdatedAt, endsAt, and terms on existing agreement', () => {
    handleAgreementAccepted(
      createAcceptedEvent(
        AGREEMENT_ID,
        BigInt.fromI32(1000),
        BigInt.fromI32(2000),
        BigInt.fromI32(500),
        BigInt.fromI32(10),
        60,
        3600,
      ),
    )

    handleAgreementUpdated(
      createUpdatedEvent(
        AGREEMENT_ID,
        BigInt.fromI32(1500),
        BigInt.fromI32(3000),
        BigInt.fromI32(800),
        BigInt.fromI32(20),
        120,
        7200,
      ),
    )

    let id = AGREEMENT_ID.toHexString()
    assert.fieldEquals('IndexingAgreement', id, 'lastUpdatedAt', '1500')
    assert.fieldEquals('IndexingAgreement', id, 'endsAt', '3000')
    assert.fieldEquals('IndexingAgreement', id, 'maxInitialTokens', '800')
    assert.fieldEquals('IndexingAgreement', id, 'maxOngoingTokensPerSecond', '20')
    assert.fieldEquals('IndexingAgreement', id, 'minSecondsPerCollection', '120')
    assert.fieldEquals('IndexingAgreement', id, 'maxSecondsPerCollection', '7200')
  })
})

describe('handleRCACollected', () => {
  afterEach(() => {
    clearStore()
  })

  test('early returns when agreement does not exist', () => {
    let collectionId = Bytes.fromHexString('0x' + 'dd'.repeat(32))
    let event = createRCACollectedEvent(
      AGREEMENT_ID,
      collectionId,
      BigInt.fromI32(100),
      BigInt.fromI32(1100),
    )
    handleRCACollected(event)

    assert.entityCount('IndexingAgreement', 0)
  })

  test('accumulates tokensCollected and updates lastCollectionAt', () => {
    handleAgreementAccepted(
      createAcceptedEvent(
        AGREEMENT_ID,
        BigInt.fromI32(1000),
        BigInt.fromI32(2000),
        BigInt.fromI32(500),
        BigInt.fromI32(10),
        60,
        3600,
      ),
    )

    let collectionId = Bytes.fromHexString('0x' + 'dd'.repeat(32))

    handleRCACollected(
      createRCACollectedEvent(
        AGREEMENT_ID,
        collectionId,
        BigInt.fromI32(100),
        BigInt.fromI32(1100),
      ),
    )
    handleRCACollected(
      createRCACollectedEvent(
        AGREEMENT_ID,
        collectionId,
        BigInt.fromI32(250),
        BigInt.fromI32(1200),
      ),
    )

    let id = AGREEMENT_ID.toHexString()
    assert.fieldEquals('IndexingAgreement', id, 'tokensCollected', '350')
    assert.fieldEquals('IndexingAgreement', id, 'lastCollectionAt', '1200')
  })
})

describe('handleOfferStored', () => {
  afterEach(() => {
    clearStore()
  })

  test('first event creates OfferStored log and Offer entity', () => {
    let offerHash = Bytes.fromHexString('0x' + 'aa'.repeat(32))
    let event = createOfferStoredEvent(AGREEMENT_ID, 0, offerHash)
    handleOfferStored(event)

    assert.entityCount('OfferStored', 1)
    assert.entityCount('Offer', 1)

    let id = AGREEMENT_ID.toHexString()
    assert.fieldEquals('Offer', id, 'payer', PAYER.toHexString())
    assert.fieldEquals('Offer', id, 'offerType', '0')
    assert.fieldEquals('Offer', id, 'offerHash', offerHash.toHexString())
  })

  test('duplicate event appends log but Offer count stays at 1 (idempotency guard)', () => {
    let offerHash = Bytes.fromHexString('0x' + 'aa'.repeat(32))

    // First event
    let event1 = createOfferStoredEvent(AGREEMENT_ID, 0, offerHash)
    handleOfferStored(event1)

    // Second event for same agreementId — must not halt on immutable re-write.
    // Must differ in txHash or logIndex so the OfferStored log id differs.
    let event2 = createOfferStoredEvent(AGREEMENT_ID, 0, offerHash)
    event2.transaction.hash = Bytes.fromHexString(
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    ) as Bytes
    handleOfferStored(event2)

    assert.entityCount('OfferStored', 2)
    assert.entityCount('Offer', 1)
  })
})
