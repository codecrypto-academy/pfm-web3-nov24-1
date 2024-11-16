// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Usuarios} from "../src/Usuarios.sol";

contract UsuariosTest is Test {
    Usuarios public usuarios;

    function setUp() public {
        usuarios = new Usuarios();
    }

    function testNuevoUsuario() public {
        vm.expectEmit(true, true, false, true);
        address nuevaDireccion = address(uint160(uint(keccak256(abi.encodePacked(block.timestamp)))));

        emit Usuarios.NuevoUsuario(nuevaDireccion, "Nombre", "Rol");

        usuarios.nuevoUsuario(nuevaDireccion, "Nombre", "Calle", "Rol");
        assertTrue(usuarios.estaActivo(nuevaDireccion));
        assertEq(usuarios.esUsuario(nuevaDireccion), true, "El usuario deberia existir");
    }

    function testDesactivarUsuario() public {
        address nuevaDireccion = address(uint160(uint(keccak256(abi.encodePacked(block.timestamp)))));

        usuarios.nuevoUsuario(nuevaDireccion, "Nombre", "Calle", "Rol");
        assertTrue(usuarios.estaActivo(nuevaDireccion));

        usuarios.desactivarUsuario(nuevaDireccion);
        assertFalse(usuarios.estaActivo(nuevaDireccion));
    }
}