'use client'

import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
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
            
            const provider = new ethers.BrowserProvider(window.ethereum)
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            const tokenList = []
            let index = 0
            let continueLoop = true

            while (continueLoop && index < 100) {
                try {
                    const token = await tokensContract.tokens(index)
                    
                    if (token[1]) { // Si tiene nombre
                        // Obtener el balance del minorista para este token
                        const balance = await tokensContract.tokens(index)
                        const minoristaBalance = balance[6]?.[address] || 0 // Accediendo al mapping balances[address]
                        
                        // Solo agregar si el minorista tiene balance
                        if (minoristaBalance > 0) {
                            const enTransito = await tokensContract.tokensEnTransito(address, index)
                            
                            tokenList.push({
                                id: index,
                                nombre: token[1],
                                descripcion: token[3],
                                cantidad: ethers.formatUnits(minoristaBalance, 0),
                                creador: token[2],
                                balance: ethers.formatUnits(enTransito, 0)
                            })
                        }
                    } else {
                        continueLoop = false
                    }
                    index++
                } catch (err) {
                    continueLoop = false
                }
            }

            setTokens(tokenList)
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
