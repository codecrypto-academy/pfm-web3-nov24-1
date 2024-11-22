// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {Usuarios} from "../src/Usuarios.sol";

contract UsuariosDeploy is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        Usuarios usuarios = new Usuarios();
        
        // Registrar la cuenta de prueba como productor
        usuarios.nuevoUsuario(
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            "Productor Test",
            "GPS Test",
            "Productor"
        );

        console2.log("Usuarios contract deployed at:", address(usuarios));

        vm.stopBroadcast();
    }
}