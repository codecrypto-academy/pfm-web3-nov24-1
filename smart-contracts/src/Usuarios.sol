// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Usuarios {
    struct Usuario {
        address direccion;
        string nombre;
        string gps;
        string rol;
        bool activo;
    }

    address public admin;

    Usuario[] private usuarios;
    mapping(address => bool) public esUsuario;

    event NuevoUsuario(address indexed direccion, string nombre, string rol);
    event UsuarioDesactivado(
        address indexed direccion,
        string nombre,
        string rol
    );

    constructor() {
        admin = msg.sender;
        usuarios.push(
            Usuario({
                direccion: admin,
                nombre: "Propietario",
                gps: "Calle",
                rol: "Admin",
                activo: true
            })
        );
    }

    modifier soloAdmin() {
        require(
            msg.sender == admin,
            "Solo el Admin puede llamar a esta funcion"
        );
        _;
    }

    function nuevoUsuario(
        address _direccion,
        string memory _nombre,
        string memory _gps,
        string memory _rol
    ) public soloAdmin {
        require(_direccion != address(0), "Direccion no valida");
        require(!esUsuario[_direccion], "La direccion ya existe");

        usuarios.push(
            Usuario({
                direccion: _direccion,
                nombre: _nombre,
                gps: _gps,
                rol: _rol,
                activo: true
            })
        );

        esUsuario[_direccion] = true;

        emit NuevoUsuario(_direccion, _nombre, _rol);
    }

    function getIndiceUsuario(
        address _direccion
    ) public view returns (uint256 i) {
        require(_direccion != address(0), "Direccion no valida");
        require(esUsuario[_direccion], "La direccion no existe");

        for (i = 0; i < usuarios.length; i++) {
            if (usuarios[i].direccion == _direccion) {
                return i;
            }
        }
    }

    function getUsuarios() public view returns (Usuario[] memory) {
        return usuarios;
    }

    function getNumUsuarios() public view returns (uint256) {
        return usuarios.length;
    }

    function estaActivo(address _direccionUsuario) public view returns (bool) {
        require(_direccionUsuario != address(0), "Direccion no valida");
        require(esUsuario[_direccionUsuario], "La direccion no existe");

        return usuarios[getIndiceUsuario(_direccionUsuario)].activo;
    }

    function desactivarUsuario(address _direccionUsuario) public soloAdmin {
        require(_direccionUsuario != address(0), "Direccion no valida");
        require(esUsuario[_direccionUsuario], "La direccion no existe");

        Usuario storage usuarioDesactivado = usuarios[
            getIndiceUsuario(_direccionUsuario)
        ];
        usuarioDesactivado.activo = false;

        emit UsuarioDesactivado(
            _direccionUsuario,
            usuarioDesactivado.nombre,
            usuarioDesactivado.rol
        );
    }
    function activarUsuario(address _direccionUsuario) public soloAdmin {
        require(_direccionUsuario != address(0), "Direccion no valida");
        require(esUsuario[_direccionUsuario], "La direccion no existe");

        Usuario storage usuarioActivado = usuarios[
            getIndiceUsuario(_direccionUsuario)
        ];
        usuarioActivado.activo = true;

        emit UsuarioDesactivado(
            _direccionUsuario,
            usuarioActivado.nombre,
            usuarioActivado.rol
        );
    }

    function getRol(address _direccionUsuario) public view returns (string memory) {
        require(_direccionUsuario != address(0), "Direccion no valida");
        require(esUsuario[_direccionUsuario], "La direccion no existe");

        return usuarios[getIndiceUsuario(_direccionUsuario)].rol;
    }
}
