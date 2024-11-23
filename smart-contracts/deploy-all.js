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

// Función para extraer la dirección de despliegue del output
function extractDeployAddress(output) {
    const match = output.match(/DEPLOY_ADDRESS: (0x[a-fA-F0-9]{40})/);
    if (!match) {
        throw new Error('No se pudo encontrar la dirección de despliegue en el output');
    }
    return match[1];
}

// Función para ejecutar un comando y capturar su salida
function execCommand(cmd) {
    return execSync(cmd, { encoding: 'utf8' });
}

async function main() {
    try {
        // 1. Verificar que anvil está corriendo
        console.log('🔍 Verificando conexión a anvil...');
        await checkAnvil();
        console.log('✅ Anvil está corriendo correctamente');

        // 2. Inicializar deployment.log
        const deploymentInfo = {};
        
        console.log('\n🚀 Iniciando deploy de contratos...\n');

        // 3. Deploy Usuarios
        console.log('📄 Desplegando contrato Usuarios...');
        const usuariosOutput = execCommand(
            `forge script script/Usuarios.s.sol:UsuariosDeploy --rpc-url ${RPC_URL} --broadcast --private-key ${PRIVATE_KEY}`
        );
        deploymentInfo.usuarios = extractDeployAddress(usuariosOutput);
        console.log(`✅ Usuarios desplegado en: ${deploymentInfo.usuarios}\n`);

        // 4. Deploy Tokens
        console.log('📄 Desplegando contrato Tokens...');
        const tokensOutput = execCommand(
            `USUARIOS_ADDRESS=${deploymentInfo.usuarios} forge script script/Tokens.s.sol:TokensDeploy --rpc-url ${RPC_URL} --broadcast --private-key ${PRIVATE_KEY}`
        );
        deploymentInfo.tokens = extractDeployAddress(tokensOutput);
        console.log(`✅ Tokens desplegado en: ${deploymentInfo.tokens}\n`);

        // 5. Deploy Certificate
        console.log('📄 Desplegando contrato Certificate...');
        const certificateOutput = execCommand(
            `TOKENS_ADDRESS=${deploymentInfo.tokens} forge script script/Certificate.s.sol:CertificateDeploy --rpc-url ${RPC_URL} --broadcast --private-key ${PRIVATE_KEY}`
        );
        deploymentInfo.certificate = extractDeployAddress(certificateOutput);
        console.log(`✅ Certificate desplegado en: ${deploymentInfo.certificate}\n`);

        // 6. Guardar información de despliegue
        fs.writeFileSync('deployment.log', JSON.stringify(deploymentInfo, null, 2));
        console.log('📝 Información de despliegue guardada en deployment.log');

        // 7. Actualizar contracts.ts
        console.log('\n📝 Actualizando contracts.ts...');
        require('./update-contracts.js');
        console.log('✅ contracts.ts actualizado');

        console.log('\n✨ Deploy completado exitosamente!');
        console.log('📋 Revisa deployment.log para ver las direcciones de los contratos');
    } catch (error) {
        console.error('\n❌ Error durante el proceso:', error.message);
        process.exit(1);
    }
}

// Ejecutar el script
main().catch(console.error);
