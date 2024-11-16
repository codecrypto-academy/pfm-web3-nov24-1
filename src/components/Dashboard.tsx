'use client'
import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import React from 'react'
import { FC } from 'react'
import router from 'next/router'

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
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedToken, setSelectedToken] = useState<Token | null>(null)
    const [newQuantity, setNewQuantity] = useState('')

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

    // Función para crear nuevo lote
    const createNewLot = async (token: Token, quantity: string) => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                signer
            )

            const totalTokens = Number(quantity) * 1000

            const tx = await contract.crearToken(
                token.nombre,
                totalTokens,
                token.descripcion,
                token.id // Este será el token padre
            )

            await tx.wait()
            fetchTokens() // Refrescar la lista
            setIsModalOpen(false)
            setNewQuantity('')
        } catch (error) {
            console.error('Error:', error)
        }
    }

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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200">
                            {tokens.map((token) => (
                                <React.Fragment key={token.id}>
                                    <tr>
                                        <td className="px-6 py-4">
                                            <button onClick={() => toggleRow(token.id)} className="text-olive-600 hover:text-olive-800">
                                                {expandedRows.includes(token.id) ? '-' : '+'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{token.nombre}</td>
                                        <td className="px-6 py-4">{token.descripcion}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(token.cantidad / 1000).toString()} kg
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(Number(token.timestamp) * 1000).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedToken(token)
                                                    setIsModalOpen(true)
                                                }}
                                                className="text-olive-600 hover:text-olive-800 p-2 rounded-full hover:bg-olive-100 transition-colors"
                                                title="Crear Nuevo Lote"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRows.includes(token.id) && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={6}>
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <tbody>
                                                        <tr>
                                                            <td className="px-6 py-2 w-1/4 font-semibold">ID:</td>
                                                            <td className="px-6 py-2">{token.id.toString()}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-6 py-2 w-1/4 font-semibold">Creador:</td>
                                                            <td className="px-6 py-2">{token.creador}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-6 py-2 w-1/4 font-semibold">Cantidad Tokens:</td>
                                                            <td className="px-6 py-2">{token.cantidad.toString()}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-6 py-2 w-1/4 font-semibold">Token Padre ID:</td>
                                                            <td className="px-6 py-2">{token.idPadre.toString()}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-6 py-2 w-1/4 font-semibold">Timestamp:</td>
                                                            <td className="px-6 py-2">{new Date(Number(token.timestamp) * 1000).toLocaleString()}</td>
                                                        </tr>

                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                </div>
            )}
            {isModalOpen && selectedToken && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <div className="flex flex-col space-y-4">
                            <h3 className="text-xl font-bold text-gray-900">
                                Nuevo Lote: {selectedToken.nombre}
                            </h3>

                            <input
                                type="number"
                                value={newQuantity}
                                onChange={(e) => setNewQuantity(e.target.value)}
                                className="w-full p-3 border rounded-md"
                                placeholder="Cantidad en kg"
                            />

                            <div className="flex justify-center gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false)
                                        setNewQuantity('')
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => createNewLot(selectedToken, newQuantity)}
                                    className="px-4 py-2 bg-[#6D8B74] text-white rounded-md hover:bg-[#5F7A65] transition-colors"
                                >
                                    Crear Lote
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Dashboard

