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

    const merkleEntries = [[owner.address, 2],
      [addr1.address, 2],
      [addr2.address, 2],
      [addr3.address, 3]];


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

    it('Should not let users mintPresale when presale is not active',
        async function() {
          const proof = validTree.getHexProof(hashToken(addr1.address, 1));
          try {
            await pmv.connect(addr1).mintPresale(2, proof, 1, {
              value: ethers.BigNumber.from('20000000000000000'),
            });
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('PRESALE NOT ACTIVE');
          }
        });

    it('Should not let non-owners change the presale satus', async function() {
      try {
        await pmv.connect(addr1).setPresale(false);
        expect(false).to.be.true;
      } catch (error) {
        expect(error.message).to.contain('caller is not the owner');
      }
    });

    it('Should let accounts on whitelist mint', async function() {
      await pmv.connect(owner).setPresale(true);
      let proof = validTree.getHexProof(hashToken(addr1.address, 2));
      await pmv.connect(addr1).mintPresale(2, proof, 2, {
        value: ethers.BigNumber.from('40000000000000000'),
      });

      proof = validTree.getHexProof(hashToken(addr2.address, 2));
      await pmv.connect(addr2).mintPresale(2, proof, 1, {
        value: ethers.BigNumber.from('20000000000000000'),
      });
      expect(await pmv.balanceOf(addr1.address)).to.equal(2);
      expect(await pmv.balanceOf(addr2.address)).to.equal(1);
      amount = await pmv.provider.getBalance(pmv.address);
      expect(amount).to.equal('60000000000000000');
    });

    it('Should let whitelisted users mint allowance in multiple transactions',
        async function() {
          await pmv.connect(owner).setPresale(true);
          const proof = validTree.getHexProof(hashToken(addr3.address, 3));
          await pmv.connect(addr3).mintPresale(3, proof, 2, {
            value: ethers.BigNumber.from('40000000000000000'),
          });
          await pmv.connect(addr3).mintPresale(3, proof, 1, {
            value: ethers.BigNumber.from('20000000000000000'),
          });
          expect(await pmv.balanceOf(addr3.address)).to.equal(3);
        });

    it('Should not let accounts not on whitelist mint', async function() {
      await pmv.connect(owner).setPresale(true);
      try {
        const proof = validTree.getHexProof(hashToken(addr5.address, 1));
        await pmv.connect(addr5).mintPresale(1, proof, 1, {
          value: ethers.BigNumber.from('20000000000000000'),
        });
        expect(false).to.be.true;
      } catch (error) {
        expect(error.message).to.contain('NOT ON WHITELIST');
      }
    });

    it('Should not let those on whitelist mint more than allowed',
        async function() {
          await pmv.connect(owner).setPresale(true);
          // Mint more than allowed in a single transaction
          try {
            const proof = validTree.getHexProof(hashToken(addr1.address, 2));
            await pmv.connect(addr1).mintPresale(2, proof, 3, {
              value: ethers.BigNumber.from('60000000000000000'),
            });
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
          }
          // Mint more than allowed in a single transaction
          try {
            const proof = validTree.getHexProof(hashToken(addr2.address, 2));
            await pmv.connect(addr2).mintPresale(2, proof, 4, {
              value: ethers.BigNumber.from('80000000000000000'),
            });
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
          }
          // Mint more than allowed in multiple transactions
          const proof = validTree.getHexProof(hashToken(addr3.address, 3));
          await pmv.connect(addr3).mintPresale(3, proof, 1, {
            value: ethers.BigNumber.from('20000000000000000'),
          });

          try {
            await pmv.connect(addr3).mintPresale(3, proof, 3, {
              value: ethers.BigNumber.from('60000000000000000'),
            });
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
          }
        });
  });
});
