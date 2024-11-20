// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Usuarios} from "../src/Usuarios.sol";
import {Tokens} from "../src/Tokens.sol";
import {OliveOilCertification} from "../src/Certificate.sol";

contract Setup is Script {
    Usuarios public usuarios;
    Tokens public tokens;
    OliveOilCertification public certification;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Desplegar contratos
        usuarios = new Usuarios();
        tokens = new Tokens(address(usuarios));
        certification = new OliveOilCertification(address(tokens));

        // Crear usuarios de ejemplo
        usuarios.nuevoUsuario("Productor1", "Productor", "Productor de aceite 1", "CIF123");
        usuarios.nuevoUsuario("Transportista1", "Transportista", "Transportista 1", "CIF456");
        usuarios.nuevoUsuario("Distribuidor1", "Distribuidor", "Distribuidor 1", "CIF789");

        // Crear token de ejemplo
        string[] memory nombres = new string[](3);
        string[] memory valores = new string[](3);
        
        nombres[0] = "acidez";
        nombres[1] = "peroxidos";
        nombres[2] = "k270";
        
        valores[0] = "0.5";
        valores[1] = "12";
        valores[2] = "0.22";

        tokens.crearToken(
            "Aceite Virgen Extra",
            "Aceite de oliva virgen extra de primera prensada",
            1000,
            nombres,
            valores
        );

        vm.stopBroadcast();
    }
}
