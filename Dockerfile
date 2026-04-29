# Packages the subgraph source and prebuilt node_modules at
# /opt/indexing-payments-subgraph. Consumed via multi-stage COPY by
# downstream deployers (e.g. edgeandnode/local-network subgraph-deploy).
#
# The image has no entrypoint: it is a source carrier, not a runtime service.

FROM node:24-bookworm-slim

WORKDIR /opt/indexing-payments-subgraph

# Install dependencies first so source edits don't invalidate this layer.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
