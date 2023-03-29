import { createCipheriv, createDecipheriv } from 'browserify-cipher';
import { Grumpkin } from '@aztec/barretenberg.js/crypto';
import { numToUInt8 } from '@aztec/foundation/serialize';
import { sha256 } from '@aztec/foundation/crypto';
import { AztecAddress } from '@aztec/foundation/aztec-address';

function deriveAESSecret(ecdhPubKey: AztecAddress, ecdhPrivKey: Buffer, grumpkin: Grumpkin) {
  const sharedSecret = grumpkin.mul(ecdhPubKey.toBuffer(), ecdhPrivKey);
  const secretBuffer = Buffer.concat([sharedSecret, numToUInt8(1)]);
  const hash = sha256(secretBuffer);
  return hash;
}

export function encryptBuffer(data: Buffer, ownerPubKey: AztecAddress, ephPrivKey: Buffer, grumpkin: Grumpkin) {
  const ephPubKey = grumpkin.mul(Grumpkin.generator, ephPrivKey);
  const aesSecret = deriveAESSecret(ownerPubKey, ephPrivKey, grumpkin);
  const aesKey = aesSecret.subarray(0, 16);
  const iv = aesSecret.subarray(16, 32);
  const cipher = createCipheriv('aes-128-cbc', aesKey, iv);
  const plaintext = Buffer.concat([iv.subarray(0, 8), data]);
  return Buffer.concat([cipher.update(plaintext), cipher.final(), ephPubKey]);
}

export function decryptBuffer(data: Buffer, ownerPrivKey: Buffer, grumpkin: Grumpkin) {
  const ephPubKey = new AztecAddress(data.subarray(-64));
  const aesSecret = deriveAESSecret(ephPubKey, ownerPrivKey, grumpkin);
  const aesKey = aesSecret.subarray(0, 16);
  const iv = aesSecret.subarray(16, 32);
  const cipher = createDecipheriv('aes-128-cbc', aesKey, iv);
  const plaintext = Buffer.concat([cipher.update(data.subarray(0, -64)), cipher.final()]);
  if (!plaintext.subarray(0, 8).equals(iv.subarray(0, 8))) {
    return;
  }
  return plaintext.subarray(8);
}