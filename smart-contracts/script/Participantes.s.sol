// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Participantes} from "../src/Participantes.sol";

contract ParticipantesDeploy is Script {
    Participantes public participantes;

     function setUp() public {}

     function run() public {
        vm.startBroadcast();
        participantes = new Participantes();
        vm.stopBroadcast();
     }
}