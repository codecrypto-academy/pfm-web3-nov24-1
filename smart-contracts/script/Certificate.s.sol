// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {OliveOilCertification} from "../src/Certificate.sol";
import {Tokens} from "../src/Tokens.sol";

contract CertificateDeploy is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Dirección del contrato Tokens desplegado en el bloque 2
        address tokensAddress = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
        
        // Desplegar el contrato de certificación
        OliveOilCertification certification = new OliveOilCertification(tokensAddress);
        
        console.log("Certificate contract deployed at:", address(certification));

        vm.stopBroadcast();
    }
}
