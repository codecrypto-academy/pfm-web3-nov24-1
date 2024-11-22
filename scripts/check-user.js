const { ethers } = require('ethers');

// Get the ABI from your contracts.ts file
const USUARIOS_ABI = [{"type":"constructor","inputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"activarUsuario","inputs":[{"name":"_direccionUsuario","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"admin","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"desactivarUsuario","inputs":[{"name":"_direccionUsuario","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"esUsuario","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"estaActivo","inputs":[{"name":"_direccionUsuario","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"getIndiceUsuario","inputs":[{"name":"_direccion","type":"address","internalType":"address"}],"outputs":[{"name":"i","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"getNumUsuarios","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"getUsuarios","inputs":[],"outputs":[{"name":"","type":"tuple[]","internalType":"struct Usuarios.Usuario[]","components":[{"name":"direccion","type":"address","internalType":"address"},{"name":"nombre","type":"string","internalType":"string"},{"name":"gps","type":"string","internalType":"string"},{"name":"rol","type":"string","internalType":"string"},{"name":"activo","type":"bool","internalType":"bool"}]}],"stateMutability":"view"}];

async function checkUser() {
    // Connect to local Anvil network
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // Create contract instance
    const usuariosContract = new ethers.Contract(
        '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        USUARIOS_ABI,
        provider
    );

    try {
        // Get admin address
        const admin = await usuariosContract.admin();
        console.log('Admin address:', admin);

        // Get all users
        const users = await usuariosContract.getUsuarios();
        console.log('\nRegistered Users:');
        console.log('----------------');
        for (const user of users) {
            console.log(`Address: ${user.direccion}`);
            console.log(`Name: ${user.nombre}`);
            console.log(`Role: ${user.rol}`);
            console.log(`Active: ${user.activo}`);
            console.log('----------------');
        }

        // Check specific address
        const addressToCheck = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
        const isUser = await usuariosContract.esUsuario(addressToCheck);
        console.log(`\nChecking address ${addressToCheck}:`);
        console.log(`Is registered user: ${isUser ? 'Yes ✅' : 'No ❌'}`);

        if (isUser) {
            const isActive = await usuariosContract.estaActivo(addressToCheck);
            console.log(`Is active: ${isActive ? 'Yes ✅' : 'No ❌'}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkUser().catch(console.error);
