import { decryptFromKeyStoreJson, encryptToKeyStoreJson, KeyStoreJson } from './index.js';
import { EthAddress } from '@aztec/foundation';

const staticTests: { json: KeyStoreJson; password: string; priv: string }[] = [
  {
    json: {
      crypto: {
        cipher: 'aes-128-ctr',
        cipherparams: {
          iv: '83dbcc02d8ccb40e466191a123791e0e',
        },
        ciphertext: 'd172bf743a674da9cdad04534d56926ef8358534d458fffccd4e6ad2fbde479c',
        kdf: 'scrypt',
        kdfparams: {
          dklen: 32,
          n: 262144,
          r: 1,
          p: 8,
          salt: 'ab0c7876052600dd703518d6fc3fe8984592145b591fc8fb5c6d43190334ba19',
        },
        mac: '2103ac29920d71da29f15d75b4a16dbe95cfd7ff8faea1056c33131d846e3097',
      },
      address: '0000000000000000000000000000000000000000',
      id: '3198bc9c-6672-5ab3-d995-4942343ae5b6',
      version: 3,
    },
    password: 'testpassword',
    priv: '7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d',
  },
  {
    json: {
      crypto: {
        cipher: 'aes-128-ctr',
        cipherparams: {
          iv: 'e0c41130a323adc1446fc82f724bca2f',
        },
        ciphertext: '9517cd5bdbe69076f9bf5057248c6c050141e970efa36ce53692d5d59a3984',
        kdf: 'scrypt',
        kdfparams: {
          dklen: 32,
          n: 2,
          r: 8,
          p: 1,
          salt: '711f816911c92d649fb4c84b047915679933555030b3552c1212609b38208c63',
        },
        mac: 'd5e116151c6aa71470e67a7d42c9620c75c4d23229847dcc127794f0732b0db5',
      },
      address: '0000000000000000000000000000000000000000',
      id: 'fecfc4ce-e956-48fd-953b-30f8b52ed66c',
      version: 3,
    },
    password: 'foo',
    priv: 'fa7b3db73dc7dfdf8c5fbdb796d741e4488628c41fc4febd9160a866ba0f35',
  },
  {
    json: {
      crypto: {
        cipher: 'aes-128-ctr',
        cipherparams: {
          iv: '3ca92af36ad7c2cd92454c59cea5ef00',
        },
        ciphertext: '108b7d34f3442fc26ab1ab90ca91476ba6bfa8c00975a49ef9051dc675aa',
        kdf: 'scrypt',
        kdfparams: {
          dklen: 32,
          n: 2,
          r: 8,
          p: 1,
          salt: 'd0769e608fb86cda848065642a9c6fa046845c928175662b8e356c77f914cd3b',
        },
        mac: '75d0e6759f7b3cefa319c3be41680ab6beea7d8328653474bd06706d4cc67420',
      },
      address: '0000000000000000000000000000000000000000',
      id: 'a37e1559-5955-450d-8075-7b8931b392b2',
      version: 3,
    },
    password: 'foo',
    priv: '81c29e8142bb6a81bef5a92bda7a8328a5c85bb2f9542e76f9b0f94fc018',
  },
  {
    json: {
      crypto: {
        cipher: 'aes-128-ctr',
        cipherparams: {
          iv: '6087dab2f9fdbbfaddc31a909735c1e6',
        },
        ciphertext: '5318b4d5bcd28de64ee5559e671353e16f075ecae9f99c7a79a38af5f869aa46',
        kdf: 'pbkdf2',
        kdfparams: {
          c: 262144,
          dklen: 32,
          prf: 'hmac-sha256',
          salt: 'ae3cd4e7013836a3df6bd7241b12db061dbe2c6785853cce422d148a624ce0bd',
        },
        mac: '517ead924a9d0dc3124507e3393d175ce3ff7c1e96529c6c555ce9e51205e9b2',
      },
      address: '0000000000000000000000000000000000000000',
      id: '3198bc9c-6672-5ab3-d995-4942343ae5b6',
      version: 3,
    },
    password: 'testpassword',
    priv: '7a28b5ba57c53603b0b07b56bba752f7784bf506fa95edc395f5cf6c7514fe9d',
  },
];

describe('utils', () => {
  describe('encryption', () => {
    staticTests.forEach(test => {
      it('encrypt staticTests and compare to keystore', async () => {
        const { n, p, r } = test.json.crypto.kdfparams as any;
        const keystore = await encryptToKeyStoreJson(Buffer.from(test.priv, 'hex'), EthAddress.ZERO, test.password, {
          id: test.json.id,
          iv: Buffer.from(test.json.crypto.cipherparams.iv, 'hex'),
          kdf: test.json.crypto.kdf as any,
          salt: Buffer.from(test.json.crypto.kdfparams.salt, 'hex'),
          n,
          p,
          r,
        });
        expect(keystore).toEqual(test.json);
      }, 30000);
    });

    staticTests.forEach(test => {
      it('decrypt staticTests and compare to private key', async () => {
        const privateKey = await decryptFromKeyStoreJson(test.json, test.password);
        expect(privateKey).toEqual(Buffer.from(test.priv, 'hex'));
      }, 30000);
    });
  });
});
