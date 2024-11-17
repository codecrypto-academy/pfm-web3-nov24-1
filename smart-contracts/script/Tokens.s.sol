// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Tokens.sol";

contract TokensDeploy is Script {
    function run() external {
        vm.startBroadcast();
        new Tokens(0x5FbDB2315678afecb367f032d93F642f64180aa3); // Dirección del contrato de Usuarios
        vm.stopBroadcast();
    }
}
