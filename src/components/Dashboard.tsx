'use client'
import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import React from 'react'
import { FC } from 'react'

interface DashboardProps {
    role: 'productor' | 'fabrica' | 'distribuidor' | 'mayorista' | 'minorista'
}

interface Token {
    id: number
    idPadre: number
    nombre: string
    creador: string
    descripcion: string
    cantidad: number
    timestamp: number
}

const Dashboard: FC<DashboardProps> = ({ role }): React.ReactElement => {

    const { address } = useWeb3()
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedRows, setExpandedRows] = useState<number[]>([])

    // Fetch tokens logic
    const fetchTokens = async () => {
        setLoading(true)
        setError(null)

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                signer
            )

            const filter = contract.filters.TokenCreado()
            const events = await contract.queryFilter(filter)

            const tokenPromises = events.map(async (event) => {
                const eventLog = event as ethers.EventLog
                const tokenId = eventLog.args.id
                const tokenData = await contract.tokens(tokenId)

                return {
                    id: Number(tokenId),
                    idPadre: Number(tokenData[1]),
                    nombre: tokenData[2],
                    creador: tokenData[3],
                    descripcion: tokenData[4],
                    cantidad: Number(tokenData[5]),
                    timestamp: Number(tokenData[6])
                } as Token
            })

            const allTokens = await Promise.all(tokenPromises)
            const userTokens = allTokens.filter(token =>
                token.creador.toLowerCase() === address.toLowerCase()
            )

            setTokens(userTokens)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar los tokens')
            console.error("Error fetching tokens:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (address && address !== '') {
            fetchTokens()
        }
    }, [address])

    if (!address) return <div>Please connect your wallet</div>

    const toggleRow = (tokenId: number) => {
        setExpandedRows(prev =>
            prev.includes(tokenId)
                ? prev.filter(id => id !== tokenId)
                : [...prev, tokenId]
        )
    }

    // Role-specific transfer function
    const transferToken = async (tokenId: number, cantidad: number, toAddress: string) => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                signer
            )

            const tx = await contract.transferirToken(
                tokenId,
                address,
                toAddress,
                cantidad
            )

            await tx.wait()
            // Refresh tokens after transfer
            fetchTokens()
        } catch (error) {
            console.error('Error en la transferencia:', error)
        }
    }

    return (
        <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold mb-6">Mis Productos</h1>

            {loading ? (
                <div>Cargando productos...</div>
            ) : tokens.length === 0 ? (
                <div>No hay productos disponibles</div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="w-10 px-6 py-3"></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad Física (kg)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad Tokens</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tokens.map((token) => (
                                <React.Fragment key={token.id}>
                                    <tr>
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
                                        <td className="px-6 py-4 whitespace-nowrap">{(token.cantidad / 1000).toString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{token.cantidad.toString()}</td>
                                        <td className="px-6 py-4">
                                            {role !== 'minorista' && (
                                                <button
                                                    onClick={() => transferToken(token.id, token.cantidad, 'ADDRESS_TO_TRANSFER')}
                                                    className="bg-olive-600 text-white px-4 py-2 rounded hover:bg-olive-700"
                                                >
                                                    Transferir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedRows.includes(token.id) && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={7} className="px-6 py-4">
                                                <div className="space-y-2 text-sm">
                                                    <p><span className="font-semibold">Creador:</span> {token.creador}</p>
                                                    <p><span className="font-semibold">Token Padre ID:</span> {token.idPadre.toString()}</p>
                                                    <p><span className="font-semibold">Timestamp:</span> {new Date(Number(token.timestamp) * 1000).toLocaleString()}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default Dashboard

