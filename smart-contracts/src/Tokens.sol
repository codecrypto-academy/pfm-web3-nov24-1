// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./Usuarios.sol";

contract Tokens {
    Usuarios public usuarios;

    // Estructura para los atributos personalizados
    struct Atributo {
        string nombre;     // Ejemplo: "Metodo de recoleccion"
        string valor;      // Ejemplo: "Manual"
        uint256 timestamp; // Cuándo se añadió el atributo
    }

    // Estructura para representar un token
    struct Token {
        uint256 id;
        string nombre;
        address creador;
        string descripcion;
        uint256 cantidad;
        uint256 timestamp;
        mapping(address => uint256) balances;
        mapping(string => Atributo) atributos;  // nombre del atributo => valor
        string[] nombresAtributos;              // Para poder iterar sobre los atributos
    }

    // Enumeración para los estados de transferencia
    enum EstadoTransferencia { EN_TRANSITO, COMPLETADA, CANCELADA }

    // Estructura para condiciones de transporte
    struct CondicionesTransporte {
        int256 temperaturaMinima;  // en Celsius
        int256 temperaturaMaxima;
        string tipoRefrigeracion; // "REFRIGERADO", "CONGELADO", "AMBIENTE"
    }

    // Estructura para representar una transferencia
    struct Transferencia {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        address transportista;
        uint256 cantidad;
        uint256 timestamp;
        EstadoTransferencia estado;
        string rutaMapaId;        // ID/referencia de la ruta en la librería de mapas
        CondicionesTransporte condiciones;
        uint256 timestampCompletado;
    }

    uint256 private siguienteTokenId = 0;
    uint256 private siguienteTransferId = 0;

    // Mapping para almacenar la información de los tokens
    mapping(uint256 => Token) public tokens;
    
    // Mapping para almacenar la información de las transferencias
    mapping(uint256 => Transferencia) public transfers;

    // Mapping para tokens bloqueados en tránsito
    mapping(address => mapping(uint256 => uint256)) public tokensEnTransito;

    event TokenCreado(uint256 id, string nombre, address creador, uint256 cantidad);
    event TokenTransferido(uint256 tokenId, address from, address to, uint256 cantidad);

    constructor(address _direccionUsuarios) {
        usuarios = Usuarios(_direccionUsuarios);
    }

    // Función para crear un token con atributos opcionales
    function crearToken(
        string memory _nombre, 
        uint256 _cantidad, 
        string memory _descripcion,
        string[] memory _nombresAtributos,
        string[] memory _valoresAtributos
    ) public returns (uint256) {
        require(_nombresAtributos.length == _valoresAtributos.length, "Los arrays de atributos deben tener la misma longitud");
        
        uint256 tokenId = siguienteTokenId++;

        Token storage nuevoToken = tokens[tokenId];
        nuevoToken.id = tokenId;
        nuevoToken.nombre = _nombre;
        nuevoToken.creador = msg.sender;
        nuevoToken.descripcion = _descripcion;
        nuevoToken.cantidad = _cantidad;
        nuevoToken.timestamp = block.timestamp;
        nuevoToken.balances[msg.sender] = _cantidad;

        for(uint256 i = 0; i < _nombresAtributos.length; i++) {
            require(bytes(_nombresAtributos[i]).length > 0, "El nombre del atributo no puede estar vacio");
            nuevoToken.atributos[_nombresAtributos[i]] = Atributo({
                nombre: _nombresAtributos[i],
                valor: _valoresAtributos[i],
                timestamp: block.timestamp
            });
            nuevoToken.nombresAtributos.push(_nombresAtributos[i]);
        }

        emit TokenCreado(tokenId, _nombre, msg.sender, _cantidad);
        return tokenId;
    }

    // Función para transferir tokens
    function transferirToken(
        uint256 _tokenId,
        address _from,
        address _to,
        uint256 _cantidad
    ) public {
        require(_cantidad > 0, "La cantidad debe ser mayor que 0");
        require(tokens[_tokenId].balances[_from] >= _cantidad, "Saldo insuficiente");
        require(_to != address(0), "Direccion de destino invalida");
        require(usuarios.estaActivo(_to), "El destinatario no es un usuario activo");

        tokens[_tokenId].balances[_from] -= _cantidad;
        tokens[_tokenId].balances[_to] += _cantidad;

        emit TokenTransferido(_tokenId, _from, _to, _cantidad);
    }

    // Función para obtener el balance de tokens
    function getBalance(uint256 _tokenId, address _owner) public view returns (uint256) {
        return tokens[_tokenId].balances[_owner];
    }

    // Función para obtener atributos de un token
    function getAtributo(uint256 _tokenId, string memory _nombreAtributo) 
        public view returns (string memory nombre, string memory valor, uint256 timestamp) 
    {
        Atributo storage attr = tokens[_tokenId].atributos[_nombreAtributo];
        return (attr.nombre, attr.valor, attr.timestamp);
    }

    // Función para obtener la última transferencia de un token
    function getLastTransfer(uint256 /* _tokenId */) public pure returns (
        address from,
        address to,
        address transportista,
        uint256 cantidad,
        uint256 timestamp,
        CondicionesTransporte memory conditions
    ) {
        // Por ahora retornamos valores por defecto
        return (
            address(0),
            address(0),
            address(0),
            0,
            0,
            CondicionesTransporte(0, 0, "")
        );
    }
}