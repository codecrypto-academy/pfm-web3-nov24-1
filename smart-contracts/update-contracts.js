const fs = require('fs');
const path = require('path');

// Leer las direcciones de los archivos de broadcast más recientes
function getContractAddress(contractName, scriptName) {
    const broadcastDir = path.join(__dirname, 'broadcast', `${scriptName}.s.sol`, '31337', 'run-latest.json');
    const broadcastLog = JSON.parse(fs.readFileSync(broadcastDir, 'utf8'));
    const deployTx = broadcastLog.transactions.find(tx => tx.contractAddress);
    return deployTx.contractAddress;
}

// Obtener direcciones
const usuariosAddress = getContractAddress('Usuarios', 'Usuarios');
const tokensAddress = getContractAddress('Tokens', 'Tokens');
const certificateAddress = getContractAddress('OliveOilCertification', 'Certificate');

// Leer los ABIs
const usuariosABI = JSON.parse(fs.readFileSync('out/Usuarios.sol/Usuarios.json', 'utf8')).abi;
const tokensABI = JSON.parse(fs.readFileSync('out/Tokens.sol/Tokens.json', 'utf8')).abi;
const certificateABI = JSON.parse(fs.readFileSync('out/Certificate.sol/OliveOilCertification.json', 'utf8')).abi;

// Crear el contenido del archivo contracts.ts
const content = `// Direcciones y ABIs de los contratos
export const CONTRACTS = {
  Usuarios: {
    address: "${usuariosAddress}",
    abi: ${JSON.stringify(usuariosABI, null, 2)}
  },
  Tokens: {
    address: "${tokensAddress}",
    abi: ${JSON.stringify(tokensABI, null, 2)}
  },
  Certificate: {
    address: "${certificateAddress}",
    abi: ${JSON.stringify(certificateABI, null, 2)}
  }
} as const;

// Exportaciones individuales para compatibilidad
export const USUARIOS_ADDRESS = "${usuariosAddress}";
export const TOKENS_ADDRESS = "${tokensAddress}";
export const CERTIFICATE_ADDRESS = "${certificateAddress}";

export const USUARIOS_ABI = ${JSON.stringify(usuariosABI, null, 2)};
export const TOKENS_ABI = ${JSON.stringify(tokensABI, null, 2)};
export const CERTIFICATE_ABI = ${JSON.stringify(certificateABI, null, 2)};
`;

// Escribir el archivo
fs.writeFileSync('../src/constants/contracts.ts', content);
console.log('Archivo contracts.ts actualizado correctamente');
