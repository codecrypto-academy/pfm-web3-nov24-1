import React, { useState } from 'react';
import dynamic from 'next/dynamic'; // For server-side rendering
import { saveCoordinatesToBlockchain } from '../utils/blockchainUtils';

// Dynamically import MapModal (to avoid SSR issues with Leaflet)
const MapModal = dynamic(() => import('../components/MapModal'), { ssr: false });

const MapModalDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConfirm = async (coordinates: { lat: number; lng: number }) => {
    console.log('Coordinates confirmed:', coordinates);

    // Example Ethereum Interaction
    const contractAddress = '0xYourContractAddress';
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
    const provider = window.ethereum
      ? new ethers.providers.Web3Provider(window.ethereum)
      : null;

    if (!provider) {
      alert('Ethereum provider not found. Please install MetaMask.');
      return;
    }

    try {
      await saveCoordinatesToBlockchain(
        coordinates.lat,
        coordinates.lng,
        contractAddress,
        abi,
        provider
      );
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
