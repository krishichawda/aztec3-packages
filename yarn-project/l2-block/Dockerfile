FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/yarn-project-base AS builder
COPY l2-block l2-block
# dependencies
COPY circuits.js circuits.js
COPY ethereum.js ethereum.js
COPY foundation foundation
COPY l1-contracts l1-contracts
COPY tx tx
COPY unverified-data unverified-data

WORKDIR /usr/src/yarn-project/l2-block
RUN yarn build && yarn formatting && yarn test

# Prune dev dependencies. See comment in base image.
RUN yarn cache clean
RUN yarn workspaces focus --production > /dev/null

FROM node:18-alpine
COPY --from=builder /usr/src/yarn-project/l2-block /usr/src/yarn-project/l2-block
WORKDIR /usr/src/yarn-project/l2-block
ENTRYPOINT ["yarn"]