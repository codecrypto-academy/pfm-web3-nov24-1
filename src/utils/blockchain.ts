import { ethers } from 'ethers'

const CONTRACT_ADDRESS = "0xYourContractAddress" // Sustituye con la dirección del contrato
const CONTRACT_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "getProductCount",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "_id", "type": "uint256" }],
    "name": "getProductData",
    "outputs": [
      { "name": "name", "type": "string" },
      { "name": "details", "type": "string" }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
]

// Define types for product data
interface ProductData {
  name: string
  details: string
}

// Create a provider for Ethereum
const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID") // Replace with your provider URL

// Create a contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)

/**
 * Fetch the total number of products from the blockchain.
 * @returns {Promise<number>} - The total number of products.
 */
export const fetchProductCount = async (): Promise<number> => {
  try {
    const count = await contract.getProductCount()
    return count.toNumber()
  } catch (error) {
    console.error('Error fetching product count:', error)
    throw new Error('No se pudo obtener la cantidad de productos de la blockchain.')
  }
}

/**
 * Fetch product data by its ID from the blockchain.
 * @param {string} id - The product ID.
 * @returns {Promise<ProductData>} - The product data.
 */
export const fetchProductData = async (id: string): Promise<ProductData> => {
  try {
    const data = await contract.getProductData(id)
    return {
      name: data.name,
      details: data.details
    }
  } catch (error) {
    console.error('Error fetching product data:', error)
    throw new Error('No se pudo obtener la información del producto.')
  }
}
