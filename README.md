# Indexing Payments Subgraph

Subgraph indexing the lifecycle of on-chain indexing agreements from the [SubgraphService](https://github.com/graphprotocol/contracts/tree/main/packages/subgraph-service) contract. Tracks agreement acceptance, cancellation, updates, and fee collection events emitted through the `IndexingAgreement` library.

The primary consumer is [dipper](https://github.com/edgeandnode/dipper)'s chain listener, which monitors acceptance and cancellation events to keep its internal agreement state in sync with on-chain reality.

## Indexed Events

| Event | Description |
|-------|-------------|
| `IndexingAgreementAccepted` | Indexer accepts an RCA on-chain, creating an allocation |
| `IndexingAgreementCanceled` | Agreement canceled by payer or indexer |
| `IndexingAgreementUpdated` | Agreement terms or allocation updated |
| `IndexingFeesCollectedV1` | Fee collection against an active agreement |

## Development

```bash
npm install
npm run prepare:hardhat   # generate subgraph.yaml from template
npx graph codegen          # generate AssemblyScript types
npx graph build            # compile to WASM
npm test                   # run matchstick tests (Linux only)
```

## Deployment

Per-network config lives in `config/`. Generate the manifest for the target network, then deploy:

```bash
npm run prepare:hardhat
npx graph create --node http://localhost:8020 indexing-payments
npx graph deploy --node http://localhost:8020 --ipfs http://localhost:5001 --version-label v0.1.0 indexing-payments
```

## Networks

| Network | Config | Contract Address |
|---------|--------|-----------------|
| hardhat (local) | `config/hardhat.json` | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| arbitrum-one | `config/arbitrum-one.json` | TBD |
| arbitrum-sepolia | `config/arbitrum-sepolia.json` | TBD |

## License

MIT
