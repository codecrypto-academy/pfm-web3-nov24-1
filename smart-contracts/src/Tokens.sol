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
        require(msg.sender == _from, "Solo el propietario puede transferir sus tokens");
        require(tokens[_idToken].balances[_from] >= _cantidad, "El remitente no tiene tokens suficientes.");
        require(_from != _to, "No se puede transferir un token a la misma direccion");
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

    // Función para procesar materias primas y crear un nuevo producto
    function procesarMateriasPrimas(
        uint256[] memory _idTokens,
        uint256[] memory _cantidades,
        string memory _nombreProducto,
        uint256 _cantidadProducto,
        string memory _descripcionProducto
    ) public {
        require(_idTokens.length == _cantidades.length, "La cantidad de tokens y cantidades debe ser igual");
        require(_idTokens.length > 0, "Debe haber al menos una materia prima");
        
        // Verificar y quemar los tokens de materias primas
        for (uint256 i = 0; i < _idTokens.length; i++) {
            uint256 tokenId = _idTokens[i];
            uint256 cantidad = _cantidades[i];
            
            require(tokens[tokenId].balances[msg.sender] >= cantidad, 
                "No hay suficiente cantidad de materia prima");
            
            // Quemar (consumir) los tokens de materia prima
            tokens[tokenId].balances[msg.sender] -= cantidad;
            tokens[tokenId].cantidad -= cantidad;
            
            emit TokenDestruido(tokenId, tokens[tokenId].nombre, msg.sender, cantidad);
        }
        
        // Crear el nuevo token del producto procesado
        uint256 tokenId = siguienteTokenId++;
        
        Token storage nuevoToken = tokens[tokenId];
        nuevoToken.id = tokenId;
        nuevoToken.nombre = _nombreProducto;
        nuevoToken.creador = msg.sender;
        nuevoToken.descripcion = _descripcionProducto;
        nuevoToken.cantidad = _cantidadProducto;
        nuevoToken.timestamp = block.timestamp;
        nuevoToken.balances[msg.sender] = _cantidadProducto;
        
        // Si hay solo una materia prima, establecer la relación padre-hijo
        if (_idTokens.length == 1) {
            nuevoToken.idPadre = _idTokens[0];
            tokens[_idTokens[0]].idHijo = tokenId;
        }
        
        emit TokenCreado(tokenId, _nombreProducto, msg.sender, _cantidadProducto);
    }
}