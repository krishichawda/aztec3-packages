FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder

COPY foundation foundation
COPY merkle-tree merkle-tree
COPY barretenberg.js barretenberg.js

WORKDIR /usr/src/yarn-project/foundation
RUN yarn build
WORKDIR /usr/src/yarn-project/barretenberg.js
RUN yarn build
RUN cp /usr/src/circuits/cpp/build-wasm/bin/aztec3-circuits.wasm dest/wasm/barretenberg.wasm

WORKDIR /usr/src/yarn-project/merkle-tree
RUN yarn build && yarn formatting && yarn test

# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null

FROM node:18-alpine
COPY --from=builder /usr/src/yarn-project/merkle-tree /usr/src/yarn-project/merkle-tree
WORKDIR /usr/src/yarn-project/merkle-tree
ENTRYPOINT ["yarn"]