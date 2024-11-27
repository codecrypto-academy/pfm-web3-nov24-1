'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useWeb3 } from '@/context/Web3Context'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const TransactionMap = dynamic(() => import('./shared/TransactionMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-pulse text-gray-500">Cargando mapa...</div>
    </div>
  )
})

interface Transfer {
    id: number
    tokenId: number
    from: string
    cantidad: number
    timestamp: number
    rutaMapaId: string
    token: {
        nombre: string
        descripcion: string
    }
    fromGPS?: [number, number]
    toGPS?: [number, number]
}

interface Participant {
    direccion: string
    nombre: string
    rol: string
    gps: string
    activo: boolean
}

export default function TransferenciasPendientesMinorista() {
    const { address, isAuthenticated, role } = useWeb3()
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [processingTransfer, setProcessingTransfer] = useState<number | null>(null)
    const router = useRouter()

    // Verificar rol y autenticación
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/')
            return
        }

        if (role !== 'minorista') {
            router.push(`/dashboard/${role}`)
            return
        }
    }, [isAuthenticated, role, router])

    const loadPendingTransfers = async () => {
        if (!address || !isAuthenticated || role !== 'minorista') return

        try {
            setLoading(true)
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

            // Obtener IDs de transferencias pendientes
            const pendingIds = await tokensContract.getTransferenciasPendientes(address)

            // Obtener usuarios para las coordenadas GPS
            const usuarios = await usuariosContract.getUsuarios()

            // Obtener detalles de cada transferencia
            const transferPromises = pendingIds.map(async (id: number) => {
                const transfer = await tokensContract.transfers(id)
                const token = await tokensContract.tokens(transfer.tokenId)
                
                // Encontrar participantes para obtener GPS
                const fromParticipant = usuarios.find(
                    (user: Participant) => user.direccion?.toLowerCase() === transfer.from.toLowerCase()
                )
                const toParticipant = usuarios.find(
                    (user: Participant) => user.direccion?.toLowerCase() === address?.toLowerCase()
                )

                return {
                    id: Number(id),
                    tokenId: Number(transfer.tokenId),
                    from: transfer.from,
                    cantidad: Number(transfer.cantidad),
                    timestamp: Number(transfer.timestamp),
                    rutaMapaId: transfer.rutaMapaId,
                    token: {
                        nombre: token.nombre,
                        descripcion: token.descripcion
                    },
                    fromGPS: fromParticipant?.gps ? fromParticipant.gps.split(',').map(Number) as [number, number] : undefined,
                    toGPS: toParticipant?.gps ? toParticipant.gps.split(',').map(Number) as [number, number] : undefined
                }
            })

            const transferDetails = await Promise.all(transferPromises)
            setTransfers(transferDetails)
            setError(null)
        } catch (error) {
            console.error('Error al cargar transferencias:', error)
            setError('Error al cargar las transferencias pendientes')
        } finally {
            setLoading(false)
        }
    }

    const handleAcceptTransfer = async (transferId: number) => {
        if (!address || !isAuthenticated || role !== 'minorista') return

        try {
            setProcessingTransfer(transferId)
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            const tx = await tokensContract.aceptarTransferencia(transferId)
            await tx.wait()

            // Recargar transferencias
            await loadPendingTransfers()
        } catch (error) {
            console.error('Error al aceptar transferencia:', error)
            setError('Error al aceptar la transferencia')
        } finally {
            setProcessingTransfer(null)
        }
    }

    const handleRejectTransfer = async (transferId: number) => {
        if (!address || !isAuthenticated || role !== 'minorista') return

        try {
            setProcessingTransfer(transferId)
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            const tx = await tokensContract.rechazarTransferencia(transferId)
            await tx.wait()

            // Recargar transferencias
            await loadPendingTransfers()
        } catch (error) {
            console.error('Error al rechazar transferencia:', error)
            setError('Error al rechazar la transferencia')
        } finally {
            setProcessingTransfer(null)
        }
    }

    useEffect(() => {
        if (address && isAuthenticated && role === 'minorista') {
            loadPendingTransfers()
        }
    }, [address, isAuthenticated, role])

    // Si no es minorista, no mostrar nada
    if (!isAuthenticated || role !== 'minorista') {
        return null
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-olive-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
            </div>
        )
    }

    if (transfers.length === 0) {
        return (
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-6 text-center">
                <p className="text-gray-500">No hay productos en camino</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {transfers.map((transfer) => (
                <div
                    key={transfer.id}
                    className="bg-white/50 backdrop-blur-sm rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-semibold text-olive-800">
                                {transfer.token.nombre}
                            </h3>
                            <p className="text-gray-600 mt-1">
                                {transfer.token.descripcion}
                            </p>
                            <div className="mt-4 space-y-2">
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Cantidad:</span> {transfer.cantidad} tokens ({transfer.cantidad / 1000} KG)
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Origen:</span>{' '}
                                    {transfer.from.slice(0, 6)}...{transfer.from.slice(-4)}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Fecha de inicio:</span>{' '}
                                    {new Date(transfer.timestamp * 1000).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAcceptTransfer(transfer.id)}
                                disabled={processingTransfer === transfer.id}
                                className="flex items-center px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                Aceptar
                            </button>
                            <button
                                onClick={() => handleRejectTransfer(transfer.id)}
                                disabled={processingTransfer === transfer.id}
                                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <XCircleIcon className="w-5 h-5 mr-2" />
                                Rechazar
                            </button>
                        </div>
                    </div>
                    
                    {transfer.fromGPS && transfer.toGPS && (
                        <div className="mt-4 h-64 border rounded-lg overflow-hidden">
                            <TransactionMap
                                fromLocation={transfer.fromGPS as [number, number]}
                                toLocation={transfer.toGPS as [number, number]}
                                transaction={{
                                    from: transfer.from,
                                    to: address || '',
                                    product: transfer.token.nombre,
                                    id: transfer.id.toString()
                                }}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
