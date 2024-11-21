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

const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID") // Replace with your provider URL

const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)

export const fetchProductCount = async () => {
  try {
    const count = await contract.getProductCount()
    return count.toNumber()
  } catch (error) {
    console.error('Error fetching product count:', error)
    throw new Error('No se pudo obtener la cantidad de productos de la blockchain.')
  }
}

export const fetchProductData = async (id) => {
  try {
    const data = await contract.getProductData(id)
    console.log('Product Data:', data)
    alert(`Producto encontrado:\nNombre: ${data.name}\nDetalles: ${data.details}`)
  } catch (error) {
    console.error('Error fetching product data:', error)
    throw new Error('No se pudo obtener la información del producto.')
  }
}
