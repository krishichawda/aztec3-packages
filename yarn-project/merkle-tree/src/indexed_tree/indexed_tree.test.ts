import { default as levelup } from 'levelup';
import { Hasher, MerkleTree, Pedersen, SiblingPath } from '../index.js';
import { IndexedTree } from './indexed_tree.js';
import { merkleTreeTestSuite, createMemDown } from '../test/test_suite.js';
import { toBufferBE } from '@aztec/foundation';
import { BarretenbergWasm } from '@aztec/barretenberg.js/wasm';

const createDb = async (levelUp: levelup.LevelUp, hasher: Hasher, name: string, depth: number) => {
  return await IndexedTree.new(levelUp, hasher, name, depth);
};

const createFromName = async (levelUp: levelup.LevelUp, hasher: Hasher, name: string) => {
  return await IndexedTree.fromName(levelUp, hasher, name);
};

const createIndexedTreeLeaf = (value: number, nextIndex: number, nextValue: number) => {
  return [toBufferBE(BigInt(value), 32), toBufferBE(BigInt(nextIndex), 32), toBufferBE(BigInt(nextValue), 32)];
};

const verifyCommittedState = async (
  tree: MerkleTree,
  root: Buffer,
  siblingPathIndex: bigint,
  emptySiblingPath: SiblingPath,
) => {
  expect(tree.getRoot(false)).toEqual(root);
  expect(tree.getNumLeaves(false)).toEqual(1n);
  expect(await tree.getSiblingPath(siblingPathIndex, false)).toEqual(emptySiblingPath);
};

merkleTreeTestSuite('IndexedMerkleTree', createDb, createFromName);

describe('IndexedMerkleTreeSpecific', () => {
  let wasm: BarretenbergWasm;
  let pedersen: Pedersen;

  beforeEach(async () => {
    wasm = await BarretenbergWasm.new();
    pedersen = new Pedersen(wasm);
  });

  it('produces the correct roots and sibling paths', async () => {
    // Create a depth-3 indexed merkle tree
    const db = levelup(createMemDown());
    const tree = await createDb(db, pedersen, 'test', 3);

    /**
     * Initial state:
     *
     *  index     0       1       2       3        4       5       6       7
     *  ---------------------------------------------------------------------
     *  val       0       0       0       0        0       0       0       0
     *  nextIdx   0       0       0       0        0       0       0       0
     *  nextVal   0       0       0       0        0       0       0       0.
     */

    const zeroTreeLeafHash = pedersen.compressInputs(createIndexedTreeLeaf(0, 0, 0));
    const level1ZeroHash = pedersen.compress(zeroTreeLeafHash, zeroTreeLeafHash);
    const level2ZeroHash = pedersen.compress(level1ZeroHash, level1ZeroHash);
    let root = pedersen.compress(level2ZeroHash, level2ZeroHash);
    const initialRoot = root;
    const emptySiblingPath = new SiblingPath([zeroTreeLeafHash, level1ZeroHash, level2ZeroHash]);

    expect(tree.getRoot(true)).toEqual(root);
    expect(tree.getNumLeaves(true)).toEqual(1n);
    expect(await tree.getSiblingPath(0n, true)).toEqual(
      new SiblingPath([zeroTreeLeafHash, level1ZeroHash, level2ZeroHash]),
    );

    await verifyCommittedState(tree, initialRoot, 0n, emptySiblingPath);

    /**
     * Add new value 30:
     *
     *  index     0       1       2       3        4       5       6       7
     *  ---------------------------------------------------------------------
     *  val       0       30      0       0        0       0       0       0
     *  nextIdx   1       0       0       0        0       0       0       0
     *  nextVal   30      0       0       0        0       0       0       0.
     */
    let index0Hash = pedersen.compressInputs(createIndexedTreeLeaf(0, 1, 30));
    let index1Hash = pedersen.compressInputs(createIndexedTreeLeaf(30, 0, 0));
    let e10 = pedersen.compress(index0Hash, index1Hash);
    let e20 = pedersen.compress(e10, level1ZeroHash);
    root = pedersen.compress(e20, level2ZeroHash);

    await tree.appendLeaves([toBufferBE(30n, 32)]);

    expect(tree.getRoot(true)).toEqual(root);
    expect(tree.getNumLeaves(true)).toEqual(2n);
    expect(await tree.getSiblingPath(1n, true)).toEqual(new SiblingPath([index0Hash, level1ZeroHash, level2ZeroHash]));

    // ensure the committed state is correct
    await verifyCommittedState(tree, initialRoot, 1n, emptySiblingPath);

    /**
     * Add new value 10:
     *
     *  index     0       1       2       3        4       5       6       7
     *  ---------------------------------------------------------------------
     *  val       0       30      10      0        0       0       0       0
     *  nextIdx   2       0       1       0        0       0       0       0
     *  nextVal   10      0       30      0        0       0       0       0.
     */
    index0Hash = pedersen.compressInputs(createIndexedTreeLeaf(0, 2, 10));
    let index2Hash = pedersen.compressInputs(createIndexedTreeLeaf(10, 1, 30));
    e10 = pedersen.compress(index0Hash, index1Hash);
    let e11 = pedersen.compress(index2Hash, zeroTreeLeafHash);
    e20 = pedersen.compress(e10, e11);
    root = pedersen.compress(e20, level2ZeroHash);

    await tree.appendLeaves([toBufferBE(10n, 32)]);

    expect(tree.getRoot(true)).toEqual(root);
    expect(tree.getNumLeaves(true)).toEqual(3n);
    expect(await tree.getSiblingPath(2n, true)).toEqual(new SiblingPath([zeroTreeLeafHash, e10, level2ZeroHash]));

    // ensure the committed state is correct
    await verifyCommittedState(tree, initialRoot, 2n, emptySiblingPath);

    /**
     * Add new value 20:
     *
     *  index     0       1       2       3        4       5       6       7
     *  ---------------------------------------------------------------------
     *  val       0       30      10      20       0       0       0       0
     *  nextIdx   2       0       3       1        0       0       0       0
     *  nextVal   10      0       20      30       0       0       0       0.
     */
    e10 = pedersen.compress(index0Hash, index1Hash);
    index2Hash = pedersen.compressInputs(createIndexedTreeLeaf(10, 3, 20));
    const index3Hash = pedersen.compressInputs(createIndexedTreeLeaf(20, 1, 30));
    e11 = pedersen.compress(index2Hash, index3Hash);
    e20 = pedersen.compress(e10, e11);
    root = pedersen.compress(e20, level2ZeroHash);

    await tree.appendLeaves([toBufferBE(20n, 32)]);

    expect(tree.getRoot(true)).toEqual(root);
    expect(tree.getNumLeaves(true)).toEqual(4n);
    expect(await tree.getSiblingPath(3n, true)).toEqual(new SiblingPath([index2Hash, e10, level2ZeroHash]));

    // ensure the committed state is correct
    await verifyCommittedState(tree, initialRoot, 3n, emptySiblingPath);

    /**
     * Add new value 50:
     *
     *  index     0       1       2       3        4       5       6       7
     *  ---------------------------------------------------------------------
     *  val       0       30      10      20       50      0       0       0
     *  nextIdx   2       4       3       1        0       0       0       0
     *  nextVal   10      50      20      30       0       0       0       0.
     */
    index1Hash = pedersen.compressInputs(createIndexedTreeLeaf(30, 4, 50));
    const index4Hash = pedersen.compressInputs(createIndexedTreeLeaf(50, 0, 0));
    e10 = pedersen.compress(index0Hash, index1Hash);
    e20 = pedersen.compress(e10, e11);
    const e12 = pedersen.compress(index4Hash, zeroTreeLeafHash);
    const e21 = pedersen.compress(e12, level1ZeroHash);
    root = pedersen.compress(e20, e21);

    await tree.appendLeaves([toBufferBE(50n, 32)]);

    expect(tree.getRoot(true)).toEqual(root);
    expect(tree.getNumLeaves(true)).toEqual(5n);

    // ensure the committed state is correct
    await verifyCommittedState(tree, initialRoot, 4n, emptySiblingPath);

    // check all uncommitted hash paths
    expect(await tree.getSiblingPath(0n, true)).toEqual(new SiblingPath([index1Hash, e11, e21]));
    expect(await tree.getSiblingPath(1n, true)).toEqual(new SiblingPath([index0Hash, e11, e21]));
    expect(await tree.getSiblingPath(2n, true)).toEqual(new SiblingPath([index3Hash, e10, e21]));
    expect(await tree.getSiblingPath(3n, true)).toEqual(new SiblingPath([index2Hash, e10, e21]));
    expect(await tree.getSiblingPath(4n, true)).toEqual(new SiblingPath([zeroTreeLeafHash, level1ZeroHash, e20]));
    expect(await tree.getSiblingPath(5n, true)).toEqual(new SiblingPath([index4Hash, level1ZeroHash, e20]));
    expect(await tree.getSiblingPath(6n, true)).toEqual(new SiblingPath([zeroTreeLeafHash, e12, e20]));
    expect(await tree.getSiblingPath(7n, true)).toEqual(new SiblingPath([zeroTreeLeafHash, e12, e20]));

    // check all committed hash paths
    for (let i = 0; i < 8; i++) {
      expect(await tree.getSiblingPath(BigInt(i), false)).toEqual(emptySiblingPath);
    }

    await tree.commit();
    // check all committed hash paths equal uncommitted hash paths
    for (let i = 0; i < 8; i++) {
      expect(await tree.getSiblingPath(BigInt(i), false)).toEqual(await tree.getSiblingPath(BigInt(i), true));
    }
  });
});
