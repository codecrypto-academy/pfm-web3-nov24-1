'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import TransactionMap from '@/components/TransactionMap'
import TransactionDetails from '@/components/TransactionDetails'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { DetailedTransaction, RawMaterial } from '@/types/transactions'
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
    // No cargar transacciones si:
    // - La autenticación está cargando
    // - No está autenticado
    // - No hay dirección de wallet
    // - El rol en la URL no coincide con el rol del usuario
    if (
      isAuthLoading ||
      !isAuthenticated ||
      !address ||
      (userRole && urlRole !== userRole.toLowerCase())
    ) {
      return
    }

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
          CONTRACTS.TOKENS.ADDRESS,
          CONTRACTS.TOKENS.ABI,
          provider
        )
        const participantesContract = new ethers.Contract(
          CONTRACTS.PARTICIPANTES.ADDRESS,
          CONTRACTS.PARTICIPANTES.ABI,
          provider
        )

        // Verificar que los contratos estén inicializados
        if (!tokensContract || !participantesContract) {
          throw new Error('Error al inicializar los contratos')
        }

        // Cargar usuarios
        let usuarios
        try {
          usuarios = await participantesContract.getUsuarios()
          console.log('Usuarios cargados:', usuarios.length)
        } catch (error) {
          console.error('Error al cargar usuarios:', error)
          throw new Error('Error al cargar la lista de usuarios')
        }
        
        // Cargar transacciones
        const filter = tokensContract.filters.TokenTransferido()
        let events
        try {
          events = await tokensContract.queryFilter(filter)
          console.log(`Encontradas ${events.length} transacciones`)
        } catch (error) {
          console.error('Error al cargar transacciones:', error)
          throw new Error('Error al cargar las transacciones')
        }

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
                if (!args || args.length < 4) {
                  return null
                }

                const [tokenId, from, to, cantidad] = args
                const fromAddress = from.toLowerCase()
                const toAddress = to.toLowerCase()
                
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

                const [attrNames, rawMaterials, receipt, block] = await Promise.all([
                  tokensContract.getNombresAtributos(tokenId),
                  tokensContract.getMateriasPrimas(tokenId),
                  provider.getTransactionReceipt(event.transactionHash),
                  provider.getBlock(event.blockNumber)
                ])

                if (!receipt || !block) {
                  console.log('Receipt o block no encontrado para tx:', event.transactionHash)
                  return null
                }

                const fromGPS = fromParticipant.gps?.split(',').map(Number) || [0, 0]
                const toGPS = toParticipant.gps?.split(',').map(Number) || [0, 0]

                return {
                  id: event.transactionHash,
                  tokenId: Number(tokenId.toString()),
                  blockNumber: event.blockNumber,
                  gasUsed: receipt.gasUsed.toString(),
                  gasPrice: receipt.gasPrice.toString(),
                  timestamp: block.timestamp,
                  product: `Token #${tokenId.toString()}`,
                  description: 'Transacción de token',
                  quantity: Number(cantidad.toString()) / 1000,
                  attributes: await Promise.all(
                    attrNames.map(async (name: string) => {
                      try {
                        const attr = await tokensContract.getAtributo(tokenId, name)
                        return {
                          nombre: name,
                          valor: attr.valor,
                          timestamp: Number(attr.timestamp)
                        }
                      } catch (error) {
                        return {
                          nombre: name,
                          valor: 'Error al cargar',
                          timestamp: 0
                        }
                      }
                    })
                  ),
                  rawMaterials: rawMaterials.map((material: any) => ({
                    tokenHijo: Number(material.tokenHijo),
                    tokenPadre: Number(material.tokenPadre),
                    cantidadUsada: Number(material.cantidadUsada),
                    timestamp: Number(material.timestamp)
                  })),
                  from: {
                    address: fromAddress,
                    name: fromParticipant.nombre || 'Desconocido',
                    role: fromParticipant.rol || 'Desconocido',
                    gps: fromParticipant.gps || '0,0',
                    active: fromParticipant.activo || false
                  },
                  to: {
                    address: toAddress,
                    name: toParticipant.nombre || 'Desconocido',
                    role: toParticipant.rol || 'Desconocido',
                    gps: toParticipant.gps || '0,0',
                    active: toParticipant.activo || false
                  },
                  fromLocation: fromGPS as [number, number],
                  toLocation: toGPS as [number, number]
                } as DetailedTransaction
              } catch (error) {
                console.error('Error procesando transacción:', error)
                return null
              }
            })
        )

        const validTransactions = processedTransactions.filter((tx): tx is DetailedTransaction => tx !== null)
        setTransactions(validTransactions)
      } catch (error: any) {
        console.error('Error loading transactions:', error)
        setError(error.message || 'Error al cargar las transacciones')
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [address, isAuthenticated, isAuthLoading, router, urlRole])

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
    <div className="space-y-4 p-4">
      {transactions.map((transaction) => (
        <TransactionDetails key={transaction.id} transaction={transaction} />
      ))}
    </div>
  )
}
