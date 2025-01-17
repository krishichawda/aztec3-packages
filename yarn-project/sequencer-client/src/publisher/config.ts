import { L1Addresses } from '@aztec/l1-contracts';

/**
 * The configuration of the rollup transaction publisher.
 */
export interface TxSenderConfig extends L1Addresses {
  /**
   * The private key to be used by the publisher.
   */
  publisherPrivateKey: Buffer;
  /**
   * The RPC Url of the etheraum host.
   */
  rpcUrl: string;
  /**
   * The number of confirmations required.
   */
  requiredConfirmations: number;
}

export interface PublisherConfig {
  /**
   * The interval to wait between publish retries.
   */
  retryIntervalMs: number;
}
