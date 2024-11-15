// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Usuarios} from "../src/Usuarios.sol";

contract UsuariosDeploy is Script {
    Usuarios public usuarios;

     function setUp() public {}

     function run() public {
        vm.startBroadcast();
        usuarios = new Usuarios();
        vm.stopBroadcast();
     }
}