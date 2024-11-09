// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Participantes {
    struct Participante{
        address direccion;
        string nombre;
        string rol;
    }

    address public admin;

    Participante[] private participantes;
    mapping(address => bool) public esParticipante;

    event NuevoParticipante(address indexed direccion, string nombre, string rol);

    constructor() {
        admin = msg.sender;
        participantes.push(Participante({
            direccion: admin,
            nombre: "Propietario",
            rol: "Admin"
        }));
    }

    modifier soloAdmin() {
        require(msg.sender == admin, "Solo el Propietario puede llamar a esta funcion");
        _;
    }

    function nuevoParticipante(address _direccion, string memory _nombre, string memory _rol) public soloAdmin {
        require(_direccion != address(0), "Direccion no valida");
        require(!esParticipante[_direccion], "La direccion ya existe");

        participantes.push(Participante({
            direccion: _direccion,
            nombre: _nombre,
            rol: _rol
        }));

        esParticipante[_direccion] = true;

        emit NuevoParticipante(_direccion, _nombre, _rol);
    }

    function getParticipantes() public view returns (Participante[] memory) {
        return participantes;
    }

    function getNumParticipantes() public view returns (uint256) {
        return participantes.length;
    }
}