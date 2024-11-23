'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'
import ClientTransactions from '@/components/shared/ClientTransactions'
import PendingTransfers from '@/components/TransferenciasPendientes'

interface Token {
    id: number
    nombre: string
    descripcion?: string
    creador: string
    cantidad: number
    timestamp: number
}

export default function FabricaDashboard() {
    const { address, isAuthenticated, isLoading: isAuthLoading, role: userRole } = useWeb3()
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('materias')
    const router = useRouter()

    // Efecto para manejar la redirección basada en el rol
    useEffect(() => {
        if (isAuthLoading) return

        if (!isAuthenticated) {
            router.push('/')
            return
        }

        if (userRole && userRole !== 'fabrica') {
            router.push(`/dashboard/${userRole}`)
            return
        }
    }, [isAuthenticated, isAuthLoading, userRole, router])

    // Cargar los tokens de la fábrica
    const loadTokens = async () => {
        if (!address || !isAuthenticated) return

        try {
            setLoading(true)
            const provider = new ethers.BrowserProvider(window.ethereum)
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Obtener eventos de transferencia y creación
            const transferFilter = tokensContract.filters.TokenTransferido()
            const createFilter = tokensContract.filters.TokenCreado()
            const latestBlock = await provider.getBlockNumber()
            
            const [transferEvents, createEvents] = await Promise.all([
                tokensContract.queryFilter(transferFilter, 0, latestBlock),
                tokensContract.queryFilter(createFilter, 0, latestBlock)
            ])

            // Filtrar transferencias recibidas
            const receivedTransfers = transferEvents
                .filter((event: any) => 
                    event.args && 
                    event.args.to && 
                    event.args.to.toLowerCase() === address.toLowerCase()
                )
                .map((event: any) => ({
                    tokenId: Number(event.args.tokenId),
                    cantidad: Number(event.args.cantidad),
                    timestamp: event.args.timestamp || Math.floor(Date.now() / 1000)
                }))

            // Obtener detalles de los tokens recibidos
            const uniqueTokenIds = Array.from(new Set(receivedTransfers.map(t => t.tokenId)))
            const tokenDetails = await Promise.all(
                uniqueTokenIds.map(async (tokenId) => {
                    const token = await tokensContract.tokens(tokenId)
                    const transfers = receivedTransfers.filter(t => t.tokenId === tokenId)
                    const totalCantidad = transfers.reduce((sum, t) => sum + t.cantidad, 0)
                    
                    return {
                        id: tokenId,
                        nombre: token.nombre,
                        descripcion: token.descripcion || '',
                        creador: token.creador,
                        cantidad: totalCantidad,
                        timestamp: transfers[transfers.length - 1].timestamp
                    }
                })
            )

            // Obtener tokens creados por la fábrica
            const createdTokens = await Promise.all(
                createEvents
                    .filter((event: any) => 
                        event.args && 
                        event.args.creador.toLowerCase() === address.toLowerCase()
                    )
                    .map(async (event: any) => {
                        const token = await tokensContract.tokens(event.args.id)
                        return {
                            id: Number(event.args.id),
                            nombre: token.nombre,
                            descripcion: token.descripcion || '',
                            creador: event.args.creador,
                            cantidad: Number(event.args.cantidad),
                            timestamp: event.args.timestamp || Math.floor(Date.now() / 1000)
                        }
                    })
            )

            // Combinar y eliminar duplicados
            const allTokens = [...tokenDetails, ...createdTokens]
            const uniqueTokens = allTokens.filter((token, index, self) =>
                index === self.findIndex((t) => t.id === token.id)
            )

            setTokens(uniqueTokens)
            setLoading(false)
        } catch (error) {
            console.error('Error al cargar tokens:', error)
            setError('Error al cargar los tokens')
            setLoading(false)
        }
    }

    useEffect(() => {
        if (address && isAuthenticated) {
            loadTokens()
        }
    }, [address, isAuthenticated])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-olive-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-red-500 text-center p-4">
                {error}
            </div>
        )
    }

    const tabs = [
        { id: 'materias', name: 'Materias Primas' },
        { id: 'procesar', name: 'Procesar Productos' },
        { id: 'historial', name: 'Historial' },
        { id: 'pendientes', name: 'Transferencias Pendientes' },
    ]

    const renderTabContent = () => {
        switch (activeTab) {
            case 'materias':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tokens.map((token) => (
                            <div
                                key={token.id}
                                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                            >
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    {token.nombre}
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {token.descripcion || 'Sin descripción'}
                                </p>
                                <div className="flex justify-between items-center text-sm text-gray-500">
                                    <span>ID: {token.id}</span>
                                    <span>Cantidad: {token.cantidad}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            case 'procesar':
                return <div>Funcionalidad en desarrollo...</div>
            case 'historial':
                return <ClientTransactions role="fabrica" />
            case 'pendientes':
                return <PendingTransfers />
            default:
                return null
        }
    }

    return (
        <div className="container mx-auto p-8">
            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Materias Primas
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">
                        {tokens.length}
                    </p>
                    <p className="text-gray-500">disponibles</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Productos Procesados
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">0</p>
                    <p className="text-gray-500">creados</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Transferencias
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">0</p>
                    <p className="text-gray-500">pendientes</p>
                </div>
            </div>

            {/* Pestañas */}
            <div className="mb-8">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                    ${activeTab === tab.id
                                        ? 'border-olive-500 text-olive-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Contenido de la pestaña */}
            <div className="mt-6">
                {renderTabContent()}
            </div>
        </div>
    )
}
