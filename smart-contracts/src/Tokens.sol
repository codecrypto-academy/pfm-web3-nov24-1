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

    // Estructura para representar una transferencia
    struct Transferencia {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        uint256 cantidad;
        uint256 timestamp;
    }

    // Estructura para representar la relación entre tokens
    struct TokenRelacion {
        uint256 tokenHijo;     // ID del producto procesado
        uint256 tokenPadre;    // ID de la materia prima
        uint256 cantidadUsada; // Cantidad de materia prima usada
        uint256 timestamp;     // Cuándo se procesó
    }

    uint256 private siguienteTokenId = 0;
    uint256 private siguienteTransferId = 0;

    // Mapping para almacenar la información de los tokens
    mapping (uint256 => Token) public tokens;
    
    // Mapping para almacenar la información de las transferencias
    mapping (uint256 => Transferencia) public transfers;

    // Mappings para la trazabilidad
    mapping(uint256 => TokenRelacion[]) public relacionesPorHijo;  // tokenHijo => todas sus materias primas
    mapping(uint256 => TokenRelacion[]) public relacionesPorPadre; // tokenPadre => todos sus productos derivados

    event TokenCreado(uint256 id, string nombre, address creador, uint256 cantidad);
    event TokenDestruido(uint256 id, string nombre, address creador, uint256 cantidad);
    event TokenTransferido(uint256 tokenId, address from, address to, uint256 cantidad);
    event TokenProcesado(
        uint256 indexed tokenHijo,
        uint256[] tokensPadre,
        uint256[] cantidades,
        uint256 timestamp
    );

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
    ) public {
        require(_nombresAtributos.length == _valoresAtributos.length, "Los arrays de atributos deben tener la misma longitud");
        
        uint256 tokenId = siguienteTokenId++;

        // Crear un nuevo token
        Token storage nuevoToken = tokens[tokenId];

        nuevoToken.id = tokenId;
        nuevoToken.nombre = _nombre;
        nuevoToken.creador = msg.sender;
        nuevoToken.descripcion = _descripcion;
        nuevoToken.cantidad = _cantidad;
        nuevoToken.timestamp = block.timestamp;
        nuevoToken.balances[msg.sender] = _cantidad;

        // Agregar atributos personalizados
        for(uint256 i = 0; i < _nombresAtributos.length; i++) {
            require(bytes(_nombresAtributos[i]).length > 0, "El nombre del atributo no puede estar vacio");
            nuevoToken.atributos[_nombresAtributos[i]] = Atributo({
                nombre: _nombresAtributos[i],
                valor: _valoresAtributos[i],
                timestamp: block.timestamp
            });
            nuevoToken.nombresAtributos.push(_nombresAtributos[i]);
        }

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

    // Función para procesar materias primas y crear un nuevo producto con atributos
    function procesarMateriasPrimas(
        uint256[] memory _idTokens,
        uint256[] memory _cantidades,
        string memory _nombreProducto,
        uint256 _cantidadProducto,
        string memory _descripcionProducto,
        string[] memory _nombresAtributos,
        string[] memory _valoresAtributos
    ) public {
        require(_idTokens.length == _cantidades.length, "La cantidad de tokens y cantidades debe ser igual");
        require(_idTokens.length > 0, "Debe haber al menos una materia prima");
        require(_nombresAtributos.length == _valoresAtributos.length, "Los arrays de atributos deben tener la misma longitud");
        
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

        // Agregar atributos personalizados
        for(uint256 i = 0; i < _nombresAtributos.length; i++) {
            require(bytes(_nombresAtributos[i]).length > 0, "El nombre del atributo no puede estar vacio");
            nuevoToken.atributos[_nombresAtributos[i]] = Atributo({
                nombre: _nombresAtributos[i],
                valor: _valoresAtributos[i],
                timestamp: block.timestamp
            });
            nuevoToken.nombresAtributos.push(_nombresAtributos[i]);
        }
        
        // Crear las relaciones de trazabilidad
        for(uint256 i = 0; i < _idTokens.length; i++) {
            TokenRelacion memory relacion = TokenRelacion(
                tokenId,              // nuevo token
                _idTokens[i],        // materia prima
                _cantidades[i],      // cantidad usada
                block.timestamp
            );
            
            relacionesPorHijo[tokenId].push(relacion);
            relacionesPorPadre[_idTokens[i]].push(relacion);
        }
        
        emit TokenProcesado(tokenId, _idTokens, _cantidades, block.timestamp);
        emit TokenCreado(tokenId, _nombreProducto, msg.sender, _cantidadProducto);
    }

    // Función para obtener todas las materias primas usadas en un producto
    function getMateriasPrimas(uint256 _tokenId) public view returns (TokenRelacion[] memory) {
        return relacionesPorHijo[_tokenId];
    }

    // Función para obtener todos los productos derivados de una materia prima
    function getProductosDerivados(uint256 _tokenId) public view returns (TokenRelacion[] memory) {
        return relacionesPorPadre[_tokenId];
    }

    // Función para obtener el balance de un token
    function getBalance(uint256 _idToken, address _owner) public view returns (uint256) {
        return tokens[_idToken].balances[_owner];
    }

    // Función para obtener un atributo específico de un token
    function getAtributo(uint256 _tokenId, string memory _nombreAtributo) 
        public view returns (string memory nombre, string memory valor, uint256 timestamp) 
    {
        Atributo storage attr = tokens[_tokenId].atributos[_nombreAtributo];
        require(bytes(attr.nombre).length > 0, "Atributo no encontrado");
        return (attr.nombre, attr.valor, attr.timestamp);
    }

    // Función para obtener todos los nombres de atributos de un token
    function getNombresAtributos(uint256 _tokenId) public view returns (string[] memory) {
        return tokens[_tokenId].nombresAtributos;
    }
}