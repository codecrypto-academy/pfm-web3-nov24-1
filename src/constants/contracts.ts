export const PARTICIPANTES_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "direccion",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "nombre",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "rol",
                "type": "string"
            }
        ],
        "name": "NuevoParticipante",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "admin",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "esParticipante",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getNumParticipantes",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getParticipantes",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "direccion",
                        "type": "address"
                    },
                    {
                        "internalType": "string",
                        "name": "nombre",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "rol",
                        "type": "string"
                    }
                ],
                "internalType": "struct Participantes.Participante[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_direccion",
                "type": "address"
            },
            {
                "internalType": "string",
                "name": "_nombre",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_rol",
                "type": "string"
            }
        ],
        "name": "nuevoParticipante",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

export const CONTRACTS = {
    PARTICIPANTES: {
        ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        ABI: PARTICIPANTES_ABI
    }
}
