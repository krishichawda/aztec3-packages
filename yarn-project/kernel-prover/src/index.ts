import { ExecutionResult } from '@aztec/acir-simulator';
import {
  OldTreeRoots,
  PrivateKernelPublicInputs,
  TxRequest,
  CircuitsWasm,
  SignedTxRequest,
  PrivateCallData,
  PRIVATE_CALL_STACK_LENGTH,
  PrivateCallStackItem,
  PreviousKernelData,
  UInt8Vector,
  EcdsaSignature,
  MembershipWitness,
  CONTRACT_TREE_HEIGHT,
  privateKernelSim,
  FUNCTION_TREE_HEIGHT,
  VerificationKey,
  makeEmptyProof,
} from '@aztec/circuits.js';
import { createDebugLogger, Fr } from '@aztec/foundation';

export interface FunctionTreeInfo {
  root: Buffer;
  membershipWitness: MembershipWitness<typeof FUNCTION_TREE_HEIGHT>;
}

export class KernelProver {
  constructor(private log = createDebugLogger('aztec:kernel_prover')) {}
  async prove(
    txRequest: TxRequest,
    txSignature: EcdsaSignature,
    executionResult: ExecutionResult,
    oldRoots: OldTreeRoots,
    wasm: CircuitsWasm,
    getFunctionTreeInfo: (callStackItem: PrivateCallStackItem) => Promise<FunctionTreeInfo>,
    getContractSiblingPath: (committment: Buffer) => Promise<MembershipWitness<typeof CONTRACT_TREE_HEIGHT>>,
  ): Promise<{ publicInputs: PrivateKernelPublicInputs; proof: Buffer }> {
    // TODO: implement this
    const signedTxRequest = new SignedTxRequest(txRequest, txSignature);

    const functionTreeInfo = await getFunctionTreeInfo(executionResult.callStackItem);
    const contractLeafMembershipWitness = txRequest.functionData.isConstructor
      ? this.createRandomMembershipWitness()
      : await getContractSiblingPath(functionTreeInfo.root);

    const privateCallData = new PrivateCallData(
      executionResult.callStackItem,
      Array(PRIVATE_CALL_STACK_LENGTH)
        .fill(0)
        .map(() => PrivateCallStackItem.empty()),
      new UInt8Vector(Buffer.alloc(42)),
      VerificationKey.fromBuffer(executionResult.vk),
      functionTreeInfo.membershipWitness,
      contractLeafMembershipWitness,
      txRequest.txContext.contractDeploymentData.portalContractAddress,
    );

    const previousKernelData: PreviousKernelData = PreviousKernelData.makeEmpty();
    this.log(`Executing private kernel simulation...`);
    const publicInputs = await privateKernelSim(wasm, signedTxRequest, previousKernelData, privateCallData);
    this.log(`Skipping private kernel proving...`);
    // const proof = await privateKernelProve(wasm, signedTxRequest, previousKernelData, privateCallData);
    const proof = makeEmptyProof().buffer;
    this.log('Kernel Prover Completed!');

    return Promise.resolve({
      publicInputs,
      proof,
    });
  }

  private createDummyVk() {
    return VerificationKey.makeFake();
  }

  private createRandomMembershipWitness() {
    return new MembershipWitness<typeof CONTRACT_TREE_HEIGHT>(
      CONTRACT_TREE_HEIGHT,
      0,
      Array(CONTRACT_TREE_HEIGHT)
        .fill(0)
        .map(() => Fr.random()),
    );
  }
}
