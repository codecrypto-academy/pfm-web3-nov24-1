import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'

// Define types for product data
interface ProductData {
  id: number;
  nombre: string;
  descripcion: string;
  creador: string;
  cantidad: number;
  timestamp: number;
  atributos?: Array<{
    nombre: string;
    valor: string;
    timestamp: number;
  }>;
}

// Initialize read-only provider for public data
const getReadOnlyProvider = () => {
  return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.infura.io/v3/your-project-id")
}

// Initialize wallet provider for transactions
const getWalletProvider = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No se detectó una wallet de Ethereum')
  }
  return new ethers.BrowserProvider(window.ethereum)
}

/**
 * Fetch the total number of products from the blockchain.
 * @returns {Promise<number>} - The total number of products.
 */
export const fetchProductCount = async (): Promise<number> => {
  try {
    const provider = getReadOnlyProvider()
    const contract = new ethers.Contract(
      CONTRACTS.Tokens.address,
      CONTRACTS.Tokens.abi,
      provider
    )

    const count = await contract.getNumTokens()
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
    const provider = getReadOnlyProvider()
    const contract = new ethers.Contract(
      CONTRACTS.Tokens.address,
      CONTRACTS.Tokens.abi,
      provider
    )

    // Get token data
    const token = await contract.tokens(id)
    
    // Get token attributes
    const nombresAtributos = await contract.getNombresAtributos(id)
    const atributos = await Promise.all(
      nombresAtributos.map(async (nombre: string) => {
        const attr = await contract.getAtributo(id, nombre)
        return {
          nombre: attr[0],
          valor: attr[1],
          timestamp: Number(attr[2])
        }
      })
    )

    const productData: ProductData = {
      id: Number(id),
      nombre: token[1], // token name
      descripcion: token[3], // token description
      creador: token[2], // token creator
      cantidad: Number(token[4]), // token amount
      timestamp: Number(token[5]), // token timestamp
      atributos
    }

    console.log('Product Data:', productData)
    return productData
  } catch (error) {
    console.error('Error fetching product data:', error)
    throw new Error('No se pudo obtener la información del producto.')
  }
}
