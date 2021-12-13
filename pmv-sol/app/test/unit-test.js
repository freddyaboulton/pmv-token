import {expect} from 'chai';
import {verify, makeMessage} from '../verify.js';
import {personalSign} from '@metamask/eth-sig-util';
import {isValidEthAddress} from '../validators.js';


describe('verify', function() {
  let publicKey1;
  let privateKey1;
  let privateKey2;
  let publicKey1CheckSum;

  beforeEach(async function() {
    publicKey1 = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

    publicKey1CheckSum = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

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
          data: makeMessage()});
    expect(verify(signature, publicKey1CheckSum)).to.be.true;
  });

  it('Should not verify invalid signatures', function() {
    const signature = personalSign({privateKey: privateKey2,
      data: makeMessage()});
    expect(verify(signature, publicKey1CheckSum));
  });

  it('Should verify checkSummed/not checksummed eth addresses', function() {
    expect(isValidEthAddress(publicKey1)).to.be.true;
    expect(isValidEthAddress(publicKey1CheckSum)).to.be.true;
    const checkSumAddress = '0x9De6405C0C7512ee94BCB79B860668a52aa7FAd2';
    expect(isValidEthAddress(checkSumAddress)).to.be.true;
  });
});
