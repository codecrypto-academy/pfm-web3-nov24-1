pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Tokens} from "../src/Tokens.sol";
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

    function testTransferirToken() public {
        string[] memory nombresAtributos = new string[](0);
        string[] memory valoresAtributos = new string[](0);
        
        uint256 tokenId = contratoTokens.crearToken(
            "TokenTest",
            1000,
            "Token de prueba",
            nombresAtributos,
            valoresAtributos
        );

        contratoTokens.transferirToken(tokenId, address(this), usuarioTransfer, 100);

        assertEq(contratoTokens.getBalance(tokenId, address(this)), 900);
        assertEq(contratoTokens.getBalance(tokenId, usuarioTransfer), 100);
    }
}
