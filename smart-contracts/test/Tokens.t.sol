// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import "../src/Tokens.sol";
import {Usuarios} from "../src/Usuarios.sol";

contract TokensTest is Test {
    Tokens contratoTokens;
    Usuarios contratoUsuarios;

    address usuarioTransfer = address(0x123);

    function setUp() public {
        contratoUsuarios = new Usuarios();
        contratoUsuarios.nuevoUsuario(usuarioTransfer, "UsuarioTransfer", "UsuarioCalle", "Productor");
        contratoTokens = new Tokens(address(contratoUsuarios));
    }

    function testCrearToken() public {
        string[] memory nombresAtributos = new string[](0);
        string[] memory valoresAtributos = new string[](0);

        uint256 tokenId = contratoTokens.crearToken(
            "TokenTest",
            1000,
            "Token de prueba",
            nombresAtributos,
            valoresAtributos
        );

        assertEq(contratoTokens.getBalance(tokenId, address(this)), 1000);
    }

    function testIniciarTransferencia() public {
        string[] memory nombresAtributos = new string[](0);
        string[] memory valoresAtributos = new string[](0);
        
        uint256 tokenId = contratoTokens.crearToken(
            "TokenTest",
            1000,
            "Token de prueba",
            nombresAtributos,
            valoresAtributos
        );

        contratoTokens.iniciarTransferencia(tokenId, usuarioTransfer, 100);

        // Verificar que los tokens están en tránsito
        assertEq(contratoTokens.getBalance(tokenId, address(this)), 900);
        assertEq(contratoTokens.tokensEnTransito(usuarioTransfer, tokenId), 100);
        
        // Obtener el ID de la transferencia pendiente
        uint256[] memory transferenciasIds = contratoTokens.getTransferenciasPendientes(usuarioTransfer);
        assertEq(transferenciasIds.length, 1);
        
        // Verificar los detalles de la transferencia
        (, uint256 tid, address from, address to, , uint256 cantidad, , Tokens.EstadoTransferencia estado, , , ) = 
            contratoTokens.transfers(transferenciasIds[0]);
        
        assertEq(tid, tokenId);
        assertEq(from, address(this));
        assertEq(to, usuarioTransfer);
        assertEq(cantidad, 100);
        assertEq(uint(estado), uint(Tokens.EstadoTransferencia.EN_TRANSITO));
    }

    function testAceptarTransferencia() public {
        string[] memory nombresAtributos = new string[](0);
        string[] memory valoresAtributos = new string[](0);
        
        uint256 tokenId = contratoTokens.crearToken(
            "TokenTest",
            1000,
            "Token de prueba",
            nombresAtributos,
            valoresAtributos
        );

        contratoTokens.iniciarTransferencia(tokenId, usuarioTransfer, 100);
        
        // Obtener el ID de la transferencia
        uint256[] memory transferenciasIds = contratoTokens.getTransferenciasPendientes(usuarioTransfer);
        
        vm.prank(usuarioTransfer);
        contratoTokens.aceptarTransferencia(transferenciasIds[0]);

        // Verificar que los tokens se transfirieron correctamente
        assertEq(contratoTokens.getBalance(tokenId, address(this)), 900);
        assertEq(contratoTokens.getBalance(tokenId, usuarioTransfer), 100);
        assertEq(contratoTokens.tokensEnTransito(usuarioTransfer, tokenId), 0);
    }

    function testRechazarTransferencia() public {
        string[] memory nombresAtributos = new string[](0);
        string[] memory valoresAtributos = new string[](0);
        
        uint256 tokenId = contratoTokens.crearToken(
            "TokenTest",
            1000,
            "Token de prueba",
            nombresAtributos,
            valoresAtributos
        );

        contratoTokens.iniciarTransferencia(tokenId, usuarioTransfer, 100);
        
        // Obtener el ID de la transferencia
        uint256[] memory transferenciasIds = contratoTokens.getTransferenciasPendientes(usuarioTransfer);
        
        vm.prank(usuarioTransfer);
        contratoTokens.rechazarTransferencia(transferenciasIds[0]);

        // Verificar que los tokens volvieron al remitente
        assertEq(contratoTokens.getBalance(tokenId, address(this)), 1000);
        assertEq(contratoTokens.getBalance(tokenId, usuarioTransfer), 0);
        assertEq(contratoTokens.tokensEnTransito(usuarioTransfer, tokenId), 0);
    }

    function testGetTransferenciasPendientes() public {
        string[] memory nombresAtributos = new string[](0);
        string[] memory valoresAtributos = new string[](0);
        
        uint256 tokenId = contratoTokens.crearToken(
            "TokenTest",
            1000,
            "Token de prueba",
            nombresAtributos,
            valoresAtributos
        );

        contratoTokens.iniciarTransferencia(tokenId, usuarioTransfer, 100);
        
        // Verificar las transferencias pendientes
        uint256[] memory transferenciasIds = contratoTokens.getTransferenciasPendientes(usuarioTransfer);
        assertEq(transferenciasIds.length, 1);
        
        // Verificar los detalles de la transferencia
        (, uint256 tid, address from, address to, , uint256 cantidad, , Tokens.EstadoTransferencia estado, , , ) = 
            contratoTokens.transfers(transferenciasIds[0]);
        
        assertEq(tid, tokenId);
        assertEq(from, address(this));
        assertEq(to, usuarioTransfer);
        assertEq(cantidad, 100);
        assertEq(uint(estado), uint(Tokens.EstadoTransferencia.EN_TRANSITO));
    }
}
