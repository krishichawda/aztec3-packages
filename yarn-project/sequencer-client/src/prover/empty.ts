import {
  AggregationObject,
  BaseRollupInputs,
  BaseOrMergeRollupPublicInputs,
  MergeRollupInputs,
  MergeRollupPublicInputs,
  RootRollupInputs,
  RootRollupPublicInputs,
  UInt8Vector,
} from '@aztec/circuits.js';
import { Prover } from './index.js';

/* eslint-disable */

const EMPTY_PROOF_SIZE = 42;

// TODO: Silently modifying one of the inputs is horrible. Rethink these interfaces.
export class EmptyProver implements Prover {
  async getBaseRollupProof(input: BaseRollupInputs, publicInputs: BaseOrMergeRollupPublicInputs): Promise<UInt8Vector> {
    publicInputs.endAggregationObject = AggregationObject.makeFake();
    return new UInt8Vector(Buffer.alloc(EMPTY_PROOF_SIZE, 0));
  }
  async getMergeRollupProof(input: MergeRollupInputs, publicInputs: MergeRollupPublicInputs): Promise<UInt8Vector> {
    publicInputs.endAggregationObject = AggregationObject.makeFake();
    return new UInt8Vector(Buffer.alloc(EMPTY_PROOF_SIZE, 0));
  }
  async getRootRollupProof(input: RootRollupInputs, publicInputs: RootRollupPublicInputs): Promise<UInt8Vector> {
    publicInputs.endAggregationObject = AggregationObject.makeFake();
    return new UInt8Vector(Buffer.alloc(EMPTY_PROOF_SIZE, 0));
  }
}
