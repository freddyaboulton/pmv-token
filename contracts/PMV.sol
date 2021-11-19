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
    uint public constant salePrice = 0.02 ether;
    bytes32 immutable public root;
    bool private _presaleActive = false; 
    mapping (address => uint256) private presaleMints;    
    string private tokenBaseURI;
    string private notRevealedUri;
    bool private revealed = false;

    constructor(bytes32 merkleroot, string memory uri) ERC721("PMV", "PMVTKN") {
        root = merkleroot;
        notRevealedUri = uri;
     }
    
    function mintPresale(uint256 allowance, bytes32[] calldata proof, uint256 tokenQuantity) external payable {
        require(_presaleActive, "PRESALE NOT ACTIVE");
        require(proof.verify(root, keccak256(abi.encodePacked(msg.sender, allowance))), "NOT ON WHITELIST");
        require(presaleMints[msg.sender] + tokenQuantity <= allowance, "MINTING MORE THAN ALLOWED");
        require(tokenQuantity * salePrice == msg.value, "INCORRECT PAYMENT AMOUNT");
        
        for(uint256 i = 0; i < tokenQuantity; i++) {
            _safeMint(msg.sender, totalSupply() + 1);
        }  
        
        presaleMints[msg.sender] += tokenQuantity;      
    }
    
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");

        if(revealed == false) {
            return notRevealedUri;
        }

        else {
            return string(abi.encodePacked(tokenBaseURI, tokenId.toString()));
        }        
    } 

    function setPresale(bool presaleStatus) external onlyOwner {
        _presaleActive = presaleStatus;
    }

    function setURIStatus(bool _revealed, string calldata _tokenBaseURI) external onlyOwner {
        require(bytes(_tokenBaseURI).length > 0, "_tokenBaseURI is empty");
        revealed = _revealed;
        tokenBaseURI = _tokenBaseURI;
    }

}
