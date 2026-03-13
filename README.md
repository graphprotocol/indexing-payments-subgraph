<h1 align="center">Indexing Payments Subgraph</h1>

<p align="center">
  <a href="https://github.com/graphprotocol/indexing-payments-subgraph/actions"><img src="https://github.com/graphprotocol/indexing-payments-subgraph/actions/workflows/ci.yaml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://thegraph.com"><img src="https://img.shields.io/badge/The_Graph-protocol-6747ED.svg" alt="The Graph"></a>
</p>

<p align="center">
  On-chain event indexer for the indexing agreement lifecycle<br>
  in <a href="https://thegraph.com">The Graph</a> protocol.
</p>

<br>

## Overview

This subgraph indexes the full lifecycle of indexing agreements from the [SubgraphService](https://github.com/graphprotocol/contracts/tree/main/packages/subgraph-service) contract. Events are emitted through the `IndexingAgreement` library when indexers accept, update, or cancel agreements, and when fees are collected.

The primary consumer is [dipper](https://github.com/edgeandnode/dipper)'s chain listener, which uses acceptance and cancellation events to keep its internal agreement state in sync with what has been confirmed on-chain.

<br>

## Indexed Events

| | Event | Emitted when |
|---|---|---|
| **>>** | `IndexingAgreementAccepted` | An indexer accepts an RCA on-chain, creating an allocation |
| **<<** | `IndexingAgreementCanceled` | An agreement is canceled by payer or indexer |
| **~>** | `IndexingAgreementUpdated` | Agreement terms or allocation are changed |
| **$$** | `IndexingFeesCollectedV1` | Fees are collected against an active agreement |

<br>

## Quick Start

```bash
npm install

npm run prepare:hardhat     # generate manifest from template
npx graph codegen           # generate AssemblyScript types
npx graph build             # compile to WASM
npm test                    # matchstick unit tests (Linux only)
```

<br>

## Deployment

Each network has a config file in `config/` containing the SubgraphService contract address and start block. Generate the manifest for the target network, then deploy to a graph-node instance:

```bash
npm run prepare:hardhat

npx graph create --node http://localhost:8020 indexing-payments
npx graph deploy --node http://localhost:8020 --ipfs http://localhost:5001 \
  --version-label v0.1.0 indexing-payments
```

<br>

## Networks

| Network | Config | SubgraphService Address |
|:--------|:-------|:------------------------|
| Hardhat (local) | [`config/hardhat.json`](config/hardhat.json) | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| Arbitrum One | [`config/arbitrum-one.json`](config/arbitrum-one.json) | TBD |
| Arbitrum Sepolia | [`config/arbitrum-sepolia.json`](config/arbitrum-sepolia.json) | TBD |

<br>

## Architecture

```
SubgraphService contract
        |
        |  IndexingAgreement library emits events
        |
        v
  subgraph.yaml ──> graph-node ──> GraphQL API
                                       |
                                       v
                                    dipper
                                (chain_listener)
```

<br>

## License

[MIT](LICENSE)
