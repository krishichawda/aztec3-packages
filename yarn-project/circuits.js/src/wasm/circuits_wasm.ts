import isNode from 'detect-node';

import { AsyncCallState, AsyncFnState, NodeDataStore, WasmModule, WebDataStore } from '@aztec/foundation/wasm';
import { readFile } from 'fs/promises';
import { fetch } from 'cross-fetch';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { numToUInt32LE } from '../utils/serialize.js';
import { Crs } from '../crs/index.js';

/**
 * Get the WASM binary for barretenberg.
 * @returns The binary buffer.
 */
export async function fetchCode() {
  if (isNode) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    return await readFile(__dirname + '/aztec3-circuits.wasm');
  } else {
    const res = await fetch('/aztec3-circuits.wasm');
    return Buffer.from(await res.arrayBuffer());
  }
}

/**
 * A low-level wrapper for an instance of Circuits WASM.
 * TODO share code with barretenberg WASM
 */
export class CircuitsWasm {
  private store = isNode ? new NodeDataStore() : new WebDataStore();
  private wasm!: WasmModule;
  private asyncCallState = new AsyncCallState();

  /**
   * Create and initialize a BarretenbergWasm module.
   * @param initial - Initial memory pages.
   * @returns The module.
   */
  public static async new(initial?: number) {
    const barretenberg = new CircuitsWasm();
    await barretenberg.init(initial);
    return barretenberg;
  }
  constructor(private loggerName?: string) {}

  /**
   * 20 pages by default. 20*2**16 \> 1mb stack size plus other overheads.
   * 8192 maximum by default. 512mb.
   * @param initial - Initial memory pages.
   * @param maximum - Max memory pages.
   */
  public async init(initial = 20, maximum = 8192) {
    const { asyncCallState, store } = this;
    let wasm: WasmModule;
    this.wasm = wasm = new WasmModule(
      await fetchCode(),
      module => ({
        // These are functions implementations for imports we've defined are needed.
        // The native C++ build defines these in a module called "env". We must implement TypeScript versions here.
        /**
         * Log a string from barretenberg.
         * @param addr - The string address to log.
         */
        logstr(addr: number) {
          const str = wasm.getMemoryAsString(addr);
          const m = wasm.getMemory();
          const str2 = `${str} (mem: ${(m.length / (1024 * 1024)).toFixed(2)}MB)`;
          wasm.getLogger()(str2);
          console.log(str2);
        },
        /**
         * Read the data associated with the key located at keyAddr.
         * Malloc data within the WASM, copy the data into the WASM, and return the address to the caller.
         * The caller is responsible for taking ownership of (and freeing) the memory at the returned address.
         */
        // eslint-disable-next-line camelcase
        get_data: asyncCallState.wrapImportFn((state: AsyncFnState, keyAddr: number, lengthOutAddr: number) => {
          const key = wasm.getMemoryAsString(keyAddr);
          if (!state.continuation) {
            // We are in the initial code path. Start the async fetch of data, return the promise.
            wasm.getLogger()(`get_data: key: ${key}`);
            return store.get(key);
          } else {
            const data = state.result as Buffer | undefined;
            if (!data) {
              wasm.writeMemory(lengthOutAddr, numToUInt32LE(0));
              wasm.getLogger()(`get_data: no data found for: ${key}`);
              return 0;
            }
            const dataAddr = wasm.call('bbmalloc', data.length);
            wasm.writeMemory(lengthOutAddr, numToUInt32LE(data.length));
            wasm.writeMemory(dataAddr, data);
            wasm.getLogger()(`get_data: data at ${dataAddr} is ${data.length} bytes.`);
            return dataAddr;
          }
        }),
        // eslint-disable-next-line camelcase
        set_data: asyncCallState.wrapImportFn(
          (state: AsyncFnState, keyAddr: number, dataAddr: number, dataLength: number) => {
            if (!state.continuation) {
              const key = wasm.getMemoryAsString(keyAddr);
              wasm.getLogger()(`set_data: key: ${key} addr: ${dataAddr} length: ${dataLength}`);
              return store.set(key, Buffer.from(wasm.getMemorySlice(dataAddr, dataAddr + dataLength)));
            }
          },
        ),
        // eslint-disable-next-line camelcase
        env_load_verifier_crs: this.wrapAsyncImportFn(async () => {
          // TODO optimize
          const crs = new Crs(0);
          await crs.init();
          const crsPtr = wasm.call('bbmalloc', crs.getG2Data().length);
          wasm.writeMemory(crsPtr, crs.getG2Data());
          return crsPtr;
        }),
        // eslint-disable-next-line camelcase
        env_load_prover_crs: this.wrapAsyncImportFn(async (numPoints: number) => {
          const crs = new Crs(numPoints);
          await crs.init();
          const crsPtr = wasm.call('bbmalloc', crs.getG1Data().length);
          wasm.writeMemory(crsPtr, crs.getG1Data());
          return crsPtr;
        }),
        memory: module.getRawMemory(),
      }),
      this.loggerName,
    );
    await wasm.init(initial, maximum);
    this.asyncCallState.init(wasm);
  }

  /**
   * Wrap an async import funtion.
   * @param fn - The function.
   * @returns The AsyncCallState-adapted function.
   */
  private wrapAsyncImportFn(fn: (...args: number[]) => Promise<number | void>) {
    // TODO upstream this utility to asyncCallState?
    return this.asyncCallState.wrapImportFn((state: AsyncFnState, ...args: number[]) => {
      if (!state.continuation) {
        return fn(...args);
      }
      return state.result;
    });
  }

  /**
   * Get a slice of memory between two addresses.
   * @param start - The start address.
   * @param end - The end address.
   * @returns A Uint8Array view of memory.
   */
  public getMemorySlice(start: number, end: number) {
    return this.wasm.getMemorySlice(start, end);
  }

  /**
   * Write data into the heap.
   * @param arr - The data to write.
   * @param offset - The address to write data at.
   */
  public writeMemory(offset: number, arr: Uint8Array) {
    this.wasm.writeMemory(offset, arr);
  }

  /**
   * Calls into the WebAssembly.
   * @param name - The method name.
   * @param args - The arguments to the method.
   * @returns The numeric integer or address result.
   */
  public call(name: string, ...args: any): number {
    return this.wasm.call(name, ...args);
  }

  /**
   * Uses asyncify to enable async callbacks into js.
   * @see https://kripken.github.io/blog/wasm/2019/07/16/asyncify.html
   * @param name - The method name.
   * @param args - The arguments to the method.
   * @returns The numeric integer or address result.
   */
  public async asyncCall(name: string, ...args: any): Promise<number> {
    return await this.asyncCallState.call(name, ...args);
  }
}
