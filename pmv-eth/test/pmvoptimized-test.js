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


describe('PMVOptimized', function() {
  let pmv;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr5;
  let addr6;
  let addr7;
  let validTree;


  beforeEach(async function() {
    const PMVOptimized = await ethers.getContractFactory('PMVOptimized');

    [owner, addr1, addr2, addr3,
      addr5, addr6, addr7] = await ethers.getSigners();

    const merkleEntries = [[owner.address, 2],
      [addr1.address, 2],
      [addr2.address, 2],
      [addr3.address, 3]];


    const hashes = merkleEntries.map((token) => hashToken(...token));
    validTree = new MerkleTree(hashes, keccak256, {sortPairs: true});
    const root = validTree.getHexRoot();
    pmv = await PMVOptimized.connect(owner).deploy(root, 'https://not-real-uri.com/');
    await pmv.deployed();
  });

  describe('Whitelist tests', function() {
    it('Should return the total supply', async function() {
      expect(await pmv.maxSupply()).to.equal(30);
    });

    it('Should let users view presale and sale status', async function() {
      expect(await pmv.presaleActive()).to.be.false;
      await pmv.connect(owner).setPresale(true);
      expect(await pmv.presaleActive()).to.be.true;

      expect(await pmv.saleActive()).to.be.false;
      await pmv.connect(owner).setSale(true);
      expect(await pmv.saleActive()).to.be.true;
    });

    it('Should let the owner change the root', async function() {
      const newEntries = [[owner.address, 1],
        [addr1.address, 1],
      ];
      const newHashes = newEntries.map((token) => hashToken(...token));
      tree = new MerkleTree(newHashes, keccak256, {sortPairs: true});
      const newRoot = tree.getHexRoot();
      await pmv.connect(owner).setRoot(newRoot);
      expect(await pmv.connect(addr1).root()).to.equal(newRoot);
    });

    it('Should not let non-owners change the root', async function() {
      const newEntries = [[owner.address, 1],
        [addr1.address, 1],
      ];
      const newHashes = newEntries.map((token) => hashToken(...token));
      tree = new MerkleTree(newHashes, keccak256, {sortPairs: true});
      const newRoot = tree.getHexRoot();
      try {
        await pmv.connect(addr1).setRoot(newRoot);
        expect(false).to.be.true;
      } catch (error) {
        expect(error.message).to.contain('caller is not the owner');
      }
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

    it('Should not let users mint when sale not active',
        async function() {
          try {
            await pmv.connect(addr1).mint(2, {
              value: ethers.BigNumber.from('20000000000000000'),
            });
          } catch (error) {
            expect(error.message).to.contain('SALE NOT ACTIVE');
          }
        });

    it('Should not let users mint when sale and presale active',
        async function() {
          pmv.connect(owner).setPresale(true);
          pmv.connect(owner).setSale(true);
          try {
            await pmv.connect(addr1).mint(2, {
              value: ethers.BigNumber.from('20000000000000000'),
            });
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('PRESALE ONLY RIGHT NOW');
          }
          try {
            const proof = validTree.getHexProof(hashToken(addr1.address, 1));
            await pmv.connect(addr1).mintPresale(2, proof, 1, {
              value: ethers.BigNumber.from('20000000000000000'),
            });
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('SALE ACTIVE RIGHT NOW');
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

    it('Should not let non-owners change the sale satus', async function() {
      try {
        await pmv.connect(addr2).setSale(true);
        expect(false).to.be.true;
      } catch (error) {
        expect(error.message).to.contain('caller is not the owner');
      }
    });

    it('Should not let non-owners set URI status', async function() {
      try {
        await pmv.connect(addr1).setURIStatus(true, 'https://malicious-domain.org');
        expect(false).to.be.true;
      } catch (error) {
        expect(error.message).to.contain('caller is not the owner');
      }
    });

    it('Should let owner set URI status', async function() {
      await pmv.connect(owner).setURIStatus(true, 'https://the-real-doman.org');
    });

    it('Should not let owners set URI to empty string', async function() {
      try {
        await pmv.connect(owner).setURIStatus(true, '');
        expect(false).to.be.true;
      } catch (error) {
        expect(error.message).to.contain('_tokenBaseURI is empty');
      }
    });

    it('Should let accounts on whitelist mint and not reveal metadata',
        async function() {
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
          expect(await pmv.ownerOf(1)).to.equal(addr1.address);
          expect(await pmv.ownerOf(2)).to.equal(addr1.address);
          expect(await pmv.balanceOf(addr2.address)).to.equal(1);
          expect(await pmv.ownerOf(3)).to.equal(addr2.address);

          amount = await pmv.provider.getBalance(pmv.address);
          expect(amount).to.equal('60000000000000000');

          // Check the metadata is not revealed yet
          for (let i = 1; i < 4; i++) {
            expect(await pmv.tokenURI(i)).to.equal('https://not-real-uri.com/');
          }
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
          for (let i = 1; i < 4; i++) {
            expect(await pmv.ownerOf(i)).to.equal(addr3.address);
          }
        });

    it('Should show right metadata after reveal',
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
          await pmv.connect(owner).setURIStatus(true, 'https://the-real-doman.org/');
          for (let i = 1; i < 4; i++) {
            expect(await pmv.tokenURI(i)).to.equal(`https://the-real-doman.org/${i}`);
          }
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

    it('Should not let users mint if they do not send enough eth',
        async function() {
          await pmv.connect(owner).setSale(true);
          try {
            await pmv.connect(addr6).mint(5, {
              value: ethers.BigNumber.from('80000000000000000'),
            });
            expect(false).to.be(true);
          } catch (error) {
            expect(error.message).to.contain('INCORRECT PAYMENT AMOUNT');
          }
        });

    it('Should let users mint after presale and not reveal metadata',
        async function() {
          await pmv.connect(owner).setSale(true);

          await pmv.connect(addr6).mint(5, {
            value: ethers.BigNumber.from('100000000000000000'),
          });
          expect(await pmv.balanceOf(addr6.address)).to.equal(5);

          for (let i = 1; i < 6; i++) {
            expect(await pmv.tokenURI(i)).to.equal('https://not-real-uri.com/');
          }
        });

    it('Should not let users mint more than maxSupply',
        async function() {
          await pmv.connect(owner).setSale(true);

          await pmv.connect(addr7).mint(10, {
            value: ethers.BigNumber.from('200000000000000000'),
          });
          expect(await pmv.balanceOf(addr7.address)).to.equal(10);
          expect(await pmv.ownerOf(9)).to.equal(addr7.address);

          await pmv.connect(addr1).mint(10, {
            value: ethers.BigNumber.from('200000000000000000'),
          });
          expect(await pmv.balanceOf(addr1.address)).to.equal(10);
          expect(await pmv.ownerOf(17)).to.equal(addr1.address);

          await pmv.connect(addr2).mint(7, {
            value: ethers.BigNumber.from('140000000000000000'),
          });
          expect(await pmv.balanceOf(addr2.address)).to.equal(7);
          expect(await pmv.ownerOf(24)).to.equal(addr2.address);

          try {
            await pmv.connect(addr6).mint(5, {
              value: ethers.BigNumber.from('100000000000000000'),
            });
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('NOT ENOUGH LEFT IN STOCK');
          }

          await pmv.connect(owner).mint(2, {
            value: ethers.BigNumber.from('40000000000000000'),
          });
          expect(await pmv.balanceOf(owner.address)).to.equal(2);

          try {
            await pmv.connect(addr5).mint(2, {
              value: ethers.BigNumber.from('40000000000000000'),
            });
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('NOT ENOUGH LEFT IN STOCK');
          }

          await pmv.connect(addr3).mint(1, {
            value: ethers.BigNumber.from('20000000000000000'),
          });
          expect(await pmv.balanceOf(addr3.address)).to.equal(1);
          expect(await pmv.ownerOf(30)).to.equal(addr3.address);

          maxSupply = await pmv.connect(owner).maxSupply();
          for (let i = 1; i < maxSupply; i++) {
            expect(await pmv.tokenURI(i)).to.equal('https://not-real-uri.com/');
          }

          await pmv.connect(owner).setURIStatus(true, 'https://the-real-doman.org/');
          for (let i = 1; i < maxSupply; i++) {
            expect(await pmv.tokenURI(i)).to.equal(`https://the-real-doman.org/${i}`);
          }

          expect(await pmv.totalSupply()).to.equal(maxSupply);
        });

    it('Should not let users mint more than maxPerWallet',
        async function() {
          await pmv.connect(owner).setSale(true);

          try {
            await pmv.connect(addr2).mint(12, {
              value: ethers.BigNumber.from('240000000000000000'),
            });
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
          }

          await pmv.connect(addr2).mint(7, {
            value: ethers.BigNumber.from('140000000000000000'),
          });
          expect(await pmv.balanceOf(addr2.address)).to.equal(7);

          try {
            await pmv.connect(addr2).mint(5, {
              value: ethers.BigNumber.from('100000000000000000'),
            });
            expect(false).to.equal(true);
          } catch (error) {
            expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
          }

          await pmv.connect(addr2).mint(3, {
            value: ethers.BigNumber.from('60000000000000000'),
          });
          expect(await pmv.balanceOf(addr2.address)).to.equal(10);
        });

    it('Should not let maxPerWallet interfere with presale amount minted',
        async function() {
          await pmv.connect(owner).setPresale(true);
          const proof = validTree.getHexProof(hashToken(addr3.address, 3));
          await pmv.connect(addr3).mintPresale(3, proof, 3, {
            value: ethers.BigNumber.from('60000000000000000'),
          });
          expect(await pmv.balanceOf(addr3.address)).to.equal(3);
          await pmv.connect(owner).setSale(true);
          await pmv.connect(owner).setPresale(false);

          await pmv.connect(addr3).mint(10, {
            value: ethers.BigNumber.from('200000000000000000'),
          });

          expect(await pmv.balanceOf(addr3.address)).to.equal(13);
        });

    it('Should let users mint after presale and not reveal metadata',
        async function() {
          await pmv.connect(owner).setSale(true);

          await pmv.connect(addr6).mint(5, {
            value: ethers.BigNumber.from('100000000000000000'),
          });
          expect(await pmv.balanceOf(addr6.address)).to.equal(5);

          for (let i = 1; i < 6; i++) {
            expect(await pmv.tokenURI(i)).to.equal('https://not-real-uri.com/');
          }
        });

    it('Should let owner withdraw balance',
        async function() {
          await pmv.connect(owner).setSale(true);

          await pmv.connect(addr7).mint(10, {
            value: ethers.BigNumber.from('200000000000000000'),
          });
          expect(await pmv.balanceOf(addr7.address)).to.equal(10);

          await pmv.connect(addr1).mint(10, {
            value: ethers.BigNumber.from('200000000000000000'),
          });
          expect(await pmv.balanceOf(addr1.address)).to.equal(10);

          await pmv.connect(addr2).mint(7, {
            value: ethers.BigNumber.from('140000000000000000'),
          });
          expect(await pmv.balanceOf(addr2.address)).to.equal(7);

          const tx = await pmv.connect(owner).withdraw();
          const expectedAmount = ethers.BigNumber.from('540000000000000000');
          expect(tx).to.changeEtherBalance(owner, expectedAmount);
        });

    it('Should not let non-owner withdraw balance',
        async function() {
          await pmv.connect(owner).setSale(true);

          await pmv.connect(addr7).mint(10, {
            value: ethers.BigNumber.from('200000000000000000'),
          });

          try {
            await pmv.connect(addr3).withdraw();
            expect(false).to.be.true;
          } catch (error) {
            expect(error.message).to.contain('caller is not the owner');
          }
        });
  });
});
