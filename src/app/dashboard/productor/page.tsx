'use client'
import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'

interface Token {
    id: number
    nombre: string
    descripcion: string
    cantidad: number
    timestamp: number
}

export default function ProductorDashboard() {
    const { address } = useWeb3()
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedRows, setExpandedRows] = useState<number[]>([])

    const fetchTokens = async () => {
        setLoading(true)
        console.log("Fetching tokens for:", address)

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                signer
            )

            // Get token created events
            const filter = contract.filters.TokenCreado()
            const events = await contract.queryFilter(filter)
            console.log("Events found:", events)

            const tokenPromises = events.map(async (event) => {
                const token = await contract.tokens(event.args.id)
                return token
            })

            const allTokens = await Promise.all(tokenPromises)
            const userTokens = allTokens.filter(token =>
                token.creador.toLowerCase() === address.toLowerCase()
            )

            console.log("User tokens:", userTokens)
            setTokens(userTokens)
        } catch (error) {
            console.error("Error fetching tokens:", error)
        } finally {
            setLoading(false)
        }
    }
    const toggleRow = (tokenId: number) => {
        setExpandedRows(prev =>
            prev.includes(tokenId)
                ? prev.filter(id => id !== tokenId)
                : [...prev, tokenId]
        )
    }

    useEffect(() => {
        if (address) {
            fetchTokens()
        }
    }, [address])

    return (
        <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold mb-6">Mis Productos</h1>

            {loading ? (
                <div>Cargando productos...</div>
            ) : tokens.length === 0 ? (
                <div>No hay productos creados</div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="w-10 px-6 py-3"></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tokens.map((token) => (
                                <>
                                    <tr key={token.id}>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleRow(token.id)}
                                                className="text-olive-600 hover:text-olive-800"
                                            >
                                                {expandedRows.includes(token.id) ? '-' : '+'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{token.id.toString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{token.nombre}</td>
                                        <td className="px-6 py-4">{token.descripcion}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{token.cantidad.toString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(Number(token.timestamp) * 1000).toLocaleDateString()}
                                        </td>
                                    </tr>
                                    {expandedRows.includes(token.id) && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="space-y-2 text-sm">
                                                    <p><span className="font-semibold">Creador:</span> {token.creator}</p>
                                                    <p><span className="font-semibold">Token Padre ID:</span> {token.idPadre.toString()}</p>
                                                    <p><span className="font-semibold">Timestamp:</span> {new Date(Number(token.timestamp) * 1000).toLocaleString()}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}