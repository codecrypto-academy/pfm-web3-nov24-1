// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {Usuarios} from "../src/Usuarios.sol";

contract UsuariosDeploy is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        Usuarios usuarios = new Usuarios();
        
        // Registrar productor (usando la segunda cuenta de Anvil)
        usuarios.nuevoUsuario(
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            "Productor 1",
            "37.8847,-4.7792", // Coordenadas de ejemplo en Córdoba
            "productor"
        );

        // Registrar fábrica (usando la tercera cuenta de Anvil)
        usuarios.nuevoUsuario(
            0x90F79bf6EB2c4f870365E785982E1f101E93b906,
            "Fabrica 1",
            "42.043863584358185, 3.1300091754146946", // Coordenadas de ejemplo en Córdoba
            "fabrica"
        );
        
        console2.log("DEPLOY_ADDRESS:", address(usuarios));

        vm.stopBroadcast();
    }
}