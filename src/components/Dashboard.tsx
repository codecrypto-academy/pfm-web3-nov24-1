'use client'
import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect } from 'react'
import { ethers, EventLog, Log } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import React from 'react'
import { FC } from 'react'
import router from 'next/router'

interface DashboardProps {
    role: 'productor' | 'fabrica' | 'distribuidor' | 'mayorista' | 'minorista'
}

interface Token {
    id: number
    nombre: string
    creador: string
    descripcion: string
    cantidad: number
    timestamp: number
    transactionHash: string
    relatedTokens: Token[]
    atributos?: { nombre: string; valor: string; timestamp: number }[]
}

// Definir la interfaz para los argumentos del evento
interface TransferEventArgs {
    tokenId: bigint;
    from: string;
    to: string;
    cantidad: bigint;
}

interface TokenTransferidoEvent extends Omit<EventLog, 'args'> {
    args: TransferEventArgs;
}

interface CreatedEventArgs {
    id: bigint;
    nombre: string;
    creador: string;
    cantidad: bigint;
}

interface TokenCreadoEvent extends Omit<EventLog, 'args'> {
    args: CreatedEventArgs;
}

const Dashboard: FC<DashboardProps> = ({ role }): React.ReactElement => {

    const { address } = useWeb3()
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedRows, setExpandedRows] = useState<number[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
    const [selectedToken, setSelectedToken] = useState<Token | null>(null)
    const [newQuantity, setNewQuantity] = useState('')
    const [transferQuantity, setTransferQuantity] = useState('')
    const [selectedFactory, setSelectedFactory] = useState('')
    const [factories, setFactories] = useState<{ direccion: string; nombre: string }[]>([])
    const [factoryBalance, setFactoryBalance] = useState<string>('')

    // Fetch tokens logic
    const fetchTokens = async () => {
        setLoading(true)
        setError(null)

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                provider
            )

            // Get the latest block number
            const latestBlock = await provider.getBlockNumber()
            // Get events from the last 1000 blocks or from block 0 if chain is shorter
            const fromBlock = Math.max(0, latestBlock - 1000)
            
            // Get all transfer events
            const transferFilter = contract.filters.TokenTransferido()
            const transferEvents = await contract.queryFilter(transferFilter, fromBlock, latestBlock)
            const typedTransferEvents = transferEvents.filter((e): e is TokenTransferidoEvent => e instanceof EventLog)
            
            // Get all creation events
            const creationFilter = contract.filters.TokenCreado()
            const creationEvents = await contract.queryFilter(creationFilter, fromBlock, latestBlock)
            const typedCreationEvents = creationEvents.filter((e): e is TokenCreadoEvent => e instanceof EventLog)
            
            // Filter relevant events
            const relevantTransferEvents = typedTransferEvents.filter(event => 
                event.args.to.toLowerCase() === address?.toLowerCase()
            )

            const relevantCreationEvents = typedCreationEvents.filter(event =>
                event.args.creador.toLowerCase() === address?.toLowerCase()
            )

            // Get unique token IDs from both transfers and creations
            const tokenIds = Array.from(new Set([
                ...relevantTransferEvents.map(event => Number(event.args.tokenId)),
                ...relevantCreationEvents.map(event => Number(event.args.id))
            ]))

            // Get all tokens
            const tokenPromises = tokenIds.map(async (tokenId) => {
                try {
                    const tokenData = await contract.tokens(tokenId)
                    const balance = await contract.getBalance(tokenId, address)
                    
                    // Obtener atributos del token
                    const nombresAtributos = await contract.getNombresAtributos(tokenId)
                    const atributos = await Promise.all(
                        nombresAtributos.map(async (nombre: string) => {
                            const attr = await contract.getAtributo(tokenId, nombre)
                            return {
                                nombre: attr[0],
                                valor: attr[1],
                                timestamp: Number(attr[2])
                            }
                        })
                    )

                    return {
                        id: tokenId,
                        nombre: tokenData[1],
                        creador: tokenData[2],
                        descripcion: tokenData[3],
                        cantidad: Number(balance),
                        timestamp: Number(tokenData[5]),
                        transactionHash: relevantTransferEvents.find(e => Number(e.args.tokenId) === tokenId)?.transactionHash || '',
                        relatedTokens: [],
                        atributos
                    } as Token
                } catch (error) {
                    console.error(`Error fetching token ${tokenId}:`, error)
                    return null
                }
            })

            const allTokens = (await Promise.all(tokenPromises)).filter((token): token is Token => token !== null && token.cantidad > 0)
            
            // Group tokens by product name
            const groupedTokens = allTokens.reduce((acc, token) => {
                const existingProduct = acc.find(p => p.nombre === token.nombre)
                if (existingProduct) {
                    existingProduct.relatedTokens.push(token)
                } else {
                    acc.push({
                        ...token,
                        relatedTokens: [token]
                    })
                }
                return acc
            }, [] as Token[])

            console.log('Grouped tokens for role', role, ':', groupedTokens)
            setTokens(groupedTokens)
        } catch (err) {
            console.error("Error fetching tokens:", err)
            setError(err instanceof Error ? err.message : 'Error al cargar los tokens')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (address && address !== '') {
            fetchTokens()
        }
    }, [address])

    // Función para obtener las fábricas
    const fetchFactories = async () => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.PARTICIPANTES.ADDRESS,
                CONTRACTS.PARTICIPANTES.ABI,
                provider
            )

            const users = await contract.getUsuarios()
            const factoryUsers = users.filter((user: any) => 
                user.rol.toLowerCase() === 'fabrica' && user.activo
            )

            setFactories(factoryUsers.map((user: any) => ({
                direccion: user.direccion,
                nombre: user.nombre
            })))
        } catch (error) {
            console.error('Error al cargar fábricas:', error)
        }
    }

    useEffect(() => {
        if (role === 'productor') {
            fetchFactories()
        }
    }, [role])

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
                [], // array vacío para nombres de atributos
                []  // array vacío para valores de atributos
            )

            await tx.wait()
            fetchTokens() // Refrescar la lista
            setIsModalOpen(false)
            setNewQuantity('')
        } catch (error) {
            console.error('Error:', error)
            alert('Error al crear el lote: ' + (error instanceof Error ? error.message : 'Error desconocido'))
        }
    }

    // Función para obtener el balance de un token
    const getTokenBalance = async (tokenId: number, address: string) => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                provider
            )

            const token = await contract.tokens(tokenId)
            return Number(token.balances[address])
        } catch (error) {
            console.error('Error al obtener balance:', error)
            return 0
        }
    }

    // Función para obtener el balance de la fábrica
    const checkFactoryBalance = async (tokenId: number, factoryAddress: string) => {
        try {
            const balance = await getTokenBalance(tokenId, factoryAddress);
            setFactoryBalance(`Balance de la fábrica: ${Number(balance)/1000} kg`);
        } catch (error) {
            console.error('Error al obtener balance de la fábrica:', error);
            setFactoryBalance('Error al obtener balance');
        }
    };

    // Función para transferir tokens
    const handleTransfer = async () => {
        if (!selectedToken || !selectedFactory || !transferQuantity || !address) {
            console.error('Faltan datos para la transferencia');
            return;
        }

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const signerAddress = await signer.getAddress()
            
            // Verificar que el signer es el mismo que el address
            console.log('Verificación de direcciones:', {
                signer: signerAddress,
                from: address,
                to: selectedFactory
            });
            
            if (signerAddress.toLowerCase() !== address.toLowerCase()) {
                alert('Error: La dirección del signer no coincide con la dirección del remitente');
                return;
            }

            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                signer
            )

            const totalTokens = Number(transferQuantity) * 1000

            // Verificar que el destinatario no sea el mismo que el remitente
            if (address.toLowerCase() === selectedFactory.toLowerCase()) {
                alert('No puedes transferir tokens a tu propia dirección');
                return;
            }

            // Verificar que el destinatario es un usuario activo
            const usuariosContract = new ethers.Contract(
                CONTRACTS.PARTICIPANTES.ADDRESS,
                CONTRACTS.PARTICIPANTES.ABI,
                provider
            )
            const isActive = await usuariosContract.estaActivo(selectedFactory);
            if (!isActive) {
                alert('El destinatario no es un usuario activo');
                return;
            }

            // Verificar el balance antes de transferir
            const balance = await contract.getBalance(selectedToken.id, address);
            console.log('Current balance:', Number(balance));
            console.log('Attempting to transfer:', totalTokens);

            if (Number(balance) < totalTokens) {
                alert(`No tienes suficientes tokens. Balance actual: ${Number(balance)/1000} kg`);
                return;
            }

            console.log('Transferring token:', {
                tokenId: selectedToken.id,
                from: address,
                to: selectedFactory,
                amount: totalTokens
            });

            const tx = await contract.transferirToken(
                selectedToken.id,
                address,
                selectedFactory,
                totalTokens
            )

            await tx.wait()
            await checkFactoryBalance(selectedToken.id, selectedFactory);
            fetchTokens()
            setIsTransferModalOpen(false)
            setTransferQuantity('')
            setSelectedFactory('')
        } catch (error) {
            console.error('Error en la transferencia:', error)
            alert('Error al transferir tokens: ' + (error instanceof Error ? error.message : 'Error desconocido'))
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

    // Función para renderizar el título según el rol
    const getRoleTitle = () => {
        switch (role) {
            case 'productor':
                return 'Mis Productos'
            case 'fabrica':
                return 'Mis Materias Primas'
            case 'distribuidor':
                return 'Mis Productos Procesados'
            case 'mayorista':
                return 'Productos para Distribución'
            case 'minorista':
                return 'Productos para Venta'
            default:
                return 'Mis Tokens'
        }
    }

    // Función para obtener el texto del botón según el rol
    const getActionButtonText = () => {
        switch (role) {
            case 'productor':
                return 'Crear Nuevo Lote'
            case 'fabrica':
                return 'Procesar Materias Primas'
            case 'distribuidor':
                return 'Distribuir Productos'
            case 'mayorista':
                return 'Preparar para Venta'
            case 'minorista':
                return 'Vender Productos'
            default:
                return 'Crear Token'
        }
    }

    if (!address) return <div>Please connect your wallet</div>

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{getRoleTitle()}</h2>
            </div>

            {loading ? (
                <div className="text-center">
                    <p>Cargando tokens...</p>
                </div>
            ) : error ? (
                <div className="text-red-500">
                    <p>{error}</p>
                </div>
            ) : tokens.length === 0 ? (
                <div className="text-center text-gray-500">
                    <p>No hay tokens disponibles</p>
                </div>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
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
                                            <div className="flex flex-col">
                                                <span>{token.relatedTokens.reduce((sum, t) => sum + t.cantidad / 1000, 0)} kg</span>
                                                <span className="text-gray-500 text-xs">
                                                    {token.relatedTokens.reduce((sum, t) => sum + t.cantidad, 0)} tokens
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(Number(token.timestamp) * 1000).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                token.creador.toLowerCase() === address?.toLowerCase()
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {token.creador.toLowerCase() === address?.toLowerCase() ? 'Creado' : 'Recibido'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                {token.creador.toLowerCase() === address?.toLowerCase() && (
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
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows.includes(token.id) && (
                                        <tr className="bg-gray-50 transition-all duration-200 ease-in-out">
                                            <td colSpan={7}>
                                                <div className="p-4">
                                                    <div className="border-b border-gray-200 pb-4 mb-4">
                                                        <h4 className="text-lg font-semibold text-olive-600">
                                                            Historial de Lotes: {token.nombre}
                                                        </h4>
                                                        <p className="text-sm text-gray-500">
                                                            Mostrando todos los lotes relacionados con este producto
                                                        </p>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Token</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token Padre</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hash</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {token.relatedTokens.map(relatedToken => (
                                                                    <React.Fragment key={relatedToken.id}>
                                                                        <tr className="hover:bg-gray-50">
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                                {relatedToken.id}
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                                <div className="flex flex-col">
                                                                                    <span>{(relatedToken.cantidad / 1000)} kg</span>
                                                                                    <span className="text-gray-500 text-xs">{relatedToken.cantidad} tokens</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                                {new Date(relatedToken.timestamp * 1000).toLocaleDateString()}
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                                {relatedToken.id}
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                                <a
                                                                                    href={`https://sepolia.etherscan.io/tx/${relatedToken.transactionHash}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-blue-600 hover:text-blue-900"
                                                                                >
                                                                                    Ver transacción
                                                                                </a>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                                <div className="flex space-x-2">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setSelectedToken(relatedToken)
                                                                                            setIsTransferModalOpen(true)
                                                                                        }}
                                                                                        className="text-olive-600 hover:text-olive-800 ml-2"
                                                                                        title="Transferir Lote"
                                                                                    >
                                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                                                                        </svg>
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                        {relatedToken.atributos && relatedToken.atributos.length > 0 && (
                                                                            <tr className="bg-gray-50">
                                                                                <td colSpan={6} className="px-6 py-4">
                                                                                    <div className="mt-2">
                                                                                        <h5 className="text-sm font-medium text-gray-900 mb-2">Atributos del Lote:</h5>
                                                                                        <div className="grid grid-cols-3 gap-4">
                                                                                            {relatedToken.atributos.map((atributo, index) => (
                                                                                                <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                                                                                                    <div className="text-sm font-medium text-olive-600">{atributo.nombre}</div>
                                                                                                    <div className="text-sm text-gray-500">{atributo.valor}</div>
                                                                                                    <div className="text-xs text-gray-400">
                                                                                                        {new Date(atributo.timestamp * 1000).toLocaleDateString()}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </React.Fragment>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
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
            {/* Modal para crear nuevo lote */}
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
                                    disabled={!newQuantity || Number(newQuantity) <= 0}
                                >
                                    Crear Lote
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Transferencia */}
            {isTransferModalOpen && selectedToken && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h2 className="text-xl font-bold mb-4">Transferir Token</h2>
                        <div className="text-sm text-gray-600 mb-4">
                            Balance disponible: {selectedToken.cantidad / 1000} kg
                        </div>

                        <select
                            value={selectedFactory}
                            onChange={(e) => setSelectedFactory(e.target.value)}
                            className="w-full p-3 border rounded-md"
                        >
                            <option value="">Seleccionar Fábrica</option>
                            {factories.map((factory) => (
                                <option key={factory.direccion} value={factory.direccion}>
                                    {factory.nombre}
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            value={transferQuantity}
                            onChange={(e) => setTransferQuantity(e.target.value)}
                            className="w-full p-3 border rounded-md"
                            placeholder="Cantidad en kg"
                        />

                        {factoryBalance && (
                            <p className="mt-2 text-sm text-gray-600">{factoryBalance}</p>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setIsTransferModalOpen(false)
                                    setTransferQuantity('')
                                    setSelectedFactory('')
                                }}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleTransfer}
                                className="px-4 py-2 bg-[#6D8B74] text-white rounded-md hover:bg-[#5F7A65] transition-colors"
                                disabled={!transferQuantity || !selectedFactory || Number(transferQuantity) <= 0}
                            >
                                Transferir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Dashboard
