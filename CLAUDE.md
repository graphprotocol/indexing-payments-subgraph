# Indexing Payments Subgraph

Subgraph indexing IndexingAgreement lifecycle events (accepted, canceled) from the SubgraphService contract. Used by dipper's chain_listener to track on-chain agreement state.

## Build

```bash
npm run prepare:hardhat    # generate subgraph.yaml from template
npx graph codegen          # generate AssemblyScript types
npx graph build            # compile to WASM
```

## Pre-PR Checklist

Always run before creating a PR:

```bash
npm run prepare:hardhat && npx graph codegen && npx graph build && npm run format:check
```

## Network Configs

Per-network contract addresses and start blocks live in `config/`. The manifest is generated from `subgraph.template.yaml` using mustache:

- `npm run prepare:hardhat` — local-network (SubgraphService at `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`)
- `npm run prepare:arbitrum-one` — mainnet (address TBD)
- `npm run prepare:arbitrum-sepolia` — testnet (address TBD)
