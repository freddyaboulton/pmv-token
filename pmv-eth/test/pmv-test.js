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


describe('PMV ETH Tests', function() {
  let pmv;
  let pmvOptimized;
  let contracts;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr5;
  let addr6;
  let addr7;
  let addr8;
  let validTree;
  let minter;
  let multiSigWallet;


  beforeEach(async function() {
    const PMV = await ethers.getContractFactory('PMV');
    const PMVOptimized = await ethers.getContractFactory('PMVOptimized');
    const Minter = await ethers.getContractFactory('Minter');

    const linkToken = '0x01BE23585060835E02B77ef475b0Cc51aA1e0709';
    const vrfCoordinator = '0x6168499c0cFfCaCD319c818142124B7A15E857ab';
    const keyHash =
      '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc';
    const linkFee = '250000000000000000';
    // dummy provenance hash
    const provenanceHash =
      '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc';

    [owner, addr1, addr2, addr3,
      addr5, addr6, addr7, addr8] = await ethers.getSigners();

    multiSigWallet = addr8.address;

    const merkleEntries = [[owner.address, 2],
      [addr1.address, 2],
      [addr2.address, 2],
      [addr3.address, 3]];

    const hashes = merkleEntries.map((token) => hashToken(...token));
    validTree = new MerkleTree(hashes, keccak256, {sortPairs: true});
    const root = validTree.getHexRoot();

    const freeMints = [[addr1.address, 2],
      [addr5.address, 2],
      [addr6.address, 2],
      [addr7.address, 3]];

    const freeHashes = freeMints.map((token) => hashToken(...token));
    freeTree = new MerkleTree(freeHashes, keccak256, {sortPairs: true});
    const rootMintFree = freeTree.getHexRoot();

    pmv = await PMV.connect(owner).deploy(root, 'https://not-real-uri.com/', rootMintFree,
        provenanceHash, vrfCoordinator, linkToken, keyHash, linkFee,
        multiSigWallet);
    await pmv.deployed();
    await pmv.connect(owner).setOwnerMintBuffer(0);
    await pmv.connect(owner).ownerMint(1);

    pmvOptimized = await PMVOptimized.connect(owner).deploy(root, 'https://not-real-uri.com/', rootMintFree,
        provenanceHash, vrfCoordinator, linkToken, keyHash, linkFee,
        multiSigWallet);
    await pmvOptimized.deployed();
    await pmvOptimized.connect(owner).setOwnerMintBuffer(0);
    await pmvOptimized.connect(owner).ownerMint(1);

    minter = await Minter.connect(owner).deploy();
    await minter.deployed();
    contracts = [pmv, pmvOptimized];
  });

  describe('allowlist tests', function() {
    const testCases = [{name: 'PMVOptimized', index: 1},
      {name: 'PMV', index: 0}];

    testCases.forEach(function(test) {
      it(`${test.name}: Should return the total supply`, async function() {
        const contract = contracts[test.index];
        expect(await contract.maxSupply()).to.equal(30);
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should return the provenance hash`, async function() {
        const contract = contracts[test.index];
        expect(await contract.provenanceHash()).to.equal(
            '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc', // eslint-disable-line max-len
        );
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should return the offset`, async function() {
        const contract = contracts[test.index];
        expect(await contract.offset()).to.be.equal(0);
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should return the multiSigWallet`, async function() {
        const contract = contracts[test.index];
        expect(await contract.multiSigWallet()).to.be.equal(multiSigWallet);
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should mint first token on init`, async function() {
        const contract = contracts[test.index];
        expect(await contract.totalSupply()).to.be.equal(1);
        expect(await contract.ownerOf(1)).to.be.equal(multiSigWallet);
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let users view presale and sale status`,
          async function() {
            const contract = contracts[test.index];
            expect(await contract.presaleActive()).to.be.false;
            await contract.connect(owner).setPresale(true);
            expect(await contract.presaleActive()).to.be.true;

            expect(await contract.saleActive()).to.be.false;
            await contract.connect(owner).setSale(true);
            expect(await contract.saleActive()).to.be.true;
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let the owner change the root`,
          async function() {
            const contract = contracts[test.index];
            const newEntries = [[owner.address, 1],
              [addr1.address, 1],
            ];
            const newHashes = newEntries.map((token) => hashToken(...token));
            tree = new MerkleTree(newHashes, keccak256, {sortPairs: true});
            const newRoot = tree.getHexRoot();
            await contract.connect(owner).setRoot(newRoot);
            expect(await contract.connect(addr1).root()).to.equal(newRoot);
            await contract.connect(owner).setRootMintFree(newRoot);
            expect(await contract.connect(addr1).root()).to.equal(newRoot);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners change the root`,
          async function() {
            const contract = contracts[test.index];
            const newEntries = [[owner.address, 1],
              [addr1.address, 1],
            ];
            const newHashes = newEntries.map((token) => hashToken(...token));
            tree = new MerkleTree(newHashes, keccak256, {sortPairs: true});
            const newRoot = tree.getHexRoot();
            try {
              await contract.connect(addr1).setRoot(newRoot);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
            try {
              await contract.connect(addr1).setRootMintFree(newRoot);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners change the ownerMintBuffer`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(addr1).setOwnerMintBuffer(30);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners change the prices`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(addr1).setPrice(
                  ethers.BigNumber.from('87000000000000000'));
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
            try {
              await contract.connect(addr1).setPresalePrice(
                  ethers.BigNumber.from('90000000000000000'));
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners change the maxPerTransaction`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(addr1).setMaxPerTransaction(30);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let owner set zero maxPerTransaction`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(owner).setMaxPerTransaction(0);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain(
                  'maxPerTransaction should be positive');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let users
          mintPresale when presale is not active`,
      async function() {
        const contract = contracts[test.index];
        const proof = validTree.getHexProof(hashToken(addr1.address, 1));
        try {
          await contract.connect(addr1).mintPresale(2, proof, 1, {
            value: ethers.BigNumber.from('77000000000000000'),
          });
          expect(false).to.be.true;
        } catch (error) {
          expect(error.message).to.contain('PRESALE NOT ACTIVE');
        }
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let users
          mintFree when not allowed`,
      async function() {
        const contract = contracts[test.index];
        const proof = validTree.getHexProof(hashToken(addr5.address, 2));
        try {
          await contract.connect(addr5).mintFree(2, proof, 1);
          expect(false).to.be.true;
        } catch (error) {
          expect(error.message).to.contain('Free mint not allowed');
        }
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let users mint when sale not active`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(addr1).mint(2, {
                value: ethers.BigNumber.from('200000000000000000'),
              });
            } catch (error) {
              expect(error.message).to.contain('SALE NOT ACTIVE');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let users mint when sale and presale active`,
          async function() {
            const contract = contracts[test.index];
            contract.connect(owner).setPresale(true);
            contract.connect(owner).setSale(true);
            try {
              await contract.connect(addr1).mint(2, {
                value: ethers.BigNumber.from('200000000000000000'),
              });
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('PRESALE ONLY RIGHT NOW');
            }
            try {
              const proof = validTree.getHexProof(hashToken(addr1.address, 1));
              await contract.connect(addr1).mintPresale(2, proof, 1, {
                value: ethers.BigNumber.from('200000000000000000'),
              });
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('SALE ACTIVE RIGHT NOW');
            }
          });
    });


    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners change the presale satus`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(addr1).setPresale(false);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });


    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners 
        change the freeMintAllowed satus`,
      async function() {
        const contract = contracts[test.index];
        try {
          await contract.connect(addr1).setFreeMintAllowed(false);
          expect(false).to.be.true;
        } catch (error) {
          expect(error.message).to.contain('caller is not the owner');
        }
      });
    });


    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners change the sale satus`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(addr2).setSale(true);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners set URI status`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(addr1).setURIStatus(true, 'https://malicious-domain.org');
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let owner set URI status`, async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setURIStatus(true, 'https://the-real-doman.org');
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners call ownerMint`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(addr1).ownerMint(10);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let owner set letContractMint`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setLetContractMint(true);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owners call letContractMint`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(addr1).setLetContractMint(true);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let owner call ownerMint`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).ownerMint(3);
            expect(await contract.balanceOf(multiSigWallet)).to.equal(4);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let contracts mint by default`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);
            await minter.setPMVAddress(contract.address);
            try {
              await minter.connect(owner).mint({
                value: ethers.BigNumber.from('200000000000000000'),
              });
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain(
                  'CONTRACT NOT ALLOWED TO MINT IN PUBLIC SALE');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let contracts mint if owner allows`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);
            await contract.connect(owner).setLetContractMint(true);
            await minter.setPMVAddress(contract.address);
            await minter.connect(owner).mint({
              value: ethers.BigNumber.from('200000000000000000'),
            });
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let owners set URI to empty string`,
          async function() {
            const contract = contracts[test.index];
            try {
              await contract.connect(owner).setURIStatus(true, '');
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('_tokenBaseURI is empty');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let accounts on allowlist
      mint and not reveal metadata`,
      async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setPresale(true);
        await contract.connect(owner).setFreeMintAllowed(true);
        let proof = validTree.getHexProof(hashToken(addr1.address, 2));
        await contract.connect(addr1).mintPresale(2, proof, 2, {
          value: ethers.BigNumber.from('154000000000000000'),
        });

        proof = validTree.getHexProof(hashToken(addr2.address, 2));
        await contract.connect(addr2).mintPresale(2, proof, 1, {
          value: ethers.BigNumber.from('77000000000000000'),
        });
        expect(await contract.balanceOf(addr1.address)).to.equal(2);
        expect(await contract.ownerOf(2)).to.equal(addr1.address);
        expect(await contract.ownerOf(3)).to.equal(addr1.address);
        expect(await contract.balanceOf(addr2.address)).to.equal(1);
        expect(await contract.ownerOf(4)).to.equal(addr2.address);
        proof = freeTree.getHexProof(hashToken(addr5.address, 2));
        await contract.connect(addr5).mintFree(2, proof, 2);

        proof = freeTree.getHexProof(hashToken(addr6.address, 2));
        await contract.connect(addr6).mintFree(2, proof, 1);
        expect(await contract.balanceOf(addr5.address)).to.equal(2);
        expect(await contract.balanceOf(addr6.address)).to.equal(1);

        amount = await contract.provider.getBalance(contract.address);
        expect(amount).to.equal('231000000000000000');

        if (test.name == 'PMVOptimized') {
          console.log('Checking tokenOfOwnerByIndexOffChain');
          expect(
              await contract.tokenOfOwnerByIndexOffChain(
                  addr2.address, 0)).to.equal(4);
          expect(
              await contract.tokenOfOwnerByIndexOffChain(
                  addr1.address, 1)).to.equal(3);
          expect(
              await contract.tokenOfOwnerByIndexOffChain(
                  addr6.address, 0)).to.equal(7);
        }

        // Check the metadata is not revealed yet
        for (let i = 1; i < 8; i++) {
          expect(await contract.tokenURI(i)).to.equal('https://not-real-uri.com/');
        }
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let allowlisted users mint
      allowance in multiple transactions`,
      async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setPresale(true);
        const proof = validTree.getHexProof(hashToken(addr3.address, 3));
        await contract.connect(addr3).mintPresale(3, proof, 2, {
          value: ethers.BigNumber.from('154000000000000000'),
        });
        await contract.connect(addr3).mintPresale(3, proof, 1, {
          value: ethers.BigNumber.from('77000000000000000'),
        });
        expect(await contract.balanceOf(addr3.address)).to.equal(3);
        for (let i = 2; i < 5; i++) {
          expect(await contract.ownerOf(i)).to.equal(addr3.address);
        }
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should show right metadata after reveal`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setPresale(true);
            const proof = validTree.getHexProof(hashToken(addr3.address, 3));
            await contract.connect(addr3).mintPresale(3, proof, 2, {
              value: ethers.BigNumber.from('154000000000000000'),
            });
            await contract.connect(addr3).mintPresale(3, proof, 1, {
              value: ethers.BigNumber.from('77000000000000000'),
            });
            expect(await contract.balanceOf(addr3.address)).to.equal(3);
            await contract.connect(owner).setURIStatus(true, 'https://the-real-doman.org/');
            for (let i = 1; i < 5; i++) {
              expect(await contract.tokenURI(i)).to.equal(`https://the-real-doman.org/${i}`);
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let accounts not on allowlist mint`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setPresale(true);
            try {
              const proof = validTree.getHexProof(hashToken(addr5.address, 1));
              await contract.connect(addr5).mintPresale(1, proof, 1, {
                value: ethers.BigNumber.from('77000000000000000'),
              });
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('NOT ON ALLOWLIST');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let accounts not on free allowlist mint`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setFreeMintAllowed(true);
            try {
              const proof = freeTree.getHexProof(hashToken(addr1.address, 1));
              await contract.connect(addr1).mintFree(1, proof, 1);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('NOT ON FREE MINT ALLOWLIST');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let those on allowlist
      mint more than allowed`,
      async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setPresale(true);
        // Mint more than allowed in a single transaction
        try {
          const proof = validTree.getHexProof(hashToken(addr1.address, 2));
          await contract.connect(addr1).mintPresale(2, proof, 3, {
            value: ethers.BigNumber.from('231000000000000000'),
          });
          expect(false).to.be.true;
        } catch (error) {
          expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
        }
        // Mint more than allowed in a single transaction
        try {
          const proof = validTree.getHexProof(hashToken(addr2.address, 2));
          await contract.connect(addr2).mintPresale(2, proof, 4, {
            value: ethers.BigNumber.from('280000000000000000'),
          });
          expect(false).to.be.true;
        } catch (error) {
          expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
        }
        // Mint more than allowed in multiple transactions
        const proof = validTree.getHexProof(hashToken(addr3.address, 3));
        await contract.connect(addr3).mintPresale(3, proof, 1, {
          value: ethers.BigNumber.from('77000000000000000'),
        });

        try {
          await contract.connect(addr3).mintPresale(3, proof, 3, {
            value: ethers.BigNumber.from('231000000000000000'),
          });
          expect(false).to.be.true;
        } catch (error) {
          expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
        }
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let those on allowlist
      mint free more than allowed`,
      async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setFreeMintAllowed(true);
        await contract.connect(owner).setPresale(true);
        // Mint more than allowed in a single transaction
        try {
          const proof = freeTree.getHexProof(hashToken(addr1.address, 2));
          await contract.connect(addr1).mintFree(2, proof, 3);
          expect(false).to.be.true;
        } catch (error) {
          expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
        }
        // Mint more than allowed in multiple transactions
        // Mint presale first to make sure we properly
        // keep track of free vs presale mints
        const proofPresale = validTree.getHexProof(hashToken(addr1.address, 2));
        await contract.connect(addr1).mintPresale(2, proofPresale, 2, {
          value: ethers.BigNumber.from('154000000000000000'),
        });

        const proof = freeTree.getHexProof(hashToken(addr1.address, 2));
        await contract.connect(addr1).mintFree(2, proof, 1);

        try {
          await contract.connect(addr1).mintFree(2, proof, 3);
          expect(false).to.be.true;
        } catch (error) {
          expect(error.message).to.contain('MINTING MORE THAN ALLOWED');
        }

        await contract.connect(addr1).mintFree(2, proof, 1);
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let send eth for free mint`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setFreeMintAllowed(true);
            try {
              const proof = freeTree.getHexProof(hashToken(addr5.address, 2));
              await contract.connect(addr5).mintFree(2, proof, 2, {
                value: ethers.BigNumber.from('140000000000000000'),
              });
              expect(false).to.be(true);
            } catch (error) {
              expect(error.message).to.contain(
                  'non-payable method cannot override value');
            }
          });
    });


    testCases.forEach(function(test) {
      it(`${test.name}: Should not let users mint if 
          they do not send enough eth`,
      async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setSale(true);
        try {
          await contract.connect(addr6).mint(5, {
            value: ethers.BigNumber.from('80000000000000000'),
          });
          expect(false).to.be(true);
        } catch (error) {
          expect(error.message).to.contain('INCORRECT PAYMENT AMOUNT');
        }
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let users mint allowlist if 
          they do not send enough eth`,
      async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setPresale(true);
        try {
          const proofPresale = validTree.getHexProof(
              hashToken(addr1.address, 2));
          await contract.connect(addr1).mintPresale(2, proofPresale, 2, {
            value: ethers.BigNumber.from('20000009900000000'),
          });
          expect(false).to.be(true);
        } catch (error) {
          expect(error.message).to.contain('INCORRECT PAYMENT AMOUNT');
        }
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let users mint after
      presale and not reveal metadata`,
      async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setSale(true);

        await contract.connect(addr6).mint(5, {
          value: ethers.BigNumber.from('500000000000000000'),
        });
        expect(await contract.balanceOf(addr6.address)).to.equal(5);

        for (let i = 2; i < 7; i++) {
          expect(await contract.tokenURI(i)).to.equal('https://not-real-uri.com/');
        }
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let users mint more than maxSupply`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);

            await contract.connect(addr7).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });
            expect(await contract.balanceOf(addr7.address)).to.equal(10);
            expect(await contract.ownerOf(9)).to.equal(addr7.address);

            await contract.connect(addr1).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });
            expect(await contract.balanceOf(addr1.address)).to.equal(10);
            expect(await contract.ownerOf(17)).to.equal(addr1.address);

            await contract.connect(addr2).mint(6, {
              value: ethers.BigNumber.from('600000000000000000'),
            });
            expect(await contract.balanceOf(addr2.address)).to.equal(6);
            expect(await contract.ownerOf(24)).to.equal(addr2.address);

            try {
              await contract.connect(addr6).mint(5, {
                value: ethers.BigNumber.from('500000000000000000'),
              });
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('NOT ENOUGH LEFT IN STOCK');
            }

            await contract.connect(owner).mint(2, {
              value: ethers.BigNumber.from('200000000000000000'),
            });
            // because mint token 1 on init
            expect(await contract.balanceOf(owner.address)).to.equal(2);

            try {
              await contract.connect(addr5).mint(2, {
                value: ethers.BigNumber.from('200000000000000000'),
              });
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('NOT ENOUGH LEFT IN STOCK');
            }

            await contract.connect(addr3).mint(1, {
              value: ethers.BigNumber.from('100000000000000000'),
            });
            expect(await contract.balanceOf(addr3.address)).to.equal(1);
            expect(await contract.ownerOf(30)).to.equal(addr3.address);
            maxSupply = await contract.connect(owner).maxSupply();
            for (let i = 1; i <= maxSupply; i++) {
              expect(await contract.tokenURI(i)).to.equal('https://not-real-uri.com/');
            }
            await contract.connect(owner).setURIStatus(true, 'https://the-real-doman.org/');
            for (let i = 1; i <= maxSupply; i++) {
              expect(await contract.tokenURI(i)).to.equal(`https://the-real-doman.org/${i}`);
            }

            expect(await contract.totalSupply()).to.equal(maxSupply);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should enforce ownerMintBuffer for ownerMint`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);
            await contract.connect(owner).setOwnerMintBuffer(5);

            await contract.connect(addr7).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });

            await contract.connect(addr1).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });

            await contract.connect(addr2).mint(4, {
              value: ethers.BigNumber.from('400000000000000000'),
            });

            try {
              await contract.connect(owner).ownerMint(2);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('NOT ENOUGH LEFT IN STOCK');
            }
          });
    });


    testCases.forEach(function(test) {
      it(`${test.name}: Should enforce ownerMintBuffer for ownerMint pt 2`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setOwnerMintBuffer(25);

            try {
              await contract.connect(owner).ownerMint(10);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('NOT ENOUGH LEFT IN STOCK');
            }
            // Use 4 because we call ownerMint once in the pre-test hook
            await contract.connect(owner).ownerMint(4);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should enfore maxSupply for presaleMint`,
          async function() {
            const contract = contracts[test.index];
            const newEntries = [[owner.address, 10],
              [addr1.address, 10],
              [addr2.address, 9],
              [addr3.address, 2],
            ];
            const newHashes = newEntries.map((token) => hashToken(...token));
            tree = new MerkleTree(newHashes, keccak256, {sortPairs: true});
            const newRoot = tree.getHexRoot();
            await contract.connect(owner).setRoot(newRoot);
            await contract.connect(owner).setPresale(true);
            await contract.connect(owner).setFreeMintAllowed(true);

            let proof = tree.getHexProof(hashToken(addr1.address, 10));

            await contract.connect(addr1).mintPresale(10, proof, 10, {
              value: ethers.BigNumber.from('770000000000000000'),
            });

            proof = tree.getHexProof(hashToken(owner.address, 10));
            await contract.connect(owner).mintPresale(10, proof, 10, {
              value: ethers.BigNumber.from('770000000000000000'),
            });

            proof = tree.getHexProof(hashToken(addr2.address, 9));
            await contract.connect(addr2).mintPresale(9, proof, 8, {
              value: ethers.BigNumber.from('616000000000000000'),
            });

            proof = tree.getHexProof(hashToken(addr3.address, 2));

            try {
              await contract.connect(addr3).mintPresale(2, proof, 2, {
                value: ethers.BigNumber.from('154000000000000000'),
              });
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('NOT ENOUGH LEFT IN STOCK');
            }

            try {
              proof = freeTree.getHexProof(hashToken(addr5.address, 2));
              await contract.connect(addr5).mintFree(2, proof, 2);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('NOT ENOUGH LEFT IN STOCK');
            }
          });
    });


    testCases.forEach(function(test) {
      it(`${test.name}: Should not let users mint more than maxPerTransaction`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);

            try {
              await contract.connect(addr2).mint(12, {
                value: ethers.BigNumber.from('1200000000000000000'),
              });
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain(
                  'MINTING MORE THAN ALLOWED IN A SINGLE TRANSACTION');
            }

            await contract.connect(addr2).mint(7, {
              value: ethers.BigNumber.from('700000000000000000'),
            });
            expect(await contract.balanceOf(addr2.address)).to.equal(7);

            await contract.connect(addr2).mint(5, {
              value: ethers.BigNumber.from('500000000000000000'),
            });
            expect(await contract.balanceOf(addr2.address)).to.equal(12);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let maxPerTransaction 
      interfere with presale amount minted`,
      async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setPresale(true);
        const proof = validTree.getHexProof(hashToken(addr3.address, 3));
        await contract.connect(addr3).mintPresale(3, proof, 3, {
          value: ethers.BigNumber.from('231000000000000000'),
        });
        expect(await contract.balanceOf(addr3.address)).to.equal(3);
        await contract.connect(owner).setSale(true);
        await contract.connect(owner).setPresale(false);

        await contract.connect(addr3).mint(10, {
          value: ethers.BigNumber.from('1000000000000000000'),
        });

        expect(await contract.balanceOf(addr3.address)).to.equal(13);
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let users mint after 
      presale and not reveal metadata`,
      async function() {
        const contract = contracts[test.index];
        await contract.connect(owner).setSale(true);

        await contract.connect(addr6).mint(5, {
          value: ethers.BigNumber.from('500000000000000000'),
        });
        expect(await contract.balanceOf(addr6.address)).to.equal(5);

        for (let i = 1; i < 7; i++) {
          expect(await contract.tokenURI(i)).to.equal('https://not-real-uri.com/');
        }
      });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let owner withdraw balance`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);

            await contract.connect(addr7).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });
            expect(await contract.balanceOf(addr7.address)).to.equal(10);

            await contract.connect(addr1).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });
            expect(await contract.balanceOf(addr1.address)).to.equal(10);

            await contract.connect(addr2).mint(7, {
              value: ethers.BigNumber.from('700000000000000000'),
            });
            expect(await contract.balanceOf(addr2.address)).to.equal(7);

            const tx = await contract.connect(owner).withdraw();
            const expectedAmount = ethers.BigNumber.from('2700000000000000000');
            expect(tx).to.changeEtherBalance(addr8, expectedAmount);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let owner of token burn`,
          async function() {
            if (test.name == 'PMV') {
              return this.skip(); // eslint-disable-line no-invalid-this
            }
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);
            await contract.connect(owner).setAllowBurning(true);

            await contract.connect(addr7).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });
            expect(await contract.balanceOf(addr7.address)).to.equal(10);

            await contract.connect(addr7).burn(7);
            expect(await contract.balanceOf(addr7.address)).to.equal(9);
            // seventh index
            expect(await contract.tokenOfOwnerByIndexOffChain(
                addr7.address, 7)).to.equal(10);

            await contract.connect(addr1).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });
            expect(await contract.balanceOf(addr1.address)).to.equal(10);
            expect(await contract.totalSupply()).to.equal(20);
            expect(await contract.totalNonBurnedSupply()).to.equal(21);
            expect(await contract.tokenByIndexOffChain(17),
            ).to.equal(19);
            expect(await contract.tokenOfOwnerByIndexOffChain(
                addr1.address, 2)).to.equal(14);
            await contract.connect(addr1).burn(14);
            expect(await contract.tokenOfOwnerByIndexOffChain(
                addr1.address, 2)).to.equal(15);
            expect(await contract.tokenOfOwnerByIndexOffChain(
                addr1.address, 4)).to.equal(17);
            expect(await contract.tokenByIndexOffChain(17)).to.equal(20);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let owner of token burn pt2`,
          async function() {
            if (test.name == 'PMV') {
              return this.skip(); // eslint-disable-line no-invalid-this
            }
            const contract = contracts[test.index];
            await contract.connect(owner).setAllowBurning(true);
            await contract.connect(owner).setSale(true);

            await contract.connect(addr7).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });
            expect(await contract.balanceOf(addr7.address)).to.equal(10);

            await contract.connect(addr7).burn(7);
            await contract.connect(addr7).burn(5);
            expect(await contract.balanceOf(addr7.address)).to.equal(8);
            // seventh index
            expect(await contract.tokenOfOwnerByIndexOffChain(
                addr7.address, 7)).to.equal(11);

            await contract.connect(addr1).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });
            expect(await contract.balanceOf(addr1.address)).to.equal(10);
            expect(await contract.totalSupply()).to.equal(19);
            expect(await contract.totalNonBurnedSupply()).to.equal(21);
            expect(await contract.tokenByIndexOffChain(17),
            ).to.equal(20);
            expect(await contract.tokenOfOwnerByIndexOffChain(
                addr1.address, 2)).to.equal(14);
            await contract.connect(addr1).burn(14);
            expect(await contract.tokenOfOwnerByIndexOffChain(
                addr1.address, 2)).to.equal(15);
            expect(await contract.tokenOfOwnerByIndexOffChain(
                addr1.address, 4)).to.equal(17);
            expect(await contract.tokenByIndexOffChain(16)).to.equal(20);

            const tokensOf7 = await contract.tokensOfOwnerOffChain(
              addr7.address);
            expect(tokensOf7.length).to.equal(8);
            expect(tokensOf7[0]).to.equal(2);
            expect(tokensOf7[3]).to.equal(6);
            expect(tokensOf7[7]).to.equal(11);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owner withdraw balance`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);

            await contract.connect(addr7).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });

            try {
              await contract.connect(addr3).withdraw();
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let token owner burn by default`,
          async function() {
            if (test.name == 'PMV') {
              return this.skip(); // eslint-disable-line no-invalid-this
            }
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);

            await contract.connect(addr7).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });

            try {
              await contract.connect(addr7).burn(1);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('Burning not currently allowed');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should not let non-owner change burn permission`,
          async function() {
            if (test.name == 'PMV') {
              return this.skip(); // eslint-disable-line no-invalid-this
            }
            const contract = contracts[test.index];

            try {
              await contract.connect(addr7).setAllowBurning(true);
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain('caller is not the owner');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let owner change maxPerTransaction`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);

            await contract.connect(addr6).mint(10, {
              value: ethers.BigNumber.from('1000000000000000000'),
            });
            expect(await contract.balanceOf(addr6.address)).to.equal(10);

            await contract.connect(owner).setMaxPerTransaction(15);
            await contract.connect(addr6).mint(15, {
              value: ethers.BigNumber.from('1500000000000000000'),
            });
            expect(await contract.balanceOf(addr6.address)).to.equal(25);

            await contract.connect(owner).setMaxPerTransaction(3);
            try {
              await contract.connect(addr6).mint(4, {
                value: ethers.BigNumber.from('40000000000000000'),
              });
              expect(false).to.be.true;
            } catch (error) {
              expect(error.message).to.contain(
                  'MINTING MORE THAN ALLOWED IN A SINGLE TRANSACTION');
            }
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should let owner change prices`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setPresale(true);
            await contract.connect(owner).setPresalePrice(
                ethers.BigNumber.from('2000000000000000'));
            await contract.connect(owner).setPrice(
                ethers.BigNumber.from('2000000000000000'));
            const proof = validTree.getHexProof(hashToken(addr3.address, 3));
            await contract.connect(addr3).mintPresale(3, proof, 1, {
              value: ethers.BigNumber.from('2000000000000000'),
            });
            expect(await contract.balanceOf(addr3.address)).to.equal(1);
            await contract.connect(owner).setSale(true);
            await contract.connect(owner).setPresale(false);

            await contract.connect(addr3).mint(10, {
              value: ethers.BigNumber.from('20000000000000000'),
            });

            expect(await contract.balanceOf(addr3.address)).to.equal(11);
          });
    });

    testCases.forEach(function(test) {
      it(`${test.name}: Should list all tokens owned by address`,
          async function() {
            const contract = contracts[test.index];
            await contract.connect(owner).setSale(true);

            await contract.connect(addr6).mint(2, {
              value: ethers.BigNumber.from('200000000000000000'),
            });
            await contract.connect(addr5).mint(3, {
              value: ethers.BigNumber.from('300000000000000000'),
            });
            await contract.connect(addr6).mint(1, {
              value: ethers.BigNumber.from('100000000000000000'),
            });
            await contract.connect(addr7).mint(1, {
              value: ethers.BigNumber.from('100000000000000000'),
            });
            await contract.connect(addr5).mint(2, {
              value: ethers.BigNumber.from('200000000000000000'),
            });

            const tokensOf6 = await contract.tokensOfOwnerOffChain(
                addr6.address);
            expect(tokensOf6.length).to.equal(3);
            expect(tokensOf6[0]).to.equal(2);
            expect(tokensOf6[1]).to.equal(3);
            expect(tokensOf6[2]).to.equal(7);

            const tokensOf5 = await contract.tokensOfOwnerOffChain(
                addr5.address);
            expect(tokensOf5.length).to.equal(5);
            expect(tokensOf5[0]).to.equal(4);
            expect(tokensOf5[1]).to.equal(5);
            expect(tokensOf5[2]).to.equal(6);
            expect(tokensOf5[3]).to.equal(9);
            expect(tokensOf5[4]).to.equal(10);

            const tokensOf7 = await contract.tokensOfOwnerOffChain(
                addr7.address);
            expect(tokensOf7.length).to.equal(1);
            expect(tokensOf7[0]).to.equal(8);

            const tokensOfNonOwner = await contract.tokensOfOwnerOffChain(
                addr1.address);
            expect(tokensOfNonOwner.length).to.equal(0);
          });
    });
  });
});
