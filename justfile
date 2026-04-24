default:
    @just --list

# Build local image consumable by downstream deployers (e.g. local-network).
# Tags as ghcr.io/graphprotocol/indexing-payments-subgraph:local.
build-image:
    docker compose build
