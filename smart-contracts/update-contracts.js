const fs = require('fs');
const path = require('path');

// Leer las direcciones del archivo deployment.log
const deploymentLog = fs.readFileSync('deployment.log', 'utf8');
const contractAddresses = deploymentLog.match(/Contract Address: (0x[a-fA-F0-9]{40})/g)
    .map(match => match.split(': ')[1]);

// Leer los ABIs de los archivos JSON
const usuariosABI = JSON.parse(fs.readFileSync('out/Usuarios.sol/Usuarios.json', 'utf8')).abi;
const tokensABI = JSON.parse(fs.readFileSync('out/Tokens.sol/Tokens.json', 'utf8')).abi;
const certificateABI = JSON.parse(fs.readFileSync('out/Certificate.sol/OliveOilCertification.json', 'utf8')).abi;

// Crear el contenido del archivo contracts.ts
const content = `// Direcciones de los contratos
export const USUARIOS_ADDRESS = "${contractAddresses[0]}"
export const TOKENS_ADDRESS = "${contractAddresses[1]}"
export const CERTIFICATE_ADDRESS = "${contractAddresses[2]}"

// ABIs de los contratos
export const USUARIOS_ABI = ${JSON.stringify(usuariosABI, null, 2)}

export const TOKENS_ABI = ${JSON.stringify(tokensABI, null, 2)}

export const CERTIFICATE_ABI = ${JSON.stringify(certificateABI, null, 2)}
`;

// Escribir el archivo
fs.writeFileSync('../src/constants/contracts.ts', content);
console.log('Archivo contracts.ts actualizado correctamente');
