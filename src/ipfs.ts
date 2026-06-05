import { json, Bytes, dataSource, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts'
import { AccountMetadata } from '../generated/schema'

// Runs when graph-node fetches the account's metadata document from IPFS. The
// content is whatever the account uploaded, so every field is optional.
export function handleAccountMetadata(content: Bytes): void {
  let metadata = new AccountMetadata(dataSource.context().getString('id'))
  let tryData = json.try_fromBytes(content)
  if (tryData.isOk) {
    let data = tryData.value.toObject()
    metadata.image = jsonToString(data.get('image'))
    metadata.displayName = jsonToString(data.get('displayName'))
    metadata.description = jsonToString(data.get('description'))
    metadata.website = jsonToString(data.get('website'))
    metadata.codeRepository = jsonToString(data.get('codeRepository'))
    let isOrganization = data.get('isOrganization')
    if (isOrganization != null && isOrganization.kind == JSONValueKind.BOOL) {
      metadata.isOrganization = isOrganization.toBool()
    }
    metadata.save()
  }
}

function jsonToString(val: JSONValue | null): string {
  if (val != null && val.kind == JSONValueKind.STRING) {
    return val.toString()
  }
  return ''
}
