'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import TransactionMap from '@/components/TransactionMap'
import TransactionDetails from '@/components/TransactionDetails'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { DetailedTransaction, RawMaterial, EstadoTransferencia } from '@/types/transactions'
import { useRouter } from 'next/navigation'

interface Participant {
  direccion: string
  nombre: string
  rol: string
  gps: string
  activo: boolean
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

  // Función para aceptar una transferencia
  const handleAcceptTransfer = async (transferId: number) => {
    if (!address) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const tokensContract = new ethers.Contract(
        CONTRACTS.Tokens.address,
        CONTRACTS.Tokens.abi,
        signer
      )

      const tx = await tokensContract.aceptarTransferencia(transferId)
      await tx.wait()

      // Recargar las transacciones
      loadTransactions()
    } catch (error) {
      console.error('Error al aceptar la transferencia:', error)
      setError('Error al aceptar la transferencia')
    }
  }

  // Función para rechazar una transferencia
  const handleRejectTransfer = async (transferId: number) => {
    if (!address) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const tokensContract = new ethers.Contract(
        CONTRACTS.Tokens.address,
        CONTRACTS.Tokens.abi,
        signer
      )

      const tx = await tokensContract.rechazarTransferencia(transferId)
      await tx.wait()

      // Recargar las transacciones
      loadTransactions()
    } catch (error) {
      console.error('Error al rechazar la transferencia:', error)
      setError('Error al rechazar la transferencia')
    }
  }

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

      if (!tokensContract || !usuariosContract) {
        throw new Error('Error al inicializar los contratos')
      }

      // Cargar usuarios
      const usuarios = await usuariosContract.getUsuarios()
      console.log('Usuarios cargados:', usuarios.length)

      // Cargar transferencias pendientes si es fábrica
      let pendingTransferIds: number[] = []
      if (role === 'fabrica') {
        pendingTransferIds = await tokensContract.getTransferenciasPendientes(address)
      }

      // Cargar transacciones
      const filter = tokensContract.filters.TokenTransferido()
      const latestBlock = await provider.getBlockNumber()
      const rawEvents = await tokensContract.queryFilter(filter, 0, latestBlock)
      console.log(`Encontradas ${rawEvents.length} transacciones`)

      // Filtrar eventos válidos y por rol
      const events = rawEvents
        .filter((event): event is ethers.EventLog => event instanceof ethers.EventLog)
        .filter((event) => {
          if (!event.args || event.args.length < 4) {
            console.log('Evento sin argumentos válidos:', event)
            return false
          }

          const from = event.args[1].toString().toLowerCase()
          const to = event.args[2].toString().toLowerCase()
          const userAddress = address?.toLowerCase()

          if (!userAddress) return false

          if (role === 'productor') {
            return from === userAddress
          } else if (role === 'fabrica') {
            return to === userAddress
          }
          return from === userAddress || to === userAddress
        })

      console.log(`Filtradas ${events.length} transacciones para el rol ${role}`)

      if (!events || events.length === 0) {
        setTransactions([])
        setLoading(false)
        return
      }

      const processedTransactions = await Promise.all(
        events
          .filter((event): event is ethers.EventLog => 'args' in event)
          .map(async (event) => {
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

              if (!receipt || !block) {
                console.log('Receipt o block no encontrado para tx:', event.transactionHash)
                return null
              }

              // Determinar el estado de la transferencia
              let estado = EstadoTransferencia.COMPLETADA
              let transferId = 0
              
              // Si es una transferencia pendiente, actualizar su estado
              if (pendingTransferIds.length > 0) {
                for (const id of pendingTransferIds) {
                  const transfer = await tokensContract.transfers(id)
                  if (transfer.tokenId.toString() === tokenId.toString() &&
                      transfer.from.toLowerCase() === fromAddress &&
                      transfer.to.toLowerCase() === toAddress) {
                    console.log('Estado de transferencia:', Number(transfer.estado))
                    // Asegurarse de que el estado sea un número válido del enum
                    const estadoNum = Number(transfer.estado)
                    if (estadoNum >= 0 && estadoNum <= 2) {
                      estado = estadoNum
                    } else {
                      console.warn('Estado de transferencia inválido:', estadoNum)
                      estado = EstadoTransferencia.COMPLETADA // valor por defecto
                    }
                    transferId = id
                    break
                  }
                }
              }

              const transaction: DetailedTransaction = {
                id: event.transactionHash,
                transferId,
                tokenId: Number(tokenId),
                blockNumber: event.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: receipt.gasPrice?.toString() || '0',
                timestamp: Number(block.timestamp),
                estado,
                product: token.nombre,
                description: token.descripcion,
                quantity: Number(cantidad),
                attributes: [],
                rawMaterials: [],
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
                },
                fromLocation: fromParticipant.gps.split(',').map(Number) as [number, number],
                toLocation: toParticipant.gps.split(',').map(Number) as [number, number]
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
