// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {OliveOilCertification} from "../src/Certificate.sol";
import {Tokens} from "../src/Tokens.sol";

contract CertificateDeploy is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        
        // La dirección de Tokens se pasará como argumento al script
        address tokensAddress = vm.envAddress("TOKENS_ADDRESS");
        
        // Desplegar el contrato de certificación
        OliveOilCertification certification = new OliveOilCertification(tokensAddress);
        
        console.log("DEPLOY_ADDRESS:", address(certification));

        vm.stopBroadcast();
    }
}
