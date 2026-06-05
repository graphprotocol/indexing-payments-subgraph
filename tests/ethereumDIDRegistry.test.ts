import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
  newMockEvent,
  dataSourceMock,
} from 'matchstick-as'
import {
  Address,
  Bytes,
  ByteArray,
  BigInt,
  DataSourceContext,
  ethereum,
} from '@graphprotocol/graph-ts'
import { handleDIDAttributeChanged } from '../src/ethereumDIDRegistry'
import { handleAccountMetadata } from '../src/ipfs'
import { DIDAttributeChanged } from '../generated/EthereumDIDRegistry/EthereumDIDRegistry'

// keccak256("GRAPH NAME SERVICE")
const GRAPH_NAME_SERVICE = Bytes.fromHexString(
  '0x72abcb436eed911d1b6046bbe645c235ec3767c842eb1005a6da9326c2347e4c',
) as Bytes
const ACCOUNT = Address.fromString('0x0000000000000000000000000000000000000001')

function createDIDEvent(identity: Address, name: Bytes, value: Bytes): DIDAttributeChanged {
  let event = changetype<DIDAttributeChanged>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(new ethereum.EventParam('identity', ethereum.Value.fromAddress(identity)))
  event.parameters.push(new ethereum.EventParam('name', ethereum.Value.fromFixedBytes(name)))
  event.parameters.push(new ethereum.EventParam('value', ethereum.Value.fromBytes(value)))
  event.parameters.push(
    new ethereum.EventParam('validTo', ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))),
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

// Mirror the handler's CID construction so we can assert the exact metadata id.
function expectedBase58(value: Bytes): string {
  let out = new Uint8Array(34)
  out[0] = 0x12
  out[1] = 0x20
  for (let i = 0; i < 32; i++) {
    out[i + 2] = value[i]
  }
  return (changetype<Bytes>(changetype<ByteArray>(out)) as Bytes).toBase58()
}

describe('handleDIDAttributeChanged', () => {
  afterEach(() => {
    clearStore()
  })

  test('indexes account metadata for the GRAPH NAME SERVICE attribute', () => {
    let value = Bytes.fromHexString('0x' + 'ab'.repeat(32)) as Bytes
    let event = createDIDEvent(ACCOUNT, GRAPH_NAME_SERVICE, value)
    let txHash = Bytes.fromHexString('0x' + 'cd'.repeat(32)) as Bytes
    event.transaction.hash = txHash
    event.logIndex = BigInt.fromI32(7)
    handleDIDAttributeChanged(event)

    let metadataId =
      txHash.toHexString() + '-7-' + ACCOUNT.toHexString() + '-' + expectedBase58(value)
    assert.entityCount('Account', 1)
    assert.fieldEquals('Account', ACCOUNT.toHexString(), 'metadata', metadataId)
  })

  test('ignores DID attributes other than GRAPH NAME SERVICE', () => {
    let otherName = Bytes.fromHexString('0x' + '11'.repeat(32)) as Bytes
    let value = Bytes.fromHexString('0x' + 'ab'.repeat(32)) as Bytes
    handleDIDAttributeChanged(createDIDEvent(ACCOUNT, otherName, value))
    assert.entityCount('Account', 0)
  })

  test('skips a value that is not a 32-byte IPFS digest', () => {
    let value = Bytes.fromHexString('0xdeadbeef') as Bytes
    handleDIDAttributeChanged(createDIDEvent(ACCOUNT, GRAPH_NAME_SERVICE, value))
    assert.entityCount('Account', 0)
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
})
