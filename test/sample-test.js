const {expect} = require('chai');
const {ethers} = require('hardhat');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');


/**
 * Hash tokens for merkle tree construction.
 * @param {string} account - Address.
 * @param {int} quantity - Max allowed to mint.
 * @return {buffer} keccak256 hash.
 */
function hashToken(account, quantity) {
  const hash = ethers.utils.solidityKeccak256(['address', 'uint256'],
      [account, quantity]).slice(2);
  return Buffer.from(hash, 'hex');
}


describe('PMV', function() {
  let pmv;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr5;
  let validTree;


  beforeEach(async function() {
    const PMV = await ethers.getContractFactory('PMV');

    [owner, addr1, addr2, addr3, addr5] = await ethers.getSigners();

    const merkleEntries = [[owner.address, 1],
      [addr1.address, 1],
      [addr2.address, 1],
      [addr3.address, 1]];

    const hashes = merkleEntries.map((token) => hashToken(...token));
    validTree = new MerkleTree(hashes, keccak256, {sortPairs: true});
    const root = validTree.getHexRoot();
    pmv = await PMV.connect(owner).deploy(root, 'https://my-json-server.typicode.com/freddyaboulton/pmv-token/tokens/');
    await pmv.deployed();
  });

  describe('Whitelist tests', function() {
    it('Should return the total supply', async function() {
      expect(await pmv.maxSupply()).to.equal(10);
    });

    it('Should let accounts on whitelist mint', async function() {
      let proof = validTree.getHexProof(hashToken(addr1.address, 1));
      await pmv.connect(addr1).mint(1, proof, {
        value: ethers.BigNumber.from('20000000000000000'),
      });

      proof = validTree.getHexProof(hashToken(addr2.address, 1));
      await pmv.connect(addr2).mint(1, proof, {
        value: ethers.BigNumber.from('20000000000000000'),
      });
      expect(await pmv.balanceOf(addr1.address)).to.equal(1);
      expect(await pmv.balanceOf(addr2.address)).to.equal(1);
      amount = await pmv.provider.getBalance(pmv.address);
      expect(amount).to.equal('40000000000000000');
    });

    it('Should not let accounts not on whitelist mint', async function() {
      try {
        const proof = validTree.getHexProof(hashToken(addr5.address, 1));
        await pmv.connect(addr5).mint(1, proof);
        expect(false).to.be.true;
      } catch (error) {
        expect(true).to.be.true;
      }
    });

    it('Should not let those on whitelist mint more or less than allowed',
        async function() {
          try {
            const proof = validTree.getHexProof(hashToken(addr1.address, 2));
            await pmv.connect(addr1).mint(2, proof);
            expect(false).to.be.true;
          } catch (error) {
            expect(true).to.be.true;
          }

          try {
            const proof = validTree.getHexProof(hashToken(addr2.address, 0));
            await pmv.connect(addr2).mint(0, proof);
            expect(false).to.be.true;
          } catch (error) {
            expect(true).to.be.true;
          }
        });
  });
});
