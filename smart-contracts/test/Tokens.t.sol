pragma solidity >=0.8.13;

import "forge-std/Test.sol";
import "../src/Tokens.sol";

contract TokensTest is Test {
    Tokens contratoTokens;
    Usuarios contratoUsuarios;

    address usuarioTransfer = address(0x123);

    function setUp() public {
        contratoUsuarios = new Usuarios();
        contratoUsuarios.nuevoUsuario(usuarioTransfer, "UsuarioTransfer", "Productor");

        // Desplegar el contrato de tokens, pasándole el contrato Usuarios
        contratoTokens = new Tokens(address(contratoUsuarios));
    }

    function testCrearToken() public {
        // Definir los datos del token
        string memory nombre = "TokenTest";
        uint256 cantidad = 1000;
        string memory descripcion = "Este es un token de prueba";
        uint256 idPadre = 0;

        // Esperar el evento `TokenCreado`
        vm.expectEmit(true, true, true, true);
        emit Tokens.TokenCreado(0, nombre, address(this), cantidad);

        // Llamar a la función crearToken
        contratoTokens.crearToken(nombre, cantidad, descripcion, idPadre);

        // Verificar que los valores se almacenaron correctamente
        (uint256 id, uint256 idPadreObtenido, string memory nombreObtenido, address creador, string memory descripcionObtenida, uint256 cantidadObtenida, ) = contratoTokens.tokens(0);

        assertEq(id, 0, "El ID del token deberia ser 0");
        assertEq(idPadreObtenido, idPadre, "El ID del padre no coincide");
        assertEq(nombreObtenido, nombre, "El nombre del token no coincide");
        assertEq(creador, address(this), "El creador deberia ser la direccion del contrato de prueba");
        assertEq(descripcionObtenida, descripcion, "La descripcion no coincide");
        assertEq(cantidadObtenida, cantidad, "La cantidad no coincide");
    }

    function testTransferirToken() public {
        uint256 idToken = 0; // ID del token creado
        uint256 cantidad = 100;

        // Crear un token y asignarlo al sender
        contratoTokens.crearToken("TokenTest", 1000, "Token de prueba", 0);

        // Validar evento esperado
        vm.expectEmit(true, true, true, true);
        emit Tokens.TokenTransferido(idToken, address(this), usuarioTransfer, cantidad);

        // Transferir token
        contratoTokens.transferirToken(idToken, address(this), usuarioTransfer, cantidad);

        // Verificar balances después de la transferencia
        assertEq(contratoTokens.getBalance(idToken, address(this)), 900, "El saldo del sender deberia ser 900");
        assertEq(contratoTokens.getBalance(idToken, usuarioTransfer), 100, "El saldo del usuarioTransfer deberia ser 100");
    }
}
