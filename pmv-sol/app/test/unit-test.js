import {expect} from 'chai';
import {verify, makeMessage} from '../verify.js';
import {personalSign} from '@metamask/eth-sig-util';


describe('verify', function() {
  let publicKey1;
  let privateKey1;
  let privateKey2;

  beforeEach(async function() {
    publicKey1 = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
    privateKey1 = Buffer.from(
        'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        'hex',
    );
    privateKey2 = Buffer.from(
        '59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        'hex',
    );
  });

  it('Should correctly verify', function() {
    const signature = personalSign(
        {privateKey: privateKey1,
          data: makeMessage(publicKey1)});
    expect(verify(signature, publicKey1)).to.be.true;
  });

  it('Should not verify invalid signatures', function() {
    const signature = personalSign({privateKey: privateKey2,
      data: makeMessage(privateKey2)});
    expect(verify(signature, publicKey1));
  });
});
