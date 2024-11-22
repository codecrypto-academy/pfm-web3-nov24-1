// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {Tokens} from "../src/Tokens.sol";
import {Usuarios} from "../src/Usuarios.sol";

contract TestToken is Script {
    function setUp() public {}

    function run() public {
        // Usar la cuenta de prueba
        vm.startBroadcast(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80);

        // Obtener la instancia del contrato de Usuarios
        Usuarios usuarios = Usuarios(0x5FbDB2315678afecb367f032d93F642f64180aa3);
        
        // Registrar la cuenta de prueba si no está registrada
        if (!usuarios.esUsuario(0x70997970C51812dc3A010C7d01b50e0d17dc79C8)) {
            usuarios.nuevoUsuario(
                0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
                "Productor Test",
                "GPS Test",
                "Productor"
            );
            console2.log("Usuario registrado");
        }

        // Obtener la instancia del contrato de Tokens
        Tokens tokens = Tokens(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);

        // Crear arrays para los atributos
        string[] memory nombresAtributos = new string[](1);
        string[] memory valoresAtributos = new string[](1);

        nombresAtributos[0] = "tipo";
        valoresAtributos[0] = "oliva";

        // Intentar crear un token
        uint256 tokenId = tokens.crearToken(
            "Aceite",
            0,
            "",
            nombresAtributos,
            valoresAtributos
        );

        console2.log("Token creado con ID:", tokenId);

        vm.stopBroadcast();
    }
}
