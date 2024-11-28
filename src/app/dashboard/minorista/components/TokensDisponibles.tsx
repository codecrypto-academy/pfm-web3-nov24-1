'use client'

import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect } from 'react'
import { ethers, EventLog } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { ShoppingCartIcon, TagIcon, ClockIcon } from '@heroicons/react/24/outline'

interface Token {
    id: number;
    nombre: string;
    descripcion: string;
    cantidad: string;
    creador: string;
    balance: string;
}

export default function TokensDisponibles() {
    const { address } = useWeb3()
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedToken, setSelectedToken] = useState<Token | null>(null)

    useEffect(() => {
        if (address) {
            loadTokens()
        } else {
            setLoading(false)
        }
    }, [address])

    const loadTokens = async () => {
        try {
            if (!window.ethereum) {
                throw new Error('No ethereum provider found')
            }
            
            console.log('Iniciando carga de tokens para minorista:', address)
            const provider = new ethers.BrowserProvider(window.ethereum)
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Obtener el último bloque
            const latestBlock = await provider.getBlockNumber()
            const fromBlock = 0
            
            console.log('Buscando eventos desde el bloque', fromBlock, 'hasta', latestBlock)
            
            // Obtener eventos de transferencia
            const transferFilter = tokensContract.filters.TokenTransferido()
            const transferEvents = await tokensContract.queryFilter(transferFilter, fromBlock, latestBlock)
            console.log('Eventos de transferencia encontrados:', transferEvents.length)
            
            // Filtrar eventos donde el minorista es el destinatario
            const myTransferEvents = transferEvents
                .filter((e): e is EventLog => e instanceof EventLog)
                .filter(event => 
                    event.args.to.toLowerCase() === address?.toLowerCase()
                )
            
            console.log('Mis eventos de transferencia:', myTransferEvents.length)

            // Obtener IDs únicos de tokens
            const tokenIds = Array.from(new Set(
                myTransferEvents.map(event => Number(event.args.tokenId))
            ))

            console.log('Token IDs encontrados:', tokenIds)

            // Obtener datos de cada token
            const tokenPromises = tokenIds.map(async (tokenId) => {
                try {
                    const tokenData = await tokensContract.tokens(tokenId)
                    const balance = await tokensContract.getBalance(tokenId, address)
                    
                    if (balance > 0) {
                        const enTransito = await tokensContract.tokensEnTransito(address, tokenId)
                        
                        return {
                            id: tokenId,
                            nombre: tokenData[1],
                            descripcion: tokenData[3],
                            cantidad: balance.toString(),
                            creador: tokenData[2],
                            balance: enTransito.toString()
                        }
                    }
                    return null
                } catch (error) {
                    console.error(`Error obteniendo token ${tokenId}:`, error)
                    return null
                }
            })

            const validTokens = (await Promise.all(tokenPromises))
                .filter((token): token is Token => token !== null)

            console.log('Lista final de tokens:', validTokens)
            setTokens(validTokens)
        } catch (err) {
            console.error('Error cargando tokens:', err)
            setError('Error cargando los tokens disponibles')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="animate-pulse flex flex-col space-y-4">
                    <div className="h-12 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="bg-white p-6 rounded-lg shadow-sm">
                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Productos Disponibles</h1>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => {}} 
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700"
                        >
                            <ShoppingCartIcon className="h-5 w-5 mr-2" />
                            Ver Carrito
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tokens.map((token) => (
                        <div 
                            key={token.id}
                            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">{token.nombre}</h3>
                                    <TagIcon className="h-6 w-6 text-olive-600" />
                                </div>
                                
                                <p className="text-gray-600 mb-4 line-clamp-2">{token.descripcion}</p>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <ClockIcon className="h-5 w-5 mr-2" />
                                        <span>Stock: {Number(token.cantidad) / 1000} kg</span>
                                    </div>
                                    {token.balance !== "0" && (
                                        <div className="text-sm text-amber-600">
                                            {Number(token.balance) / 1000} kg en tránsito
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-6">
                                    <button
                                        onClick={() => setSelectedToken(token)}
                                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                                    >
                                        Ver Detalles
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {tokens.length === 0 && (
                    <div className="text-center py-12">
                        <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos disponibles</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Los productos aparecerán aquí cuando estén disponibles.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
