import { assert, describe, test, clearStore, afterEach, newMockEvent } from 'matchstick-as'
import { Address, Bytes, BigInt, ethereum } from '@graphprotocol/graph-ts'
import { handleOfferStored, handleOfferCancelled } from '../src/recurringCollector'
import {
  OfferStored as OfferStoredEvent,
  OfferCancelled as OfferCancelledEvent,
} from '../generated/RecurringCollector/RecurringCollector'

const PAYER = Address.fromString('0x0000000000000000000000000000000000000002')
const CALLER = Address.fromString('0x0000000000000000000000000000000000000003')
const AGREEMENT_ID = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')

// OFFER_TYPE_NEW from IAgreementCollector.sol after the audit reshuffle
// (NONE=0, NEW=1, UPDATE=2). Tests construct events with the live value so
// the stored entity matches what production indexers would see.
const OFFER_TYPE_NEW: i32 = 1
const OFFER_TYPE_UPDATE: i32 = 2

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

function createOfferCancelledEvent(
  caller: Address,
  agreementId: Bytes,
  hash: Bytes,
): OfferCancelledEvent {
  let event = changetype<OfferCancelledEvent>(newMockEvent())

  event.parameters = new Array()
  event.parameters.push(new ethereum.EventParam('caller', ethereum.Value.fromAddress(caller)))
  event.parameters.push(
    new ethereum.EventParam('agreementId', ethereum.Value.fromFixedBytes(agreementId)),
  )
  event.parameters.push(new ethereum.EventParam('hash', ethereum.Value.fromFixedBytes(hash)))

  return event
}

describe('handleOfferStored', () => {
  afterEach(() => {
    clearStore()
  })

  test('first event creates Offer entity', () => {
    let offerHash = Bytes.fromHexString('0x' + 'aa'.repeat(32))
    let event = createOfferStoredEvent(AGREEMENT_ID, OFFER_TYPE_NEW, offerHash)
    handleOfferStored(event)

    assert.entityCount('Offer', 1)

    let id = AGREEMENT_ID.toHexString()
    assert.fieldEquals('Offer', id, 'payer', PAYER.toHexString())
    assert.fieldEquals('Offer', id, 'offerType', OFFER_TYPE_NEW.toString())
    assert.fieldEquals('Offer', id, 'offerHash', offerHash.toHexString())
    assert.fieldEquals('Offer', id, 'canceledAt', '0')
  })

  test('OFFER_TYPE_UPDATE overwrites offerType and offerHash; createdAt stays pinned', () => {
    let initialHash = Bytes.fromHexString('0x' + 'aa'.repeat(32))
    let updatedHash = Bytes.fromHexString('0x' + 'bb'.repeat(32))
    let id = AGREEMENT_ID.toHexString()

    let initial = createOfferStoredEvent(AGREEMENT_ID, OFFER_TYPE_NEW, initialHash)
    initial.block.number = BigInt.fromI32(100)
    initial.block.timestamp = BigInt.fromI32(1000)
    handleOfferStored(initial)
    assert.fieldEquals('Offer', id, 'offerType', OFFER_TYPE_NEW.toString())
    assert.fieldEquals('Offer', id, 'offerHash', initialHash.toHexString())
    assert.fieldEquals('Offer', id, 'createdAtBlock', '100')
    assert.fieldEquals('Offer', id, 'createdAtTimestamp', '1000')

    let update = createOfferStoredEvent(AGREEMENT_ID, OFFER_TYPE_UPDATE, updatedHash)
    update.block.number = BigInt.fromI32(200)
    update.block.timestamp = BigInt.fromI32(2000)
    handleOfferStored(update)

    assert.entityCount('Offer', 1)
    // Latest terms reflect the UPDATE event...
    assert.fieldEquals('Offer', id, 'offerType', OFFER_TYPE_UPDATE.toString())
    assert.fieldEquals('Offer', id, 'offerHash', updatedHash.toHexString())
    // ...but createdAt stays pinned to the initial OFFER_TYPE_NEW.
    assert.fieldEquals('Offer', id, 'createdAtBlock', '100')
    assert.fieldEquals('Offer', id, 'createdAtTimestamp', '1000')
  })

  test('OfferCancelled stamps canceledAt; OfferStored after that clears it', () => {
    let offerHash = Bytes.fromHexString('0x' + 'aa'.repeat(32))
    let id = AGREEMENT_ID.toHexString()

    handleOfferStored(createOfferStoredEvent(AGREEMENT_ID, OFFER_TYPE_NEW, offerHash))
    assert.fieldEquals('Offer', id, 'canceledAt', '0')

    let cancelEvent = createOfferCancelledEvent(CALLER, AGREEMENT_ID, offerHash)
    cancelEvent.block.timestamp = BigInt.fromI32(12345)
    handleOfferCancelled(cancelEvent)
    assert.fieldEquals('Offer', id, 'canceledAt', '12345')

    // A fresh OfferStored for the same agreement id should reset canceledAt
    // so the idempotency gate sees the entity as live again.
    handleOfferStored(createOfferStoredEvent(AGREEMENT_ID, OFFER_TYPE_NEW, offerHash))
    assert.fieldEquals('Offer', id, 'canceledAt', '0')
  })
})
