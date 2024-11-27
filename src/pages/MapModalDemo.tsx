import React, { useState } from 'react';
import dynamic from 'next/dynamic'; // For server-side rendering
import { ethers } from 'ethers';

// Dynamically import MapModal (to avoid SSR issues with Leaflet)
const MapModal = dynamic(() => import('../components/MapModal'), { ssr: false });

const MapModalDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConfirm = async (coordinates: { lat: number; lng: number }) => {
    console.log('Coordinates confirmed:', coordinates);

    // Example Ethereum Interaction
    const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Replace with your actual contract address
    const abi = [
      {
        inputs: [
          { internalType: 'int256', name: 'lat', type: 'int256' },
          { internalType: 'int256', name: 'lng', type: 'int256' },
        ],
        name: 'storeCoordinates',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ]; // Replace with your contract's ABI

    try {
      // Create a new provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create contract instance
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      // Convert coordinates to the format expected by the contract
      const latInt = Math.floor(coordinates.lat * 1e6);
      const lngInt = Math.floor(coordinates.lng * 1e6);
      
      // Call the contract function
      const tx = await contract.setCoordinates(latInt, lngInt);
      await tx.wait();
      
      alert('Coordinates saved successfully!');
    } catch (error) {
      console.error('Error saving coordinates:', error);
      alert('Failed to save coordinates to blockchain.');
    }

    setIsModalOpen(false);
  };

  return (
    <div>
      <h1>Map Modal Demo</h1>
      <button onClick={() => setIsModalOpen(true)}>Open Map Modal</button>
      {isModalOpen && (
        <MapModal
          onConfirm={handleConfirm}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MapModalDemo;
