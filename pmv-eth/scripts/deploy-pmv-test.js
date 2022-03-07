// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const {ethers} = require('hardhat');

// run with npx hardhat run scripts/deploy-pmv-test.js --network rinkeby

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const PMVOptimized = await ethers.getContractFactory('PiratesOfTheMetaverse');

  const [deployer] = await ethers.getSigners();

  // taken from: https://docs.chain.link/docs/vrf-contracts/v1/
  const linkToken = '0x514910771AF9Ca656af840dff83E8264EcF986CA';
  const vrfCoordinator = '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952';
  const keyHash =
    '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445';
  const linkFee = ethers.BigNumber.from('2000000000000000000');

  // provenance hash
  const provenanceHash =
    '0xed6587c34eb5cadfb2ef3af47d60919169dd837613c0e46a78601962849d125b';

  const multiSigWallet = '0xB01A3021f067c16FA1ac56F790cFdE75CD8e63e3';
  const ownerMintBuffer = 150;
  const root = '0xe4130558f9ea3fcb929737d7d0feb37fd9db2816990a779b7396c56d144bb57a';
  const freeRoot = '0xa74a6335936fbe099b04a7d8b1cb23edc13aabd5a92b8ea1670da711e2acf3bd';

  console.log("Deploying contracts with the account:", deployer.address);

  const pmvOpt = await PMVOptimized.connect(deployer).deploy(root,
    'ipfs://QmbrgJrjus95i1UFebz27bFmz9gwfc6QHSH8QiBJ6q22s7',
    freeRoot, provenanceHash, vrfCoordinator, linkToken, keyHash, linkFee, multiSigWallet,
    { gasLimit: 4500000, gasPrice: 30000000000 });

  console.log('PMVOptimized deployed to:', pmvOpt.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
