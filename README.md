<p align="center">
  <strong>Indexing Payments Subgraph</strong>
</p>

<p align="center">
  On-chain event indexer for the indexing agreement lifecycle in <a href="https://thegraph.com">The Graph</a> protocol.
</p>

<p align="center">
  <a href="https://github.com/graphprotocol/indexing-payments-subgraph/actions"><img src="https://github.com/graphprotocol/indexing-payments-subgraph/actions/workflows/ci.yaml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

---

Indexes agreement acceptance, cancellation, updates, and fee collection events emitted by the [SubgraphService](https://github.com/graphprotocol/contracts/tree/main/packages/subgraph-service) contract through the `IndexingAgreement` library.

The primary consumer is [dipper](https://github.com/edgeandnode/dipper)'s chain listener, which monitors these events to keep its internal agreement state in sync with on-chain reality.

## Indexed Events

```
IndexingAgreementAccepted   Indexer accepts an RCA on-chain, creating an allocation
IndexingAgreementCanceled   Agreement canceled by payer or indexer
IndexingAgreementUpdated    Agreement terms or allocation changed
IndexingFeesCollectedV1     Fee collection against an active agreement
```

## Quick Start

```bash
npm install
npm run prepare:hardhat     # generate manifest from template
npx graph codegen           # generate AssemblyScript types
npx graph build             # compile to WASM
npm test                    # matchstick tests (Linux only)
```

## Deployment

Each network has a config file in `config/` with the contract address and start block. Generate the manifest, then deploy:

```bash
npm run prepare:hardhat
npx graph create --node http://localhost:8020 indexing-payments
npx graph deploy --node http://localhost:8020 --ipfs http://localhost:5001 \
  --version-label v0.1.0 indexing-payments
```

## Networks

```
hardhat (local)     config/hardhat.json           0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
arbitrum-one        config/arbitrum-one.json       TBD
arbitrum-sepolia    config/arbitrum-sepolia.json   TBD
```

## License

[MIT](LICENSE)
