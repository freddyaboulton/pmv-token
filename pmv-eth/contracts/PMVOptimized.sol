// contracts/PMV.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./ERC721Optimized.sol";
import "./PMVMixin.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract PMVOptimized is PMVMixin, ERC721Optimized {
    using Strings for uint256;
    using MerkleProof for bytes32[];

    mapping (address => uint256) private presaleMints;
    mapping (address => uint256) private freeMints;
    mapping (address => uint256) private mints;

    constructor(bytes32 merkleroot, string memory uri, bytes32 _rootMintFree) ERC721Optimized("PMV", "PMVTKN") {
        root = merkleroot;
        notRevealedUri = uri;
        rootMintFree = _rootMintFree;
     }
    
    function mintPresale(uint256 allowance, bytes32[] calldata proof, uint256 tokenQuantity) external payable {
        require(presaleActive, "PRESALE NOT ACTIVE");
        require(!saleActive, "SALE ACTIVE RIGHT NOW");
        require(proof.verify(root, keccak256(abi.encodePacked(msg.sender, allowance))), "NOT ON ALLOWLIST");
        require(presaleMints[msg.sender] + tokenQuantity <= allowance, "MINTING MORE THAN ALLOWED");

        uint256 currentSupply = totalNonBurnedSupply();

        require(tokenQuantity + currentSupply <= maxSupply, "NOT ENOUGH LEFT IN STOCK");
        require(tokenQuantity * salePrice <= msg.value, "INCORRECT PAYMENT AMOUNT");
        
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
        require(mints[msg.sender] + tokenQuantity <= maxPerWallet, "MINTING MORE THAN ALLOWED");

        uint256 currentSupply = totalNonBurnedSupply();

        require(tokenQuantity + currentSupply <= maxSupply, "NOT ENOUGH LEFT IN STOCK");
        require(tokenQuantity * salePrice <= msg.value, "INCORRECT PAYMENT AMOUNT");

        for(uint256 i = 1; i <= tokenQuantity; i++) {
            _mint(msg.sender, currentSupply + i);
        }

        mints[msg.sender] += tokenQuantity;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        return _tokenURI(tokenId);
    }

}
