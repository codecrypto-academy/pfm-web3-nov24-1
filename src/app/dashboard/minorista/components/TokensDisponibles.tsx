'use client'

import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect } from 'react'
import { ethers, EventLog } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'

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

    console.log('TokensDisponibles renderizado, address:', address)

    useEffect(() => {
        console.log('TokensDisponibles useEffect ejecutado, address:', address)
        if (address) {
            console.log('Llamando a loadTokens()')
            loadTokens()
        } else {
            console.log('No hay address, estableciendo loading a false')
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
            <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                <span className="ml-2">Cargando tokens...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-red-600 p-4">
                {error}
            </div>
        )
    }

    if (tokens.length === 0) {
        return (
            <div className="text-gray-600 p-4">
                No tienes tokens en este momento.
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token) => (
                <div key={token.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold text-gray-800">{token.nombre}</h3>
                    <p className="text-sm text-gray-600 mt-1">{token.descripcion}</p>
                    <div className="mt-4 space-y-2">
                        <p className="text-sm">
                            <span className="font-semibold">Tu Balance:</span> {token.cantidad}
                        </p>
                        <p className="text-sm">
                            <span className="font-semibold">En Tránsito:</span> {token.balance}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            <span className="font-semibold">Creador:</span> {token.creador}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}
