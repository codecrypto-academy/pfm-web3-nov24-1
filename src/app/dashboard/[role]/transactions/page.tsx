'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import TransactionMap from '@/components/TransactionMap'
import TransactionDetails from '@/components/TransactionDetails'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'

interface DetailedTransaction {
  // Datos básicos
  id: string
  tokenId: number
  blockNumber: number
  gasUsed: string
  gasPrice: string
  timestamp: number

  // Datos del producto
  product: string
  description: string
  quantity: number
  attributes: Array<{
    nombre: string
    valor: string
    timestamp: number
  }>
  rawMaterials: Array<{
    tokenHijo: number
    tokenPadre: number
    cantidadUsada: number
    timestamp: number
  }>

  // Datos de participantes
  from: {
    address: string
    name: string
    role: string
    gps: string
    active: boolean
  }
  to: {
    address: string
    name: string
    role: string
    gps: string
    active: boolean
  }

  // Ubicaciones
  fromLocation: [number, number]
  toLocation: [number, number]
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<DetailedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { address } = useWeb3()

  useEffect(() => {
    const loadTransactions = async () => {
      if (!address) {
        setLoading(false)
        return
      }

      if (!window.ethereum) {
        setError('MetaMask no está instalado')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const tokensContract = new ethers.Contract(
          CONTRACTS.TOKENS.ADDRESS,
          CONTRACTS.TOKENS.ABI,
          provider
        )
        const participantesContract = new ethers.Contract(
          CONTRACTS.PARTICIPANTES.ADDRESS,
          CONTRACTS.PARTICIPANTES.ABI,
          provider
        )

        // Obtener todos los usuarios primero
        const usuarios = await participantesContract.getUsuarios()
        const usuariosPorDireccion = new Map(
          usuarios.map((user: any) => [user.direccion.toLowerCase(), user])
        )

        // Obtener eventos de transferencia
        const filter = tokensContract.filters.TokenTransferido()
        const events = await tokensContract.queryFilter(filter)

        const transactionPromises = events.map(async (event: any) => {
          try {
            const { tokenId, from, to, cantidad } = event.args
            const receipt = await event.getTransactionReceipt()
            const block = await event.getBlock()
            
            // Obtener detalles del token
            const tokenData = await tokensContract.tokens(tokenId)
            const attrNames = await tokensContract.getNombresAtributos(tokenId)
            const rawMaterials = await tokensContract.getMateriasPrimas(tokenId)

            // Obtener atributos del token
            const attributePromises = attrNames.map(async (name: string) => {
              const attr = await tokensContract.getAtributo(tokenId, name)
              return {
                nombre: name,
                valor: attr.valor,
                timestamp: Number(attr.timestamp)
              }
            })
            const attributes = await Promise.all(attributePromises)

            // Obtener información de los participantes
            const fromParticipant = usuariosPorDireccion.get(from.toLowerCase())
            const toParticipant = usuariosPorDireccion.get(to.toLowerCase())

            // Parsear coordenadas GPS
            const parseGPS = (gps: string): [number, number] => {
              try {
                const [lat, lng] = gps.split(',').map(coord => {
                  const num = parseFloat(coord.trim())
                  return isNaN(num) ? 0 : num
                })
                return [lat, lng]
              } catch {
                return [0, 0]
              }
            }

            const fromGPS = parseGPS(fromParticipant?.gps || '0,0')
            const toGPS = parseGPS(toParticipant?.gps || '0,0')

            return {
              id: event.transactionHash,
              tokenId: Number(tokenId),
              blockNumber: event.blockNumber,
              gasUsed: receipt.gasUsed.toString(),
              gasPrice: receipt.gasPrice.toString(),
              timestamp: block.timestamp,

              product: tokenData[1], // nombre
              description: tokenData[3] || 'Sin descripción', // descripción
              quantity: Number(cantidad) / 1000, // convertir a kg
              attributes,
              rawMaterials: rawMaterials.map((material: any) => ({
                tokenHijo: Number(material.tokenHijo),
                tokenPadre: Number(material.tokenPadre),
                cantidadUsada: Number(material.cantidadUsada),
                timestamp: Number(material.timestamp)
              })),

              from: {
                address: from,
                name: fromParticipant?.nombre || 'Desconocido',
                role: fromParticipant?.rol || 'Desconocido',
                gps: fromParticipant?.gps || '0,0',
                active: fromParticipant?.activo || false
              },
              to: {
                address: to,
                name: toParticipant?.nombre || 'Desconocido',
                role: toParticipant?.rol || 'Desconocido',
                gps: toParticipant?.gps || '0,0',
                active: toParticipant?.activo || false
              },

              fromLocation: fromGPS,
              toLocation: toGPS
            }
          } catch (err) {
            console.error('Error procesando transacción:', err)
            return null
          }
        })

        const completedTransactions = (await Promise.all(transactionPromises))
          .filter((tx): tx is DetailedTransaction => tx !== null)
          .reverse() // Mostrar las más recientes primero

        setTransactions(completedTransactions)
      } catch (err: any) {
        console.error('Error loading transactions:', err)
        setError(err.message || 'Error al cargar las transacciones')
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [address])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-olive-800 mb-6">Historial de Transacciones</h1>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Cargando transacciones...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay transacciones disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {transactions.map((transaction) => (
            <div key={transaction.id}>
              <TransactionDetails transaction={transaction} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
