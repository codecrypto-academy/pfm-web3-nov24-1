const { ethers } = require('ethers');

async function checkContract() {
    // Connect to local Anvil network
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // Contract addresses to check
    const addresses = [
        '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Usuarios
        '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // Tokens
        '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'  // Certificate
    ];

    console.log('Checking contracts...\n');

    for (const address of addresses) {
        try {
            const code = await provider.getCode(address);
            const isDeployed = code !== '0x';
            console.log(`Address: ${address}`);
            console.log(`Status: ${isDeployed ? 'DEPLOYED ✅' : 'NOT DEPLOYED ❌'}`);
            console.log('-------------------');
        } catch (error) {
            console.log(`Error checking ${address}:`, error.message);
        }
    }
}

checkContract().catch(console.error);
