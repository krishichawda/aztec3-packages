import { expectReserializeToMatchObject, expectSerializeToMatchSnapshot } from '../tests/expectSerialize.js';
import { makeBaseRollupInputs, makeBaseRollupPublicInputs } from '../tests/factories.js';
import { BaseOrMergeRollupPublicInputs } from './base_rollup.js';

describe('structs/base_rollup', () => {
  it(`serializes and prints BaseRollupInputs`, async () => {
    const baseRollupInputs = makeBaseRollupInputs();
    await expectSerializeToMatchSnapshot(
      baseRollupInputs.toBuffer(),
      'abis__test_roundtrip_serialize_base_rollup_inputs',
    );
  });

  it(`serializes and prints BaseRollupPublicInputs`, async () => {
    const baseRollupPublicInputs = makeBaseRollupPublicInputs();

    await expectSerializeToMatchSnapshot(
      baseRollupPublicInputs.toBuffer(),
      'abis__test_roundtrip_serialize_base_or_merge_rollup_public_inputs',
    );
  });

  it(`serializes and deserializes BaseRollupPublicInputs`, async () => {
    const baseRollupPublicInputs = makeBaseRollupPublicInputs();

    await expectReserializeToMatchObject(
      baseRollupPublicInputs,
      'abis__test_roundtrip_reserialize_base_or_merge_rollup_public_inputs',
      BaseOrMergeRollupPublicInputs.fromBuffer,
    );
  });
});
