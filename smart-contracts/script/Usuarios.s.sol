// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {Usuarios} from "../src/Usuarios.sol";

contract UsuariosDeploy is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        Usuarios usuarios = new Usuarios();
        
        console2.log("Usuarios contract deployed at:", address(usuarios));

        vm.stopBroadcast();
    }
}