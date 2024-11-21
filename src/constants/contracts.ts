// ABIs de los contratos
export const USUARIOS_ABI = [
  {"type":"constructor","inputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"activarUsuario","inputs":[{"name":"_direccionUsuario","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"admin","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},
  {"type":"function","name":"desactivarUsuario","inputs":[{"name":"_direccionUsuario","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"esUsuario","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},
  {"type":"function","name":"estaActivo","inputs":[{"name":"_direccionUsuario","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},
  {"type":"function","name":"getIndiceUsuario","inputs":[{"name":"_direccion","type":"address","internalType":"address"}],"outputs":[{"name":"i","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"getNumUsuarios","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"getUsuarios","inputs":[],"outputs":[{"name":"","type":"tuple[]","internalType":"struct Usuarios.Usuario[]","components":[{"name":"direccion","type":"address","internalType":"address"},{"name":"nombre","type":"string","internalType":"string"},{"name":"gps","type":"string","internalType":"string"},{"name":"rol","type":"string","internalType":"string"},{"name":"activo","type":"bool","internalType":"bool"}]}],"stateMutability":"view"},
  {"type":"function","name":"nuevoUsuario","inputs":[{"name":"_direccion","type":"address","internalType":"address"},{"name":"_nombre","type":"string","internalType":"string"},{"name":"_gps","type":"string","internalType":"string"},{"name":"_rol","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"event","name":"NuevoUsuario","inputs":[{"name":"direccion","type":"address","indexed":true,"internalType":"address"},{"name":"nombre","type":"string","indexed":false,"internalType":"string"},{"name":"rol","type":"string","indexed":false,"internalType":"string"}],"anonymous":false},
  {"type":"event","name":"UsuarioDesactivado","inputs":[{"name":"direccion","type":"address","indexed":true,"internalType":"address"}],"anonymous":false}
];

export const TOKENS_ABI = [
  {
    "type": "constructor",
    "inputs": [{"name": "_direccionUsuarios","type": "address","internalType": "address"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "TokenCreado",
    "inputs": [
      {"name": "id","type": "uint256","indexed": false,"internalType": "uint256"},
      {"name": "nombre","type": "string","indexed": false,"internalType": "string"},
      {"name": "creador","type": "address","indexed": false,"internalType": "address"},
      {"name": "cantidad","type": "uint256","indexed": false,"internalType": "uint256"}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TokenTransferido",
    "inputs": [
      {"name": "tokenId","type": "uint256","indexed": false,"internalType": "uint256"},
      {"name": "from","type": "address","indexed": false,"internalType": "address"},
      {"name": "to","type": "address","indexed": false,"internalType": "address"},
      {"name": "cantidad","type": "uint256","indexed": false,"internalType": "uint256"}
    ],
    "anonymous": false
  },
  {
    "type": "function",
    "name": "usuarios",
    "inputs": [],
    "outputs": [{"name": "","type": "address","internalType": "contract Usuarios"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokensEnTransito",
    "inputs": [
      {"name": "","type": "address","internalType": "address"},
      {"name": "","type": "uint256","internalType": "uint256"}
    ],
    "outputs": [{"name": "","type": "uint256","internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transfers",
    "inputs": [{"name": "","type": "uint256","internalType": "uint256"}],
    "outputs": [
      {"name": "id","type": "uint256","internalType": "uint256"},
      {"name": "tokenId","type": "uint256","internalType": "uint256"},
      {"name": "from","type": "address","internalType": "address"},
      {"name": "to","type": "address","internalType": "address"},
      {"name": "transportista","type": "address","internalType": "address"},
      {"name": "cantidad","type": "uint256","internalType": "uint256"},
      {"name": "timestamp","type": "uint256","internalType": "uint256"},
      {"name": "estado","type": "uint8","internalType": "enum Tokens.EstadoTransferencia"},
      {"name": "rutaMapaId","type": "string","internalType": "string"},
      {"name": "condiciones","type": "tuple","internalType": "struct Tokens.CondicionesTransporte",
        "components": [
          {"name": "temperaturaMinima","type": "int256","internalType": "int256"},
          {"name": "temperaturaMaxima","type": "int256","internalType": "int256"},
          {"name": "tipoRefrigeracion","type": "string","internalType": "string"}
        ]
      },
      {"name": "timestampCompletado","type": "uint256","internalType": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "crearToken",
    "inputs": [
      {"name": "_nombre","type": "string","internalType": "string"},
      {"name": "_cantidad","type": "uint256","internalType": "uint256"},
      {"name": "_descripcion","type": "string","internalType": "string"},
      {"name": "_nombresAtributos","type": "string[]","internalType": "string[]"},
      {"name": "_valoresAtributos","type": "string[]","internalType": "string[]"}
    ],
    "outputs": [{"name": "","type": "uint256","internalType": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferirToken",
    "inputs": [
      {"name": "_tokenId","type": "uint256","internalType": "uint256"},
      {"name": "_from","type": "address","internalType": "address"},
      {"name": "_to","type": "address","internalType": "address"},
      {"name": "_cantidad","type": "uint256","internalType": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getBalance",
    "inputs": [
      {"name": "_tokenId","type": "uint256","internalType": "uint256"},
      {"name": "_owner","type": "address","internalType": "address"}
    ],
    "outputs": [{"name": "","type": "uint256","internalType": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAtributo",
    "inputs": [
      {"name": "_tokenId","type": "uint256","internalType": "uint256"},
      {"name": "_nombreAtributo","type": "string","internalType": "string"}
    ],
    "outputs": [
      {"name": "nombre","type": "string","internalType": "string"},
      {"name": "valor","type": "string","internalType": "string"},
      {"name": "timestamp","type": "uint256","internalType": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLastTransfer",
    "inputs": [{"name": "","type": "uint256","internalType": "uint256"}],
    "outputs": [
      {"name": "from","type": "address","internalType": "address"},
      {"name": "to","type": "address","internalType": "address"},
      {"name": "transportista","type": "address","internalType": "address"},
      {"name": "cantidad","type": "uint256","internalType": "uint256"},
      {"name": "timestamp","type": "uint256","internalType": "uint256"},
      {"name": "conditions","type": "tuple","internalType": "struct Tokens.CondicionesTransporte",
        "components": [
          {"name": "temperaturaMinima","type": "int256","internalType": "int256"},
          {"name": "temperaturaMaxima","type": "int256","internalType": "int256"},
          {"name": "tipoRefrigeracion","type": "string","internalType": "string"}
        ]
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "tokens",
    "inputs": [{"name": "","type": "uint256","internalType": "uint256"}],
    "outputs": [
      {"name": "id","type": "uint256","internalType": "uint256"},
      {"name": "nombre","type": "string","internalType": "string"},
      {"name": "creador","type": "address","internalType": "address"},
      {"name": "descripcion","type": "string","internalType": "string"},
      {"name": "cantidad","type": "uint256","internalType": "uint256"},
      {"name": "timestamp","type": "uint256","internalType": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getNombresAtributos",
    "inputs": [{"name": "_tokenId","type": "uint256","internalType": "uint256"}],
    "outputs": [{"name": "","type": "string[]","internalType": "string[]"}],
    "stateMutability": "view"
  }
]

export const CERTIFICATE_ABI = [
  {"type":"constructor","inputs":[{"name":"_tokensContract","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},
  {"type":"function","name":"evaluateQuality","inputs":[{"name":"_tokenId","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"getTokenContract","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},
  {"type":"function","name":"tokensContract","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract Tokens"}],"stateMutability":"view"}
];

// Exportar todo como un objeto CONTRACTS
export const CONTRACTS = {
  Usuarios: {
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    abi: USUARIOS_ABI,
  },
  Tokens: {
    address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    abi: TOKENS_ABI,
  },
  Certificate: {
    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    abi: CERTIFICATE_ABI,
  },
} as const;
