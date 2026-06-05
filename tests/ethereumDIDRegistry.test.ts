import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
  newMockEvent,
  dataSourceMock,
} from 'matchstick-as'
import { Address, Bytes, BigInt, DataSourceContext, ethereum } from '@graphprotocol/graph-ts'
import { handleDIDAttributeChanged } from '../src/ethereumDIDRegistry'
import { handleAccountMetadata } from '../src/ipfs'
import { DIDAttributeChanged } from '../generated/EthereumDIDRegistry/EthereumDIDRegistry'

// keccak256("GRAPH NAME SERVICE")
const GRAPH_NAME_SERVICE = Bytes.fromHexString(
  '0x72abcb436eed911d1b6046bbe645c235ec3767c842eb1005a6da9326c2347e4c',
) as Bytes
const ACCOUNT = Address.fromString('0x0000000000000000000000000000000000000001')

// Block timestamp every test event is stamped with; validTo is compared against
// it to tell a live attribute (validTo in the future) from a revoked one.
const BLOCK_TIME = BigInt.fromI32(1000)
const FUTURE = BigInt.fromI32(2000)

// CIDv0 for a value of 0xab repeated 32 times: base58(0x1220 + 0xab*32).
// Hardcoded golden value so the assertion is independent of the handler's own
// CID construction rather than re-deriving it the same way.
const VALUE_AB = Bytes.fromHexString('0x' + 'ab'.repeat(32)) as Bytes
const VALUE_AB_CID = 'QmZtnFaddFtzGNT8BxdHVbQrhSFdq1pWxud5z4fA4kxfDt'

function createDIDEvent(
  identity: Address,
  name: Bytes,
  value: Bytes,
  validTo: BigInt,
): DIDAttributeChanged {
  let event = changetype<DIDAttributeChanged>(newMockEvent())
  event.block.timestamp = BLOCK_TIME
  event.parameters = new Array()
  event.parameters.push(new ethereum.EventParam('identity', ethereum.Value.fromAddress(identity)))
  event.parameters.push(new ethereum.EventParam('name', ethereum.Value.fromFixedBytes(name)))
  event.parameters.push(new ethereum.EventParam('value', ethereum.Value.fromBytes(value)))
  event.parameters.push(
    new ethereum.EventParam('validTo', ethereum.Value.fromUnsignedBigInt(validTo)),
  )
  event.parameters.push(
    new ethereum.EventParam('previousChange', ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))),
  )
  return event
}

function mockMetadataContext(id: string): void {
  let context = new DataSourceContext()
  context.setString('id', id)
  dataSourceMock.setContext(context)
}

describe('handleDIDAttributeChanged', () => {
  afterEach(() => {
    clearStore()
  })

  test('indexes account metadata for the GRAPH NAME SERVICE attribute', () => {
    let event = createDIDEvent(ACCOUNT, GRAPH_NAME_SERVICE, VALUE_AB, FUTURE)
    let txHash = Bytes.fromHexString('0x' + 'cd'.repeat(32)) as Bytes
    event.transaction.hash = txHash
    event.logIndex = BigInt.fromI32(7)
    handleDIDAttributeChanged(event)

    let metadataId = txHash.toHexString() + '-7-' + ACCOUNT.toHexString() + '-' + VALUE_AB_CID
    assert.entityCount('Account', 1)
    assert.fieldEquals('Account', ACCOUNT.toHexString(), 'metadata', metadataId)
  })

  test('ignores DID attributes other than GRAPH NAME SERVICE', () => {
    let otherName = Bytes.fromHexString('0x' + '11'.repeat(32)) as Bytes
    handleDIDAttributeChanged(createDIDEvent(ACCOUNT, otherName, VALUE_AB, FUTURE))
    assert.entityCount('Account', 0)
  })

  test('skips a value that is not a 32-byte IPFS digest', () => {
    let value = Bytes.fromHexString('0xdeadbeef') as Bytes
    handleDIDAttributeChanged(createDIDEvent(ACCOUNT, GRAPH_NAME_SERVICE, value, FUTURE))
    assert.entityCount('Account', 0)
  })

  test('clears the metadata pointer when the attribute is revoked', () => {
    // First set the metadata (validTo in the future), then revoke it (validTo at
    // the block time) and assert the pointer is cleared.
    handleDIDAttributeChanged(createDIDEvent(ACCOUNT, GRAPH_NAME_SERVICE, VALUE_AB, FUTURE))
    assert.entityCount('Account', 1)

    handleDIDAttributeChanged(createDIDEvent(ACCOUNT, GRAPH_NAME_SERVICE, VALUE_AB, BLOCK_TIME))
    assert.entityCount('Account', 1)
    assert.fieldEquals('Account', ACCOUNT.toHexString(), 'metadata', 'null')
  })
})

describe('handleAccountMetadata', () => {
  afterEach(() => {
    clearStore()
    dataSourceMock.resetValues()
  })

  test('parses the IPFS document into an AccountMetadata record', () => {
    mockMetadataContext('meta-1')
    let body =
      '{"image":"https://img.example/avatar.png","displayName":"Alice","description":"an indexer","isOrganization":true}'
    handleAccountMetadata(Bytes.fromUTF8(body))

    assert.entityCount('AccountMetadata', 1)
    assert.fieldEquals('AccountMetadata', 'meta-1', 'image', 'https://img.example/avatar.png')
    assert.fieldEquals('AccountMetadata', 'meta-1', 'displayName', 'Alice')
    assert.fieldEquals('AccountMetadata', 'meta-1', 'description', 'an indexer')
    assert.fieldEquals('AccountMetadata', 'meta-1', 'isOrganization', 'true')
  })

  test('creates no record when the IPFS content is not valid json', () => {
    mockMetadataContext('meta-bad')
    handleAccountMetadata(Bytes.fromUTF8('{ not valid json'))
    assert.entityCount('AccountMetadata', 0)
  })

  test('leaves string fields null when the document has no recognised fields', () => {
    mockMetadataContext('meta-empty')
    handleAccountMetadata(Bytes.fromUTF8('{}'))

    // Absent string fields resolve to the empty string, which graph-ts treats as
    // falsy and unsets, so the stored value is null rather than "". isOrganization
    // is only written for a real boolean, so it is left unset entirely here.
    assert.entityCount('AccountMetadata', 1)
    assert.fieldEquals('AccountMetadata', 'meta-empty', 'image', 'null')
    assert.fieldEquals('AccountMetadata', 'meta-empty', 'displayName', 'null')
    assert.fieldEquals('AccountMetadata', 'meta-empty', 'description', 'null')
    assert.fieldEquals('AccountMetadata', 'meta-empty', 'website', 'null')
    assert.fieldEquals('AccountMetadata', 'meta-empty', 'codeRepository', 'null')
  })

  test('records isOrganization false rather than treating it as absent', () => {
    mockMetadataContext('meta-org-false')
    handleAccountMetadata(Bytes.fromUTF8('{"isOrganization":false}'))

    assert.entityCount('AccountMetadata', 1)
    assert.fieldEquals('AccountMetadata', 'meta-org-false', 'isOrganization', 'false')
  })
})
