import { assert, describe, test, clearStore, afterEach, newMockEvent } from 'matchstick-as'
import { Address, Bytes, BigInt, ethereum } from '@graphprotocol/graph-ts'
import { handleOfferStored } from '../src/recurringCollector'
import { OfferStored as OfferStoredEvent } from '../generated/RecurringCollector/RecurringCollector'

const PAYER = Address.fromString('0x0000000000000000000000000000000000000002')
const AGREEMENT_ID = Bytes.fromHexString('0x0102030405060708090a0b0c0d0e0f10')

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

describe('handleOfferStored', () => {
  afterEach(() => {
    clearStore()
  })

  test('first event creates Offer entity', () => {
    let offerHash = Bytes.fromHexString('0x' + 'aa'.repeat(32))
    let event = createOfferStoredEvent(AGREEMENT_ID, 0, offerHash)
    handleOfferStored(event)

    assert.entityCount('Offer', 1)

    let id = AGREEMENT_ID.toHexString()
    assert.fieldEquals('Offer', id, 'payer', PAYER.toHexString())
    assert.fieldEquals('Offer', id, 'offerType', '0')
    assert.fieldEquals('Offer', id, 'offerHash', offerHash.toHexString())
  })

  test('duplicate event for same agreementId is a no-op (idempotency guard)', () => {
    let offerHash = Bytes.fromHexString('0x' + 'aa'.repeat(32))

    let event1 = createOfferStoredEvent(AGREEMENT_ID, 0, offerHash)
    handleOfferStored(event1)

    // Second event for same agreementId must not halt on immutable re-write.
    let event2 = createOfferStoredEvent(AGREEMENT_ID, 0, offerHash)
    event2.transaction.hash = Bytes.fromHexString(
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    ) as Bytes
    handleOfferStored(event2)

    assert.entityCount('Offer', 1)
  })
})
