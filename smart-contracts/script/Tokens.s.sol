// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Tokens.sol";

contract TokensDeploy is Script {
    function run() external {
        vm.startBroadcast();
        new Tokens(0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0); // Dirección correcta con checksum
        vm.stopBroadcast();
    }
}
