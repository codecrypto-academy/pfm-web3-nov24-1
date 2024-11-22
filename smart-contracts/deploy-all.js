const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');

// Configuración
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_URL = 'http://localhost:8545';

// Función para verificar si anvil está corriendo
function checkAnvil() {
    return new Promise((resolve, reject) => {
        const req = http.get(RPC_URL, (res) => {
            resolve(true);
        }).on('error', (err) => {
            reject(new Error('Anvil no está corriendo. Por favor, inicia anvil primero.'));
        });
        req.end();
    });
}

async function main() {
    try {
        // 1. Verificar que anvil está corriendo
        console.log('Verificando conexión a anvil...');
        await checkAnvil();
        console.log('✅ Anvil está corriendo correctamente');

        // 2. Deploy de contratos en orden
        console.log('\n🚀 Iniciando deploy de contratos...');

        // Usuarios
        console.log('\n📄 Desplegando Usuarios...');
        execSync(`forge script script/Usuarios.s.sol:UsuariosDeploy --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY} --broadcast`, { stdio: 'inherit' });
        console.log('✅ Usuarios desplegado');

        // Tokens
        console.log('\n📄 Desplegando Tokens...');
        execSync(`forge script script/Tokens.s.sol:TokensDeploy --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY} --broadcast`, { stdio: 'inherit' });
        console.log('✅ Tokens desplegado');

        // Certificate
        console.log('\n📄 Desplegando Certificate...');
        execSync(`forge script script/Certificate.s.sol:CertificateDeploy --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY} --broadcast`, { stdio: 'inherit' });
        console.log('✅ Certificate desplegado');

        // 3. Actualizar contracts.ts
        console.log('\n📝 Actualizando contracts.ts...');
        require('./update-contracts.js');
        console.log('✅ contracts.ts actualizado');

        console.log('\n✨ Deploy completado exitosamente!');
    } catch (error) {
        console.error('\n❌ Error durante el proceso:', error.message);
        process.exit(1);
    }
}

// Ejecutar el script
main().catch(console.error);
