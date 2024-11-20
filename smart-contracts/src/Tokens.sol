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

    // Estructura para información del transporte
    struct InfoTransporte {
        address transportista;
        string metodoPago;
        string metodologiaTransporte;
        string documentacionAsociada;
        uint256 tiempoEstimadoEntrega;  // en segundos
    }

    // Estructura para checkpoints de transporte
    struct Checkpoint {
        string ubicacion;
        string descripcion;
        uint256 timestamp;
        address confirmadoPor;
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

    // Mapping para tokens bloqueados en tránsito
    mapping(address => mapping(uint256 => uint256)) public tokensEnTransito;

    // Mappings para la trazabilidad
    mapping(uint256 => TokenRelacion[]) public relacionesPorHijo;  // tokenHijo => todas sus materias primas
    mapping(uint256 => TokenRelacion[]) public relacionesPorPadre; // tokenPadre => todos sus productos derivados

    // Mapping para transportistas autorizados
    mapping(address => bool) public transportistasAutorizados;

    event TokenCreado(uint256 id, string nombre, address creador, uint256 cantidad);
    event TokenDestruido(uint256 id, string nombre, address creador, uint256 cantidad);
    event TokenTransferido(uint256 tokenId, address from, address to, uint256 cantidad);
    event TokenProcesado(
        uint256 indexed tokenHijo,
        uint256[] tokensPadre,
        uint256[] cantidades,
        uint256 timestamp
    );
    event TokenTransferenciaIniciada(
        uint256 indexed tokenId, 
        address from, 
        address to, 
        uint256 cantidad, 
        uint256 transferId, 
        string rutaMapaId
    );
    event TokenTransferenciaCancelada(uint256 indexed tokenId, address from, address to, uint256 cantidad, uint256 transferId);
    event TransportistaAutorizado(address transportista, bool autorizado);
    event CheckpointRegistrado(uint256 indexed transferId, string ubicacion, uint256 timestamp);
    event TiempoEntregaExcedido(uint256 indexed transferId, uint256 tiempoEstimado, uint256 tiempoActual);

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

    // Función para iniciar una transferencia
    function iniciarTransferencia(
        uint256 _idToken,
        address _to,
        address _transportista,
        uint256 _cantidad,
        string memory _rutaMapaId,
        int256 _tempMin,
        int256 _tempMax,
        string memory _tipoRefrigeracion
    ) public {
        address _from = msg.sender;
        require(_from != _to, "No se puede transferir a la misma direccion");
        require(usuarios.estaActivo(_to), "El destinatario no es un usuario activo");
        require(tokens[_idToken].balances[_from] >= _cantidad, "El remitente no tiene tokens suficientes");
        require(_tempMin <= _tempMax, "Temperatura minima debe ser menor o igual a la maxima");
        
        uint256 transferId = siguienteTransferId++;

        // Crear una nueva transferencia
        transfers[transferId] = Transferencia(
            transferId,
            _idToken,
            _from,
            _to,
            _transportista,
            _cantidad,
            block.timestamp,
            EstadoTransferencia.EN_TRANSITO,
            _rutaMapaId,
            CondicionesTransporte(_tempMin, _tempMax, _tipoRefrigeracion),
            0
        );

        // Bloquear los tokens en tránsito
        tokensEnTransito[_from][_idToken] += _cantidad;
        
        emit TokenTransferenciaIniciada(_idToken, _from, _to, _cantidad, transferId, _rutaMapaId);
    }

    // Función para confirmar la recepción
    function confirmarRecepcion(uint256 _transferId) public {
        Transferencia storage transferencia = transfers[_transferId];
        
        require(msg.sender == transferencia.to, "Solo el destinatario puede confirmar la recepcion");
        require(transferencia.estado == EstadoTransferencia.EN_TRANSITO, "La transferencia no esta en transito");
        
        // Actualizar balances
        tokens[transferencia.tokenId].balances[transferencia.from] -= transferencia.cantidad;
        tokens[transferencia.tokenId].balances[transferencia.to] += transferencia.cantidad;
        
        // Desbloquear tokens en tránsito
        tokensEnTransito[transferencia.from][transferencia.tokenId] -= transferencia.cantidad;
        
        // Actualizar estado
        transferencia.estado = EstadoTransferencia.COMPLETADA;
        transferencia.timestampCompletado = block.timestamp;

        emit TokenTransferido(
            transferencia.tokenId, 
            transferencia.from, 
            transferencia.to, 
            transferencia.cantidad
        );
    }

    // Función para cancelar una transferencia
    function cancelarTransferencia(uint256 _transferId) public {
        Transferencia storage transferencia = transfers[_transferId];
        
        require(
            msg.sender == transferencia.from || 
            msg.sender == transferencia.transportista,
            "Solo el remitente o transportista pueden cancelar"
        );
        require(transferencia.estado == EstadoTransferencia.EN_TRANSITO, "La transferencia no esta en transito");
        
        // Desbloquear tokens en tránsito
        tokensEnTransito[transferencia.from][transferencia.tokenId] -= transferencia.cantidad;
        
        // Actualizar estado
        transferencia.estado = EstadoTransferencia.CANCELADA;

        emit TokenTransferenciaCancelada(
            transferencia.tokenId, 
            transferencia.from, 
            transferencia.to, 
            transferencia.cantidad, 
            _transferId
        );
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

    // Función para gestionar transportistas autorizados
    function gestionarTransportista(address _transportista, bool _autorizado) public {
        require(msg.sender == address(this), "Solo el owner puede gestionar transportistas");
        transportistasAutorizados[_transportista] = _autorizado;
        emit TransportistaAutorizado(_transportista, _autorizado);
    }

    // Función para registrar checkpoints
    function registrarCheckpoint(
        uint256 _transferId,
        string memory _ubicacion,
        string memory _descripcion
    ) public {
        Transferencia storage transferencia = transfers[_transferId];
        require(
            msg.sender == transferencia.transportista || 
            msg.sender == transferencia.from || 
            msg.sender == transferencia.to,
            "Solo el transportista o las partes pueden registrar checkpoints"
        );
        require(transferencia.estado == EstadoTransferencia.EN_TRANSITO, "Transferencia no esta en transito");

        // Crear nuevo checkpoint
        //transferencia.checkpoints.push(Checkpoint(
        //    _ubicacion,
        //    _descripcion,
        //    block.timestamp,
        //    msg.sender
        //));

        // Verificar si se ha excedido el tiempo estimado
        //if (block.timestamp > transferencia.infoTransporte.tiempoEstimadoEntrega && !transferencia.tiempoExcedido) {
        //    transferencia.tiempoExcedido = true;
        //    emit TiempoEntregaExcedido(
        //        _transferId,
        //        transferencia.infoTransporte.tiempoEstimadoEntrega,
        //        block.timestamp
        //    );
        //}

        //emit CheckpointRegistrado(_transferId, _ubicacion, block.timestamp);
    }

    // Función para obtener checkpoints de una transferencia
    function getCheckpoints(uint256 _transferId) public view returns (
        string[] memory ubicaciones,
        string[] memory descripciones,
        uint256[] memory timestamps,
        address[] memory confirmadores
    ) {
        //Transferencia storage transferencia = transfers[_transferId];
        //uint256 numCheckpoints = transferencia.checkpoints.length;
        
        //ubicaciones = new string[](numCheckpoints);
        //descripciones = new string[](numCheckpoints);
        //timestamps = new uint256[](numCheckpoints);
        //confirmadores = new address[](numCheckpoints);
        
        //for (uint256 i = 0; i < numCheckpoints; i++) {
        //    Checkpoint storage cp = transferencia.checkpoints[i];
        //    ubicaciones[i] = cp.ubicacion;
        //    descripciones[i] = cp.descripcion;
        //    timestamps[i] = cp.timestamp;
        //    confirmadores[i] = cp.confirmadoPor;
        //}
    }
}