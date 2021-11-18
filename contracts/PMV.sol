// contracts/PMV.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract PMV is ERC721Enumerable, Ownable {
    using Strings for uint256;
    using MerkleProof for bytes32[];

    uint256 public constant maxSupply = 10;
    uint public constant SALE_PRICE = 0.02 ether;
    bytes32 immutable public root;
    bool private _presaleActive = false; 
    mapping (address => uint256) private presaleMints;
    
    string private _tokenBaseURI;

    constructor(bytes32 merkleroot, string memory uri) ERC721("PMV", "PMVTKN") {
        root = merkleroot;
        _tokenBaseURI = uri;
     }
    
    function mintPresale(uint256 allowance, bytes32[] calldata proof, uint256 tokenQuantity) external payable {
        require(_presaleActive, "PRESALE NOT ACTIVE");
        require(proof.verify(root, keccak256(abi.encodePacked(msg.sender, allowance))), "NOT ON WHITELIST");
        require(presaleMints[msg.sender] + tokenQuantity <= allowance, "MINTING MORE THAN ALLOWED");
        require(tokenQuantity * SALE_PRICE == msg.value, "INCORRECT PAYMENT AMOUNT");
        for(uint256 i = 0; i < tokenQuantity; i++) {
            _safeMint(msg.sender, totalSupply() + 1);
        }  
        presaleMints[msg.sender] += tokenQuantity;      
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        require(_exists(tokenId), "Cannot query non-existent token");
        
        return string(abi.encodePacked(_tokenBaseURI, tokenId.toString()));
    }

    function setPresale(bool presaleStatus) external onlyOwner {
        _presaleActive = presaleStatus;
    }

}
