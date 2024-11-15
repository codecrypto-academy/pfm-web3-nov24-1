// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Tokens.sol";

contract TokensDeploy is Script {
    function run() external {
        vm.startBroadcast();
        new Tokens(address(0)); // Using zero address since we don't need Usuarios anymore
        vm.stopBroadcast();
    }
}
