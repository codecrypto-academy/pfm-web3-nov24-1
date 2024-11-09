// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Participantes} from "../src/Participantes.sol";

contract ParticipantesTest is Test {
    Participantes public participantes;

    function setUp() public {
        participantes = new Participantes();
    }

    function test_admin() view public {
        assertEq(participantes.admin(), address(this));
    }

    function test_nuevoParticipante() public {
        vm.expectEmit(true, true, false, true);

        emit Participantes.NuevoParticipante(address(2), "Nombre", "Rol");
        participantes.nuevoParticipante(address(2), "Nombre", "Rol");

        assertEq(participantes.getNumParticipantes(), 2);
    }
}