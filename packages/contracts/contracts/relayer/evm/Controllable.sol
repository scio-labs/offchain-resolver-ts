// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Controllable is Ownable {
    mapping(address => bool) public controllers;

    modifier onlyController {
        require(controllers[msg.sender]);
        _;
    }

    function setController(address controller, bool status) external onlyOwner {
        controllers[controller] = status;
    }
}
