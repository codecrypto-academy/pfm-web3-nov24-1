import { ethers } from 'ethers';

/**
 * Define the interface for the Ethereum contract.
 */
export interface EthereumContract {
  storeCoordinates(lat: number, lng: number): Promise<ethers.ContractTransaction>;
}

/**
 * Save coordinates to the Ethereum blockchain.
 * @param lat - Latitude to store
 * @param lng - Longitude to store
 * @param contractAddress - Address of the smart contract
 * @param abi - ABI (Application Binary Interface) of the contract
 * @param provider - Web3 provider to interact with the blockchain
 * @returns Promise<void>
 */
export async function saveCoordinatesToBlockchain(
  lat: number,
  lng: number,
  contractAddress: string,
  abi: ethers.ContractInterface,
  provider: ethers.providers.Web3Provider
): Promise<void> {
  // Validate the coordinates
  if (!isValidCoordinate(lat, lng)) {
    throw new Error('Invalid coordinates: latitude and longitude must be within valid ranges.');
  }

  try {
    const signer = provider.getSigner(); // Get the signer from the provider
    const contract: EthereumContract = new ethers.Contract(
      contractAddress,
      abi,
      signer
    ) as EthereumContract; // Cast the contract to the defined interface

    // Call the smart contract function
    const tx = await contract.storeCoordinates(lat, lng);
    console.log('Transaction sent:', tx.hash);

    // Wait for the transaction to be mined
    await tx.wait();
    console.log('Transaction confirmed:', tx.hash);

    alert('Coordinates saved successfully!');
  } catch (error) {
    console.error('Error saving coordinates to blockchain:', error);
    throw new Error('Failed to save coordinates to the blockchain.');
  }
}

/**
 * Validate that the given coordinates are within valid ranges.
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @returns boolean
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
