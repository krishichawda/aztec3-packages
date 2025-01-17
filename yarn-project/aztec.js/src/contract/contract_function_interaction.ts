import { AztecRPCClient, Tx, TxHash, TxRequest } from '@aztec/aztec-rpc';
import { AztecAddress, EcdsaSignature, Fr } from '@aztec/circuits.js';
import { FunctionType } from '@aztec/noir-contracts';
import { SentTx } from './sent_tx.js';

export interface SendMethodOptions {
  from?: AztecAddress;
  nonce?: Fr;
}

export interface ViewMethodOptions {
  from?: AztecAddress;
}

/**
 * This is the class that is returned when calling e.g. `contract.methods.myMethod(arg0, arg1)`.
 * It contains available interactions one can call on a method.
 */
export class ContractFunctionInteraction {
  protected txRequest?: TxRequest;
  private signature?: EcdsaSignature;
  private tx?: Tx;

  constructor(
    protected arc: AztecRPCClient,
    protected contractAddress: AztecAddress,
    protected functionName: string,
    protected args: any[],
    protected functionType: FunctionType,
  ) {}

  public async request(options: SendMethodOptions = {}) {
    if (this.functionType === FunctionType.UNCONSTRAINED) {
      throw new Error("Can't call `request` on an unconstrained function.");
    }

    const { from } = options;
    this.txRequest = await this.arc.createTxRequest(this.functionName, this.args, this.contractAddress, from);
    return this.txRequest;
  }

  public async sign(options: SendMethodOptions = {}) {
    if (this.functionType === FunctionType.UNCONSTRAINED) {
      throw new Error("Can't call `sign` on an unconstrained function.");
    }

    if (!this.txRequest) {
      await this.request(options);
    }

    this.signature = await this.arc.signTxRequest(this.txRequest!);
    return this.signature;
  }

  public async create(options: SendMethodOptions = {}) {
    if (this.functionType === FunctionType.UNCONSTRAINED) {
      throw new Error("Can't call `create` on an unconstrained function.");
    }

    if (!this.signature) {
      await this.sign(options);
    }

    this.tx = await this.arc.createTx(this.txRequest!, this.signature!);
    return this.tx;
  }

  public send(options: SendMethodOptions = {}) {
    if (this.functionType === FunctionType.UNCONSTRAINED) {
      throw new Error("Can't call `send` on an unconstrained function.");
    }

    let promise: Promise<TxHash>;
    if (this.tx) {
      promise = this.arc.sendTx(this.tx);
    } else {
      promise = (async () => {
        await this.create(options);
        return this.arc.sendTx(this.tx!);
      })();
    }

    return new SentTx(this.arc, promise);
  }

  public view(options: ViewMethodOptions = {}) {
    if (this.functionType !== FunctionType.UNCONSTRAINED) {
      throw new Error('Can only call `view` on an unconstrained function.');
    }

    const { from } = options;
    return this.arc.viewTx(this.functionName, this.args, this.contractAddress, from);
  }
}
