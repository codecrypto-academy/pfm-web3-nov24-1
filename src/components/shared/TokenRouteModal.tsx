'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useWeb3 } from '@/context/Web3Context'

interface Usuario {
    direccion: string
    nombre: string
    gps: string
    rol: string
    activo: boolean
}

interface Transfer {
    uniqueId: string
    id: number
    tokenId: number
    from: string
    fromName: string
    to: string
    toName: string
    cantidad: number
    timestamp: number
    estado: number
    blockNumber: number
    transactionIndex: number
}

interface TokenRouteModalProps {
    isOpen: boolean
    onClose: () => void
    tokenId: number
    creador: string
}

export default function TokenRouteModal({ isOpen, onClose, tokenId, creador }: TokenRouteModalProps) {
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { address } = useWeb3()

    useEffect(() => {
        if (isOpen && tokenId) {
            loadTransferHistory()
        }
    }, [isOpen, tokenId])

    const loadTransferHistory = async () => {
        try {
            if (!window.ethereum) throw new Error('No ethereum provider found')
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

            console.log('Buscando eventos para el token:', tokenId)
            
            // Obtener eventos de transferencia
            const filter = tokensContract.filters.TokenTransferido()
            const events = await tokensContract.queryFilter(filter)
            
            console.log('Eventos encontrados:', events.length)
            console.log('Ejemplo de evento:', events[0])
            
            // Filtrar los eventos que corresponden a este token y son EventLog
            const tokenEvents = events
                .filter((event): event is ethers.EventLog => {
                    if (!(event instanceof ethers.EventLog)) {
                        console.log('Evento no es EventLog:', event)
                        return false
                    }
                    
                    console.log('Argumentos del evento:', {
                        args: event.args,
                        eventName: event.eventName,
                        address: event.address
                    })
                    
                    // Verificar que el evento tenga el tokenId correcto
                    const eventTokenId = event.args && event.args.tokenId !== undefined 
                        ? Number(event.args.tokenId)
                        : Number(event.args?.[2]) // Intentar acceder por índice si no está por nombre
                        
                    console.log('Comparando tokenId:', eventTokenId, 'con', tokenId)
                    return eventTokenId === tokenId
                })

            console.log('Eventos válidos:', tokenEvents.length)
            console.log('Eventos filtrados:', tokenEvents)

            // Obtener detalles de cada transferencia
            const transferDetails = await Promise.all(
                tokenEvents.map(async (event) => {
                    try {
                        console.log('Procesando evento:', {
                            args: event.args,
                            eventName: event.eventName,
                            address: event.address,
                            blockNumber: event.blockNumber,
                            transactionIndex: event.transactionIndex
                        })
                        
                        // Intentar obtener transferId por nombre o por índice
                        const transferId = event.args.transferId !== undefined 
                            ? event.args.transferId 
                            : event.args[0]
                            
                        console.log('TransferId:', transferId)
                        const transfer = await tokensContract.transfers(transferId)
                        
                        console.log('Transfer obtenido:', transfer)
                        
                        // Obtener todos los usuarios
                        const usuarios = await usuariosContract.getUsuarios() as Usuario[]
                        console.log('Usuarios obtenidos:', usuarios)

                        // Encontrar los usuarios específicos
                        const fromUser = usuarios.find((u: Usuario) => u.direccion.toLowerCase() === transfer.from.toLowerCase())
                        const toUser = usuarios.find((u: Usuario) => u.direccion.toLowerCase() === transfer.to.toLowerCase())

                        console.log('Usuarios encontrados:', { fromUser, toUser })

                        // Crear un ID único usando el número de bloque y el índice de la transacción
                        const uniqueId = `${event.blockNumber}-${event.transactionIndex}-${transferId}`

                        return {
                            uniqueId,
                            id: Number(transferId),
                            tokenId: Number(transfer.tokenId),
                            from: transfer.from,
                            fromName: fromUser?.nombre || 'Desconocido',
                            to: transfer.to,
                            toName: toUser?.nombre || 'Desconocido',
                            cantidad: Number(transfer.cantidad),
                            timestamp: Number(transfer.timestamp),
                            estado: Number(transfer.estado),
                            blockNumber: event.blockNumber,
                            transactionIndex: event.transactionIndex
                        }
                    } catch (err) {
                        console.error('Error procesando evento:', err)
                        throw err
                    }
                })
            )

            console.log('Transfers procesados:', transferDetails)

            // Ordenar por timestamp
            setTransfers(transferDetails.sort((a, b) => a.timestamp - b.timestamp))
            setLoading(false)
        } catch (err) {
            console.error('Error loading transfer history:', err)
            setError('Error cargando el historial de transferencias')
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const getEstadoText = (estado: number) => {
        switch (estado) {
            case 0: return 'Pendiente'
            case 1: return 'Completada'
            case 2: return 'Rechazada'
            default: return 'Desconocido'
        }
    }

    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp * 1000)
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Ruta del Token</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-olive-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-red-600 p-4">{error}</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded">
                                <p className="text-sm font-medium text-gray-700">Creador Original</p>
                                <p className="text-sm text-gray-600 break-all">{creador}</p>
                            </div>

                            <div className="overflow-y-auto max-h-[50vh]">
                                <h3 className="text-lg font-medium mb-2">Historial de Transferencias</h3>
                                {transfers.length === 0 ? (
                                    <p className="text-gray-500">No hay transferencias registradas</p>
                                ) : (
                                    <div className="space-y-3">
                                        {transfers.map((transfer) => (
                                            <div key={transfer.uniqueId} className="bg-gray-50 p-4 rounded">
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div key={`from-${transfer.uniqueId}`}>
                                                        <p className="font-medium text-gray-700">De:</p>
                                                        <p className="text-gray-600">{transfer.fromName}</p>
                                                        <p className="text-gray-400 text-xs break-all">{transfer.from}</p>
                                                    </div>
                                                    <div key={`to-${transfer.uniqueId}`}>
                                                        <p className="font-medium text-gray-700">Para:</p>
                                                        <p className="text-gray-600">{transfer.toName}</p>
                                                        <p className="text-gray-400 text-xs break-all">{transfer.to}</p>
                                                    </div>
                                                    <div key={`amount-${transfer.uniqueId}`}>
                                                        <p className="font-medium text-gray-700">Cantidad:</p>
                                                        <p className="text-gray-600">{transfer.cantidad / 1000} kg</p>
                                                    </div>
                                                    <div key={`status-${transfer.uniqueId}`}>
                                                        <p className="font-medium text-gray-700">Estado:</p>
                                                        <p className="text-gray-600">{getEstadoText(transfer.estado)}</p>
                                                    </div>
                                                    <div key={`date-${transfer.uniqueId}`} className="col-span-2">
                                                        <p className="font-medium text-gray-700">Fecha:</p>
                                                        <p className="text-gray-600">{formatDate(transfer.timestamp)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
