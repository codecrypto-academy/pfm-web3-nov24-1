// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./Usuarios.sol";

contract Tokens {
    Usuarios public usuarios;

    // Estructura para representar un token
    struct Token {
        uint256 id;
        uint256 idPadre;
        uint256 idHijo;
        string nombre;
        address creador;
        string descripcion;
        uint256 cantidad;
        uint256 timestamp;
        mapping(address => uint256) balances;
    }

    // Estructura para representar una transferencia
    struct Transferencia {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        uint256 cantidad;
        uint256 timestamp;
    }

    uint256 private siguienteTokenId = 0;
    uint256 private siguienteTransferId = 0;

    // Mapping para almacenar la información de los tokens
    mapping (uint256 => Token) public tokens;
    
    // Mapping para almacenar la información de los tokens
    mapping (uint256 => Transferencia) public transfers;

    event TokenCreado(uint256 id, string nombre, address creador, uint256 cantidad);
    event TokenDestruido(uint256 id, string nombre, address creador, uint256 cantidad);
    event TokenTransferido(uint256 tokenId, address from, address to, uint256 cantidad);

    constructor(address _direccionUsuarios) {
        usuarios = Usuarios(_direccionUsuarios);
    }

    // Función para crear un token
    function crearToken(
        string memory _nombre, 
        uint256 _cantidad, 
        string memory _descripcion, 
        uint256 _idTokenPadre, 
        uint256 _idTokenHijo
    ) public {
        uint256 tokenId = siguienteTokenId++;

        // Crear un nuevo token
        Token storage nuevoToken = tokens[tokenId];

        nuevoToken.id = tokenId;
        nuevoToken.idPadre = _idTokenPadre;
        nuevoToken.idHijo = _idTokenHijo;
        nuevoToken.nombre = _nombre;
        nuevoToken.creador = msg.sender;
        nuevoToken.descripcion = _descripcion;
        nuevoToken.cantidad = _cantidad;
        nuevoToken.timestamp = block.timestamp;
        nuevoToken.balances[msg.sender] = _cantidad;

        // Emitir el evento de creación de token
        emit TokenCreado(tokenId, _nombre, msg.sender, _cantidad);
    }

    // Función para transferir un token
    function transferirToken(
        uint256 _idToken,
        address _from,
        address _to,
        uint256 _cantidad
    ) public {
        require(tokens[_idToken].balances[_from] >= _cantidad, "El remitente no tiene tokens suficientes.");
        require(_to != msg.sender, "No se puede transferir un token al propietario");
        require(usuarios.estaActivo(_to), "El destinatario no es un usuario activo.");

        uint256 transferId = siguienteTransferId++;

        // Crear una nueva transferencia
        transfers[transferId] = Transferencia(
            transferId,
            _idToken, 
            _from,
            _to,
            _cantidad,
            block.timestamp
        );

        tokens[_idToken].balances[_from] -= _cantidad;
        tokens[_idToken].balances[_to] += _cantidad;

        // Emitir el evento de tranferencia
        emit TokenTransferido(_idToken, _from, _to, _cantidad);
    }

    function getBalance(uint256 _idToken, address _owner) public view returns (uint256) {
        return tokens[_idToken].balances[_owner];
    }
}