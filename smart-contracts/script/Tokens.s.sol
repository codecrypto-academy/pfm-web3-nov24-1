// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Tokens.sol";

contract TokensDeploy is Script {
    function run() external {
        vm.startBroadcast();
        
        // La dirección de Usuarios se pasará como argumento al script
        address usuariosAddress = vm.envAddress("USUARIOS_ADDRESS");
        Tokens tokens = new Tokens(usuariosAddress);
        
        console2.log("DEPLOY_ADDRESS:", address(tokens));

        vm.stopBroadcast();
    }
}
