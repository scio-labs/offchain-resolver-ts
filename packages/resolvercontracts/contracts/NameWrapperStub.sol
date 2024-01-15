// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract NameWrapperStub {
    /**
     * @notice Gets the owner of a name
     * @param id Label as a string of the .eth domain to wrap
     * @return owner The owner of the name
     * 
     * Stub
     */

    function ownerOf(
        uint256 id
    ) public view returns (address owner) {
        return address(0);
    }

    /**
     * @notice Sets resolver contract in the registry
     * @param node namehash of the name
     * @param resolver the resolver contract
     * 
     * Stub
     */

    function setResolver(
        bytes32 node,
        address resolver
    ) public {
        //nop
    }
}