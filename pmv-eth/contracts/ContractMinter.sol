// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IPMV {
    function mint(uint256) external payable;
}

contract Minter {
    address pmvAddr;

    function setPMVAddress(address _pmvAddr) external {
        pmvAddr = _pmvAddr;
    }

    function mint() external payable {
        IPMV(pmvAddr).mint{value: msg.value}(1);
    }
}