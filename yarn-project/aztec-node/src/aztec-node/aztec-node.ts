import { default as levelup } from 'levelup';
import { default as memdown } from 'memdown';
import { Archiver } from '@aztec/archiver';
import { ContractData, L2Block, L2BlockSource } from '@aztec/l2-block';
import { P2P, P2PClient } from '@aztec/p2p';
import { Tx, TxHash } from '@aztec/tx';
import { MerkleTrees, WorldStateSynchroniser, ServerWorldStateSynchroniser, MerkleTreeId } from '@aztec/world-state';
import { SequencerClient } from '@aztec/sequencer-client';
import { AztecNodeConfig } from './config.js';
import { SiblingPath } from '@aztec/merkle-tree';
import { AztecAddress } from '@aztec/foundation';
import { CircuitsWasm } from '@aztec/circuits.js';
import { UnverifiedData, UnverifiedDataSource } from '@aztec/unverified-data';

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
export const createMemDown = () => memdown();

/**
 * The aztec node.
 */
export class AztecNode {
  constructor(
    private p2pClient: P2P,
    private blockSource: L2BlockSource,
    private unverifiedDataSource: UnverifiedDataSource,
    private merkleTreeDB: MerkleTrees,
    private worldStateSynchroniser: WorldStateSynchroniser,
    private sequencer: SequencerClient,
  ) {}

  /**
   * Initialises the Aztec Node, wait for component to sync.
   * @param config - The configuration to be used by the aztec node.
   * @returns - A fully synced Aztec Node for use in development/testing.
   */
  public static async createAndSync(config: AztecNodeConfig) {
    // first create and sync the archiver
    const archiver = await Archiver.createAndSync(config);

    // give the block source to the P2P network
    const p2pClient = new P2PClient(archiver);

    // now create the merkle trees and the world state syncher
    const merkleTreeDB = await MerkleTrees.new(levelup(createMemDown()));
    const worldStateSynchroniser = new ServerWorldStateSynchroniser(merkleTreeDB, archiver);

    // start both and wait for them to sync from the block source
    await Promise.all([p2pClient.start(), worldStateSynchroniser.start()]);

    // now create the sequencer
    const wasm = await CircuitsWasm.new();
    const sequencer = await SequencerClient.new(config, p2pClient, worldStateSynchroniser, wasm);
    return new AztecNode(p2pClient, archiver, archiver, merkleTreeDB, worldStateSynchroniser, sequencer);
  }

  /**
   * Method to determine if the node is ready to accept transactions.
   * @returns - Flag indicating the readiness for tx submission.
   */
  public async isReady() {
    return (await this.p2pClient.isReady()) ?? false;
  }

  /**
   * Method to request blocks. Will attempt to return all requested blocks but will return only those available.
   * @param from - The start of the range of blocks to return.
   * @param take - The number of blocks desired.
   * @returns The blocks requested.
   */
  public async getBlocks(from: number, take: number): Promise<L2Block[]> {
    return (await this.blockSource.getL2Blocks(from, take)) ?? [];
  }

  /**
   * Method to fetch the current block height
   * @returns The block height as a number.
   */
  public async getBlockHeight(): Promise<number> {
    return await this.blockSource.getBlockHeight();
  }

  /**
   * Lookup the L2 contract data for this contract.
   * Contains information such as the ethereum portal address.
   * @param contractAddress - The contract data address.
   * @returns The portal address (if we didn't throw an error).
   */
  public async getContractData(contractAddress: AztecAddress): Promise<ContractData | undefined> {
    return await this.blockSource.getL2ContractData(contractAddress);
  }

  /**
   * Gets the `take` amount of unverified data starting from `from`.
   * @param from - Number of the L2 block to which corresponds the first `unverifiedData` to be returned.
   * @param take - The number of `unverifiedData` to return.
   * @returns The requested `unverifiedData`.
   */
  public getUnverifiedData(from: number, take: number): Promise<UnverifiedData[]> {
    return this.unverifiedDataSource.getUnverifiedData(from, take);
  }

  /**
   * Method to submit a transaction to the p2p pool.
   * @param tx - The transaction to be submitted.
   */
  public async sendTx(tx: Tx) {
    await this.p2pClient!.sendTx(tx);
  }

  /**
   * Method to stop the aztec node.
   */
  public async stop() {
    await this.p2pClient.stop();
    await this.worldStateSynchroniser.stop();
    await this.merkleTreeDB.stop();
    await this.sequencer.stop();
    await this.blockSource.stop();
  }

  /**
   * Method to retrieve pending txs.
   * @returns - The pending txs.
   */
  public async getPendingTxs() {
    return await this.p2pClient!.getTxs();
  }

  /**
   * Method to retrieve a single pending tx
   * @param txHash - The transaction hash to return.
   * @returns - The pending tx if it exists
   */
  public async getPendingTxByHash(txHash: TxHash) {
    return await this.p2pClient!.getTxByhash(txHash);
  }

  public findContractIndex(leafValue: Buffer): Promise<bigint | undefined> {
    return this.merkleTreeDB.findLeafIndex(MerkleTreeId.CONTRACT_TREE, leafValue, false);
  }

  public getContractPath(leafIndex: bigint): Promise<SiblingPath> {
    return this.merkleTreeDB.getSiblingPath(MerkleTreeId.CONTRACT_TREE, leafIndex, false);
  }
}
