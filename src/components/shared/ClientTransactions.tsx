'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import TransactionMap from '@/components/shared/TransactionMap'
import TransactionDetails from '@/components/shared/TransactionDetails'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { DetailedTransaction, EstadoTransferencia, RawMaterial, TokenAttribute } from '@/types/transactions'
import { useRouter } from 'next/navigation'

interface Participant {
  direccion: string
  nombre: string
  rol: string
  gps: string
  activo: boolean
}

interface Attribute {
  nombre: string
  valor: string
  timestamp: number
}

interface TokenEventArgs {
  tokenId: bigint
  from: string
  to: string
  cantidad: bigint
}

interface TokenEvent {
  args: [bigint, string, string, bigint]
}

export default function ClientTransactions({ role }: { role: string }) {
  const [transactions, setTransactions] = useState<DetailedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { address, isAuthenticated, isLoading: isAuthLoading, role: userRole } = useWeb3()
  const router = useRouter()
  const urlRole = role

  // Efecto para manejar la redirección basada en el rol
  useEffect(() => {
    if (isAuthLoading) return

    if (!isAuthenticated) {
      router.push('/')
      return
    }

    if (userRole && urlRole !== userRole.toLowerCase()) {
      console.log('Rol incorrecto, redirigiendo...')
      router.push(`/dashboard/${userRole.toLowerCase()}/transactions`)
      return
    }
  }, [isAuthLoading, isAuthenticated, userRole, urlRole, router])

  // Efecto para cargar las transacciones
  useEffect(() => {
    if (
      isAuthLoading ||
      !isAuthenticated ||
      !address ||
      (userRole && urlRole !== userRole.toLowerCase())
    ) {
      return
    }

    loadTransactions()
  }, [isAuthLoading, isAuthenticated, address, userRole, urlRole])

  const loadTransactions = async () => {
    if (!address) {
      setError('No hay dirección de wallet conectada')
      setLoading(false)
      return
    }

    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask no está disponible')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('Iniciando carga de transacciones para rol:', role)

      const provider = new ethers.BrowserProvider(window.ethereum)
      const tokensContract = new ethers.Contract(
        CONTRACTS.Tokens.address,
        CONTRACTS.Tokens.abi,
        provider
      )
      const usuariosContract = new ethers.Contract(
        CONTRACTS.Usuarios.address,
        CONTRACTS.Usuarios.abi,
        provider
      )

      if (!tokensContract || !provider) {
        console.error('Contratos no inicializados')
        setError('Error al cargar las transacciones')
        setLoading(false)
        return
      }

      // Cargar usuarios
      const usuarios = await usuariosContract.getUsuarios()
      console.log('Usuarios cargados:', usuarios.length)

      // Obtener todos los eventos de transferencia
      const filter = tokensContract.filters.TokenTransferido()
      const latestBlock = await provider.getBlockNumber()
      const events = await tokensContract.queryFilter(filter, 0, latestBlock)

      console.log('Total de eventos encontrados:', events.length)

      // Crear un Set para mantener un registro de las transacciones únicas
      const processedTransactionHashes = new Set<string>()

      // Filtrar eventos relevantes según el rol
      const filteredEvents = events
        .filter((event): event is ethers.EventLog => event instanceof ethers.EventLog)
        .filter((event) => {
          if (!event.args || event.args.length < 4) {
            console.log('Evento sin argumentos válidos:', event)
            return false
          }

          // Verificar si ya hemos procesado esta transacción
          if (processedTransactionHashes.has(event.transactionHash)) {
            console.log('Transacción duplicada encontrada:', event.transactionHash)
            return false
          }

          const from = event.args[1].toString().toLowerCase()
          const to = event.args[2].toString().toLowerCase()
          const userAddress = address?.toLowerCase()

          if (!userAddress) {
            console.log('No hay dirección de usuario')
            return false
          }

          let isRelevant = false
          if (role === 'productor') {
            isRelevant = from === userAddress || to === userAddress
          } else if (role === 'fabrica') {
            isRelevant = to === userAddress && event.args.length >= 4
          }

          if (isRelevant) {
            processedTransactionHashes.add(event.transactionHash)
          }

          console.log('Evaluando evento:', {
            from,
            to,
            userAddress,
            role,
            isRelevant,
            eventId: event.transactionHash,
            isDuplicate: processedTransactionHashes.has(event.transactionHash)
          })

          return isRelevant
        })

      console.log('Eventos filtrados:', {
        total: events.length,
        filtrados: filteredEvents.length,
        role,
        address
      })

      if (!filteredEvents || filteredEvents.length === 0) {
        console.log('No se encontraron transacciones relevantes')
        setTransactions([])
        setLoading(false)
        return
      }

      const processedTransactions = await Promise.all(
        filteredEvents.map(async (event) => {
          try {
            const args = event.args
            if (!args || args.length < 4) return null

            const [tokenId, from, to, cantidad] = args
            const fromAddress = from.toString().toLowerCase()
            const toAddress = to.toString().toLowerCase()

            const fromParticipant = usuarios.find(
              (user: Participant) => user.direccion?.toLowerCase() === fromAddress
            )
            const toParticipant = usuarios.find(
              (user: Participant) => user.direccion?.toLowerCase() === toAddress
            )

            if (!fromParticipant || !toParticipant) {
              console.log('Participante no encontrado:', { fromAddress, toAddress })
              return null
            }

            const [attrNames, receipt, block, token] = await Promise.all([
              tokensContract.getNombresAtributos(tokenId),
              provider.getTransactionReceipt(event.transactionHash),
              provider.getBlock(event.blockNumber),
              tokensContract.tokens(tokenId)
            ])

            console.log('Datos del token:', {
              tokenId: tokenId.toString(),
              attrNames,
              token
            })

            if (!receipt || !block) {
              console.log('Receipt o block no encontrado para tx:', event.transactionHash)
              return null
            }

            // Procesar los atributos obteniendo los valores uno por uno
            const attributes = await Promise.all(
              attrNames.map(async (name: string) => {
                try {
                  const attr = await tokensContract.getAtributo(tokenId, name)
                  return {
                    nombre: name,
                    valor: attr.valor || '',
                    timestamp: Number(attr.timestamp || block.timestamp)
                  }
                } catch (error) {
                  console.error('Error al obtener atributo:', name, error)
                  return {
                    nombre: name,
                    valor: '',
                    timestamp: Number(block.timestamp)
                  }
                }
              })
            ).then(attrs => attrs.filter(attr => attr.nombre !== ''))

            console.log('Atributos procesados:', attributes)

            // Determinar el estado de la transferencia
            let estado = EstadoTransferencia.COMPLETADA
            let transferId = 0

            // Usar el evento actual en lugar de buscar todos los eventos de nuevo
            const transactionHash = event.transactionHash
            const blockTimestamp = Number(block.timestamp)

            const transaction: DetailedTransaction = {
              id: transactionHash,
              tokenId: Number(tokenId),
              transferId,
              blockNumber: event.blockNumber,
              gasUsed: receipt.gasUsed.toString(),
              gasPrice: receipt.gasPrice?.toString() || '0',
              timestamp: blockTimestamp,
              estado,
              product: token[1],
              description: token[3],
              quantity: Number(cantidad),
              attributes,
              rawMaterials: [],
              fromLocation: fromParticipant.gps.split(',').map(Number) as [number, number],
              toLocation: toParticipant.gps.split(',').map(Number) as [number, number],
              from: {
                address: fromAddress,
                name: fromParticipant.nombre,
                role: fromParticipant.rol,
                gps: fromParticipant.gps,
                active: fromParticipant.activo
              },
              to: {
                address: toAddress,
                name: toParticipant.nombre,
                role: toParticipant.rol,
                gps: toParticipant.gps,
                active: toParticipant.activo
              }
            }

            return transaction
          } catch (error) {
            console.error('Error procesando transacción:', error)
            return null
          }
        })
      )

      const validTransactions = processedTransactions.filter(
        (tx): tx is DetailedTransaction => tx !== null
      )

      setTransactions(validTransactions)
      setLoading(false)
    } catch (error) {
      console.error('Error al cargar transacciones:', error)
      setError('Error al cargar las transacciones')
      setLoading(false)
    }
  }

  if (isAuthLoading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-olive-600"></div>
    </div>
  }

  if (!isAuthenticated) {
    return null // La redirección se maneja en el useEffect
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-olive-600"></div>
    </div>
  }

  if (error) {
    return <div className="text-red-600 p-4">Error: {error}</div>
  }

  if (!transactions.length) {
    return <div className="text-gray-600 p-4">No hay transacciones disponibles</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Transacciones</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {loading ? (
        <div className="text-center">Cargando transacciones...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center">No hay transacciones para mostrar</div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <TransactionDetails 
              key={transaction.id} 
              transaction={transaction}
            />
          ))}
        </div>
      )}
    </div>
  )
}
