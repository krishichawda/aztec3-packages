import { default as levelup } from 'levelup';
import { StandardMerkleTree, Pedersen, SiblingPath, IndexedTree, MerkleTree } from '@aztec/merkle-tree';
import { SerialQueue } from '@aztec/foundation';
import {
  CONTRACT_TREE_HEIGHT,
  CONTRACT_TREE_ROOTS_TREE_HEIGHT,
  NULLIFIER_TREE_HEIGHT,
  PRIVATE_DATA_TREE_HEIGHT,
  PRIVATE_DATA_TREE_ROOTS_TREE_HEIGHT,
} from '@aztec/circuits.js';
import { MerkleTreeDb, MerkleTreeId, TreeInfo } from './index.js';

/**
 * A convenience class for managing multiple merkle trees.
 */
export class MerkleTrees implements MerkleTreeDb {
  private trees: MerkleTree[] = [];
  private jobQueue = new SerialQueue();

  constructor(private db: levelup.LevelUp) {}

  /**
   * Initialises the collection of Merkle Trees.
   */
  public async init() {
    const hasher = new Pedersen();
    const contractTree = await StandardMerkleTree.new(
      this.db,
      hasher,
      `${MerkleTreeId[MerkleTreeId.CONTRACT_TREE]}`,
      CONTRACT_TREE_HEIGHT,
    );
    const contractTreeRootsTree = await StandardMerkleTree.new(
      this.db,
      hasher,
      `${MerkleTreeId[MerkleTreeId.CONTRACT_TREE_ROOTS_TREE]}`,
      CONTRACT_TREE_ROOTS_TREE_HEIGHT,
    );
    const nullifierTree = await IndexedTree.new(
      this.db,
      hasher,
      `${MerkleTreeId[MerkleTreeId.NULLIFIER_TREE]}`,
      NULLIFIER_TREE_HEIGHT,
    );
    const dataTree = await StandardMerkleTree.new(
      this.db,
      hasher,
      `${MerkleTreeId[MerkleTreeId.DATA_TREE]}`,
      PRIVATE_DATA_TREE_HEIGHT,
    );
    const dataTreeRootsTree = await StandardMerkleTree.new(
      this.db,
      hasher,
      `${MerkleTreeId[MerkleTreeId.DATA_TREE_ROOTS_TREE]}`,
      PRIVATE_DATA_TREE_ROOTS_TREE_HEIGHT,
    );
    this.trees = [contractTree, contractTreeRootsTree, nullifierTree, dataTree, dataTreeRootsTree];
    this.jobQueue.start();
  }

  /**
   * Method to asynchronously create and initialise a MerkleTrees instance.
   * @param db - The db instance to use for data persistance.
   * @returns - A fully initialised MerkleTrees instance.
   */
  public static async new(db: levelup.LevelUp) {
    const merkleTrees = new MerkleTrees(db);
    await merkleTrees.init();
    return merkleTrees;
  }

  /**
   * Stops the job queue (waits for all jobs to finish).
   */
  public async stop() {
    await this.jobQueue.end();
  }

  /**
   * Gets the tree info for the specified tree.
   * @param treeId - Id of the tree to get information from.
   * @returns The tree info for the specified tree.
   */
  public async getTreeInfo(treeId: MerkleTreeId): Promise<TreeInfo> {
    return await this.synchronise(() => this._getTreeInfo(treeId));
  }

  /**
   * Gets the sibling path for a leaf in a tree.
   * @param treeId - The ID of the tree.
   * @param index - The index of the leaf.
   * @returns The sibling path for the leaf.
   */
  public async getSiblingPath(treeId: MerkleTreeId, index: bigint): Promise<SiblingPath> {
    return await this.synchronise(() => this._getSiblingPath(treeId, index));
  }

  /**
   * Appends leaves to a tree.
   * @param treeId - The ID of the tree.
   * @param leaves - The leaves to append.
   * @returns Empty promise.
   */
  public async appendLeaves(treeId: MerkleTreeId, leaves: Buffer[]): Promise<void> {
    return await this.synchronise(() => this._appendLeaves(treeId, leaves));
  }

  /**
   * Commits all pending updates.
   * @returns Empty promise.
   */
  public async commit(): Promise<void> {
    return await this.synchronise(() => this._commit());
  }

  /**
   * Rolls back all pending updates.
   * @returns Empty promise.
   */
  public async rollback(): Promise<void> {
    return await this.synchronise(() => this._rollback());
  }

  /**
   * Waits for all jobs to finish before executing the given function.
   * @param fn - The function to execute.
   * @returns Promise containing the result of the function.
   */
  private async synchronise<T>(fn: () => Promise<T>): Promise<T> {
    return await this.jobQueue.put(fn);
  }

  /**
   * Returns the tree info for the specified tree.
   * @param treeId - Id of the tree to get information from.
   * @returns The tree info for the specified tree.
   */
  private _getTreeInfo(treeId: MerkleTreeId): Promise<TreeInfo> {
    const treeInfo = {
      treeId,
      root: this.trees[treeId].getRoot(),
      size: this.trees[treeId].getNumLeaves(),
    } as TreeInfo;
    return Promise.resolve(treeInfo);
  }

  /**
   * Returns the sibling path for a leaf in a tree.
   * @param treeId - Id of the tree to get the sibling path from.
   * @param index - Index of the leaf to get the sibling path for.
   * @returns Promise containing the sibling path for the leaf.
   */
  private _getSiblingPath(treeId: MerkleTreeId, index: bigint): Promise<SiblingPath> {
    return Promise.resolve(this.trees[treeId].getSiblingPath(index));
  }

  /**
   * Appends leaves to a tree.
   * @param treeId - Id of the tree to append leaves to.
   * @param leaves - Leaves to append.
   * @returns Empty promise.
   */
  private async _appendLeaves(treeId: MerkleTreeId, leaves: Buffer[]): Promise<void> {
    return await this.trees[treeId].appendLeaves(leaves);
  }

  /**
   * Commits all pending updates.
   * @returns Empty promise.
   */
  private async _commit(): Promise<void> {
    for (const tree of this.trees) {
      await tree.commit();
    }
  }

  /**
   * Rolls back all pending updates.
   * @returns Empty promise.
   */
  private async _rollback(): Promise<void> {
    for (const tree of this.trees) {
      await tree.rollback();
    }
  }
}