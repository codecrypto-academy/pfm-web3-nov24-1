'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'

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

            const events = await tokensContract.queryFilter('TokenCreado')
            const fabricaTokens = events
                .filter((event: any) => event.args.creador.toLowerCase() === address.toLowerCase())
                .map((event: any) => ({
                    id: Number(event.args.id),
                    nombre: event.args.nombre,
                    creador: event.args.creador,
                    cantidad: Number(event.args.cantidad),
                    timestamp: event.args.timestamp || Date.now()
                }))

            setTokens(fabricaTokens)
            setError(null)
        } catch (error) {
            console.error('Error al cargar tokens:', error)
            setError('Error al cargar los productos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (address) {
            loadTokens()
        }
    }, [address])

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
                <span className="ml-3">Verificando autenticación...</span>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
                <span className="ml-3">Cargando productos...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-600">{error}</div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Panel de Fábrica</h1>

            {/* Sección de Productos */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Mis Productos</h2>
                {tokens.length === 0 ? (
                    <p className="text-gray-500">No hay productos registrados</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tokens.map(token => (
                            <div key={token.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <h3 className="font-semibold text-lg text-olive-800">{token.nombre}</h3>
                                <div className="mt-2 space-y-1">
                                    <p className="text-gray-600">ID: {token.id}</p>
                                    <p className="text-gray-600">Cantidad: {token.cantidad}</p>
                                    <p className="text-gray-600">
                                        Fecha: {new Date(token.timestamp * 1000).toLocaleDateString()}
                                    </p>
                                    {token.descripcion && (
                                        <p className="text-gray-600 mt-2">{token.descripcion}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
