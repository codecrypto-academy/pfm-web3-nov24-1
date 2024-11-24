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
    procesado?: boolean
    materiaPrima?: boolean
    atributos?: { [key: string]: TokenAttribute }
    nombresAtributos?: string[]
    relatedTokens?: RelatedToken[]
}

interface TokenAttribute {
    nombre: string
    valor: string | number | boolean
    timestamp: number
}

interface RelatedToken {
    id: number
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
            
            console.log('Cargando tokens para la fábrica...')
            
            const [transferEvents, createEvents] = await Promise.all([
                tokensContract.queryFilter(transferFilter, 0, latestBlock),
                tokensContract.queryFilter(createFilter, 0, latestBlock)
            ])

            console.log('Eventos encontrados:', {
                transferencias: transferEvents.length,
                creaciones: createEvents.length
            })

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

            console.log('Transferencias recibidas:', receivedTransfers)

            // Obtener detalles de los tokens recibidos
            const uniqueTokenIds = Array.from(new Set(receivedTransfers.map(t => t.tokenId)))
            console.log('IDs únicos de tokens:', uniqueTokenIds)

            const tokenDetails = await Promise.all(
                uniqueTokenIds.map(async (tokenId) => {
                    try {
                        const tokenData = await tokensContract.tokens(tokenId)
                        console.log(`Token ${tokenId} - Data:`, tokenData)
                        
                        const transfers = receivedTransfers.filter(t => t.tokenId === tokenId)
                        const totalCantidad = transfers.reduce((sum, t) => sum + t.cantidad, 0)
                        
                        // Obtener atributos del token
                        const nombresAtributos = await tokensContract.getNombresAtributos(tokenId)
                        console.log(`Token ${tokenId} - Atributos encontrados:`, nombresAtributos)
                        
                        const atributos: { [key: string]: TokenAttribute } = {}
                        
                        // Obtener cada atributo
                        for (const nombre of nombresAtributos) {
                            const attr = await tokensContract.getAtributo(tokenId, nombre)
                            console.log(`Token ${tokenId} - Atributo ${nombre}:`, attr)
                            if (attr && attr[0]) { // attr[0] es el nombre
                                atributos[nombre] = {
                                    nombre: attr[0],
                                    valor: attr[1], // attr[1] es el valor
                                    timestamp: Number(attr[2]) // attr[2] es el timestamp
                                }
                            }
                        }

                        console.log(`Token ${tokenId} - Atributos cargados:`, atributos)

                        // Verificar si es un producto procesado y materia prima basado en los atributos
                        const isProcesado = atributos['Procesado']?.valor === true || 
                                          atributos['Procesado']?.valor === 'true' ||
                                          atributos['procesado']?.valor === true ||
                                          atributos['procesado']?.valor === 'true';
                        const isMateriaPrima = atributos['MateriaPrima']?.valor === true || 
                                             atributos['MateriaPrima']?.valor === 'true' ||
                                             atributos['materiaPrima']?.valor === true ||
                                             atributos['materiaPrima']?.valor === 'true';

                        console.log(`Token ${tokenId} - Estado Final:`, {
                            isProcesado,
                            isMateriaPrima,
                            atributos,
                            cantidad: totalCantidad,
                            nombre: tokenData[1]
                        })

                        const relatedToken: RelatedToken = {
                            id: tokenId,
                            cantidad: totalCantidad,
                            timestamp: transfers[transfers.length - 1].timestamp
                        }

                        const newToken: Token = {
                            id: tokenId,
                            nombre: tokenData[1],
                            descripcion: tokenData[3] || '',
                            creador: tokenData[2],
                            cantidad: totalCantidad,
                            timestamp: transfers[transfers.length - 1].timestamp,
                            procesado: isProcesado,
                            materiaPrima: isMateriaPrima,
                            atributos,
                            nombresAtributos: Object.keys(atributos),
                            relatedTokens: [relatedToken]
                        }

                        return newToken
                    } catch (error) {
                        console.error(`Error cargando token ${tokenId}:`, error)
                        return null
                    }
                })
            )

            // Filtrar tokens nulos y tokens sin cantidad
            const validTokens = tokenDetails
                .filter((token): token is Token => 
                    token !== null && token.cantidad > 0
                );

            console.log('Tokens válidos encontrados:', validTokens.length)
            setTokens(validTokens)
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

    const handleProcessToken = async (token: Token, quantity: string) => {
        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            );

            // Esperar a que se complete la transacción
            const tx = await contract.procesarToken(
                token.id,
                quantity,
                ['Procesado', 'MateriaPrima'],
                ['true', 'false'],
                { gasLimit: 500000 }
            );
            await tx.wait();

            // Recargar los tokens
            await loadTokens();
            
        } catch (error: any) {
            console.error('Error al procesar el token:', error);
            setError(error.message || 'Error al procesar el token');
        } finally {
            setLoading(false);
        }
    };

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
        { id: 'productos', name: 'Productos Procesados' },
        { id: 'procesar', name: 'Procesar Productos' },
        { id: 'historial', name: 'Historial' },
        { id: 'pendientes', name: 'Transferencias Pendientes' },
    ]

    const renderTabContent = () => {
        switch (activeTab) {
            case 'materias':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tokens
                            .filter(token => {
                                const isMateriaPrima = token.atributos?.['MateriaPrima']?.valor === true || token.atributos?.['MateriaPrima']?.valor === 'true';
                                const isProcesado = token.atributos?.['Procesado']?.valor === true || token.atributos?.['Procesado']?.valor === 'true';
                                return isMateriaPrima && !isProcesado;
                            })
                            .map((token) => (
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
            case 'productos':
                const productosProcessados = tokens.filter(token => {
                    const isProcesado = token.atributos?.['Procesado']?.valor === true || 
                                      token.atributos?.['Procesado']?.valor === 'true' ||
                                      token.atributos?.['procesado']?.valor === true ||
                                      token.atributos?.['procesado']?.valor === 'true';
                    
                    console.log('Token:', token.id, 'Atributos:', token.atributos, 'isProcesado:', isProcesado);
                    return isProcesado;
                });

                console.log('Productos Procesados encontrados:', productosProcessados.length);
                
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {productosProcessados.map((token) => (
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
                                <div className="mt-4 pt-4 border-t">
                                    <h4 className="font-medium text-gray-700 mb-2">Atributos:</h4>
                                    {token.atributos && Object.entries(token.atributos).map(([key, attr]) => (
                                        <div key={key} className="text-sm text-gray-600">
                                            <span className="font-medium">{key}:</span> {String(attr.valor)}
                                        </div>
                                    ))}
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
                        {tokens.filter(token => {
                            const isMateriaPrima = token.atributos?.['MateriaPrima']?.valor === true || token.atributos?.['MateriaPrima']?.valor === 'true';
                            const isProcesado = token.atributos?.['Procesado']?.valor === true || token.atributos?.['Procesado']?.valor === 'true';
                            return isMateriaPrima && !isProcesado;
                        }).length}
                    </p>
                    <p className="text-gray-500">disponibles</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Productos Procesados
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">
                        {tokens.filter(token => {
                            const isProcesado = token.atributos?.['Procesado']?.valor === true || 
                                              token.atributos?.['Procesado']?.valor === 'true' ||
                                              token.atributos?.['procesado']?.valor === true ||
                                              token.atributos?.['procesado']?.valor === 'true';
                            return isProcesado;
                        }).length}
                    </p>
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
