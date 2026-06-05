import { Bytes, ByteArray, DataSourceContext } from '@graphprotocol/graph-ts'
import { DIDAttributeChanged } from '../generated/EthereumDIDRegistry/EthereumDIDRegistry'
import { AccountMetadataFile } from '../generated/templates'
import { Account } from '../generated/schema'

// keccak256("GRAPH NAME SERVICE") — the only DID attribute we care about; its
// value holds the IPFS hash of the account's metadata document.
const GRAPH_NAME_SERVICE = '0x72abcb436eed911d1b6046bbe645c235ec3767c842eb1005a6da9326c2347e4c'

export function handleDIDAttributeChanged(event: DIDAttributeChanged): void {
  if (event.params.name.toHexString() != GRAPH_NAME_SERVICE) return
  // value carries the 32-byte IPFS digest but is declared as dynamic bytes, so a
  // direct call could pass any length. Guard before decoding to avoid reading
  // past the buffer (the network subgraph has a standing TODO for this).
  if (event.params.value.length != 32) return

  let account = Account.load(event.params.identity)
  if (account == null) {
    account = new Account(event.params.identity)
  }

  let base58Hash = changetype<Bytes>(addQm(event.params.value)).toBase58()
  let metadataId = event.transaction.hash
    .toHexString()
    .concat('-')
    .concat(event.logIndex.toString())
    .concat('-')
    .concat(account.id.toHexString())
    .concat('-')
    .concat(base58Hash)

  // Re-registration overwrites the pointer, so this is last-write-wins.
  account.metadata = metadataId
  account.save()

  let context = new DataSourceContext()
  context.setString('id', metadataId)
  AccountMetadataFile.createWithContext(base58Hash, context)
}

// Prefix the 32-byte IPFS digest with the multihash header (0x12 = sha2-256,
// 0x20 = 32-byte length) so it base58-encodes to a CIDv0 "Qm…" hash.
function addQm(a: Bytes): ByteArray {
  let out = new Uint8Array(34)
  out[0] = 0x12
  out[1] = 0x20
  for (let i = 0; i < 32; i++) {
    out[i + 2] = a[i]
  }
  return changetype<ByteArray>(out)
}
