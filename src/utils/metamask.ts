import { ethers } from 'ethers';

// Configuración global para el manejo de eventos de MetaMask
let isListening = false;

export const setupMetaMaskEventHandling = () => {
    if (isListening) return;

    // Manejador de eventos optimizado
    const handleMetaMaskMessage = (event: MessageEvent) => {
        // Solo procesar eventos relevantes de MetaMask
        if (event.origin !== window.location.origin) return;
        if (!event.data || typeof event.data !== 'object') return;
        
        // Aquí puedes agregar lógica específica para manejar eventos de MetaMask si es necesario
    };

    window.addEventListener('message', handleMetaMaskMessage);
    isListening = true;

    return () => {
        window.removeEventListener('message', handleMetaMaskMessage);
        isListening = false;
    };
};

// Función helper para obtener el provider de MetaMask
export const getMetaMaskProvider = async () => {
    if (!window.ethereum) {
        throw new Error('MetaMask no está instalado');
    }
    return new ethers.BrowserProvider(window.ethereum);
};
