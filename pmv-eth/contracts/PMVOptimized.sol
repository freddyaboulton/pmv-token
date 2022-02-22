// contracts/PMV.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./ERC721Optimized.sol";
import "./PMVMixin.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";


contract PMVOptimized is PMVMixin, ERC721Optimized, VRFConsumerBase {
    using Strings for uint256;
    using MerkleProof for bytes32[];

    mapping (address => uint256) private presaleMints;
    mapping (address => uint256) private freeMints;
    mapping (address => uint256) private mints;
    bytes32 private s_keyHash;
    uint256 private s_fee;

    constructor(bytes32 merkleroot, string memory uri, bytes32 _rootMintFree,
                bytes32 _provenanceHash, address vrfCoordinator,
                address link, bytes32 keyhash, uint256 fee) ERC721Optimized("PMV", "PMVTKN") VRFConsumerBase(vrfCoordinator, link){
        root = merkleroot;
        notRevealedUri = uri;
        rootMintFree = _rootMintFree;
        provenanceHash = _provenanceHash;
        s_keyHash = keyhash;
        s_fee = fee;
     }
    
    function mintPresale(uint256 allowance, bytes32[] calldata proof, uint256 tokenQuantity) external payable {
        require(presaleActive, "PRESALE NOT ACTIVE");
        require(!saleActive, "SALE ACTIVE RIGHT NOW");
        require(proof.verify(root, keccak256(abi.encodePacked(msg.sender, allowance))), "NOT ON ALLOWLIST");
        require(presaleMints[msg.sender] + tokenQuantity <= allowance, "MINTING MORE THAN ALLOWED");

        uint256 currentSupply = totalNonBurnedSupply();

        require(tokenQuantity + currentSupply <= maxSupply, "NOT ENOUGH LEFT IN STOCK");
        require(tokenQuantity * presalePrice <= msg.value, "INCORRECT PAYMENT AMOUNT");
        
        for(uint256 i = 1; i <= tokenQuantity; i++) {
            _mint(msg.sender, currentSupply + i);
        }  
        
        presaleMints[msg.sender] += tokenQuantity;      
    }

    function mintFree(uint256 allowance, bytes32[] calldata proof, uint256 tokenQuantity) external {
        require(freeMintAllowed, "Free mint not allowed");
        require(proof.verify(rootMintFree, keccak256(abi.encodePacked(msg.sender, allowance))), "NOT ON FREE MINT ALLOWLIST");
        require(freeMints[msg.sender] + tokenQuantity <= allowance, "MINTING MORE THAN ALLOWED");

        uint256 currentSupply = totalNonBurnedSupply();

        require(tokenQuantity + currentSupply <= maxSupply, "NOT ENOUGH LEFT IN STOCK");
        
        for(uint256 i = 1; i <= tokenQuantity; i++) {
            _mint(msg.sender, currentSupply + i);
        }  
        
        freeMints[msg.sender] += tokenQuantity;      
    }

    function mint(uint256 tokenQuantity) external payable {
        require(saleActive, "SALE NOT ACTIVE");
        require(!presaleActive, "PRESALE ONLY RIGHT NOW");
        require(tokenQuantity <= maxPerTransaction, "MINTING MORE THAN ALLOWED IN A SINGLE TRANSACTION");

        uint256 currentSupply = totalNonBurnedSupply();

        require(tokenQuantity + currentSupply <= maxSupply, "NOT ENOUGH LEFT IN STOCK");
        require(tokenQuantity * salePrice <= msg.value, "INCORRECT PAYMENT AMOUNT");

        for(uint256 i = 1; i <= tokenQuantity; i++) {
            _mint(msg.sender, currentSupply + i);
        }
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        return _tokenURI(tokenId);
    }

    function generateRandomOffset() public onlyOwner returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= s_fee, "Not enough LINK to pay fee");
        require(!offsetRequested, "Already generated random offset");
        requestId = requestRandomness(s_keyHash, s_fee);
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        // transform the result to a number between 1 and maxSupply inclusively
        uint256 newOffset = (randomness % maxSupply) + 1;
        offset = newOffset;
        offsetRequested = true;
    }

}
