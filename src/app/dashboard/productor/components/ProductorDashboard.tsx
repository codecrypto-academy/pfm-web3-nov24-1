'use client'
import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect, useCallback } from 'react'
import { ethers, EventLog, Log } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import React from 'react'
import { FC } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightIcon, PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { createPortal } from 'react-dom'

// Declaración de tipos para window.ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

interface TokenAttribute {
    nombre: string;     // Nombre del atributo
    valor: string;      // Valor del atributo
    timestamp: number;  // Timestamp de cuando se añadió
}

interface RelatedToken {
    id: number;
    cantidad: number;
    timestamp: number;
}

interface Token {
    id: number;
    nombre: string;
    descripcion?: string;
    creador: string;
    cantidad: number;
    timestamp: number;
    isProcesado?: boolean;
    tokenPadre?: string;
    atributos: { [key: string]: TokenAttribute };  // Cambiado a un objeto para reflejar el mapping
    nombresAtributos: string[];                    // Array para iterar sobre los atributos
    relatedTokens: RelatedToken[];
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

const ProductorDashboard: FC = (): React.ReactElement => {
    const { address, isAuthenticated, isLoading: isAuthLoading, role: userRole } = useWeb3()
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
    const [lastUpdate, setLastUpdate] = useState(Date.now())
    const [newDescription, setNewDescription] = useState('')
    const [newAttributes, setNewAttributes] = useState<{ nombre: string; valor: string; timestamp: number }[]>([])
    const router = useRouter()

    useEffect(() => {
        if (isAuthLoading) return
        if (!isAuthenticated) {
            router.push('/')
            return
        }
        if (userRole && userRole !== 'productor') {
            router.push(`/dashboard/${userRole}`)
            return
        }
    }, [isAuthenticated, isAuthLoading, userRole, router])

    // Función auxiliar para reintentar llamadas RPC
    const retryRPC = async <T,>(
        fn: () => Promise<T>,
        retries = 3,
        delay = 1000
    ): Promise<T> => {
        try {
            return await fn()
        } catch (error: any) {
            if (retries === 0 || !error.message?.includes('Internal JSON-RPC error')) {
                throw error
            }
            await new Promise(resolve => setTimeout(resolve, delay))
            return retryRPC(fn, retries - 1, delay * 1.5)
        }
    }

    // Función para recargar tokens que retorna Promise<void>
    const reloadTokens = useCallback(async () => {
        await fetchTokens()
    }, [address])

    // Función para manejar el clic en crear lote
    const handleCreateBatchClick = (token: Token) => {
        setSelectedToken(token)
        setIsModalOpen(true)
    }

    // Función para manejar el clic en transferir
    const handleTransferClick = (token: Token) => {
        setSelectedToken(token)
        setIsTransferModalOpen(true)
    }

    // Fetch tokens logic
    const fetchTokens = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Get the latest block number
            const latestBlock = await provider.getBlockNumber()
            // Get events from the last 1000 blocks or from block 0 if chain is shorter
            const fromBlock = Math.max(0, latestBlock - 1000)
            
            // Get all creation events first
            const creationFilter = contract.filters.TokenCreado()
            const creationEvents = await retryRPC(() => contract.queryFilter(creationFilter, fromBlock, latestBlock))
            const typedCreationEvents = creationEvents.filter((e): e is TokenCreadoEvent => e instanceof EventLog)
            
            // Filter creation events by creator
            const myCreatedTokens = typedCreationEvents.filter(event =>
                event.args.creador.toLowerCase() === address?.toLowerCase()
            )

            // Get transfer events
            const transferFilter = contract.filters.TokenTransferido()
            const transferEvents = await retryRPC(() => contract.queryFilter(transferFilter, fromBlock, latestBlock))
            const typedTransferEvents = transferEvents.filter((e): e is TokenTransferidoEvent => e instanceof EventLog)
            
            // Filter transfer events where user is involved
            const relevantTransferEvents = typedTransferEvents.filter(event => 
                event.args.to.toLowerCase() === address?.toLowerCase() ||
                event.args.from.toLowerCase() === address?.toLowerCase()
            )

            // Get unique token IDs from both transfers and creations
            const tokenIds = Array.from(new Set([
                ...myCreatedTokens.map(event => Number(event.args.id)),
                ...relevantTransferEvents.map(event => Number(event.args.tokenId))
            ]))

            console.log('Token IDs encontrados:', tokenIds)

            // Get all tokens
            const tokenPromises = tokenIds.map(async (tokenId) => {
                try {
                    // Try to get the token data
                    const tokenData = await retryRPC(() => contract.tokens(tokenId))
                    if (!tokenData) {
                        console.log(`Token ${tokenId} no existe`)
                        return null
                    }

                    // Obtener el balance (incluso si es 0)
                    const balance = await retryRPC(() => contract.getBalance(tokenId, address).catch(() => 0))
                    
                    let atributos: { [key: string]: TokenAttribute } = {}

                    try {
                        // Obtener los nombres de atributos del token
                        const nombresAtributos = await retryRPC(() => contract.getNombresAtributos(tokenId))
                        for (const nombre of nombresAtributos) {
                            const attr = await retryRPC(() => contract.getAtributo(tokenId, nombre))
                            if (attr && attr[0]) { // attr[0] es el nombre
                                atributos[nombre] = {
                                    nombre: attr[0],
                                    valor: attr[1], // attr[1] es el valor
                                    timestamp: Number(attr[2]) // attr[2] es el timestamp
                                }
                            }
                        }
                    } catch (error) {
                        console.log(`Error obteniendo atributos para token ${tokenId}:`, error)
                    }

                    // Solo verificar si es un producto procesado para el rol fabrica
                    const isProcesado = false;

                    // Si es productor, incluir todos los tokens
                    // Si es fabrica, incluir solo los no procesados
                    const relatedToken: RelatedToken = {
                        id: tokenId,
                        cantidad: Number(balance),
                        timestamp: Number(tokenData[5])
                    }

                    const token: Token = {
                        id: tokenId,
                        nombre: tokenData[1],
                        descripcion: tokenData[3],
                        creador: tokenData[2],
                        cantidad: Number(balance),
                        timestamp: Number(tokenData[5]),
                        isProcesado,
                        atributos,
                        nombresAtributos: Object.keys(atributos),
                        relatedTokens: [relatedToken]
                    }

                    return token
                } catch (error) {
                    console.error(`Error fetching token ${tokenId}:`, error)
                    return null
                }
            })

            const allTokens = (await Promise.all(tokenPromises)).filter((token): token is Token => token !== null)
            
            // Group tokens by product name, including those with zero balance
            const groupedTokens = allTokens.reduce((acc, token) => {
                const existingProduct = acc.find(p => p.nombre === token.nombre)
                if (existingProduct) {
                    // Añadir el token a relatedTokens
                    const relatedToken: RelatedToken = {
                        id: token.id,
                        cantidad: token.cantidad,
                        timestamp: token.timestamp
                    }
                    existingProduct.relatedTokens.push(relatedToken)
                    
                    // Actualizar la cantidad total
                    existingProduct.cantidad += token.cantidad
                } else {
                    acc.push(token)
                }
                return acc
            }, [] as Token[])
            
            // Sort tokens by timestamp, most recent first
            const sortedTokens = groupedTokens.sort((a, b) => b.timestamp - a.timestamp)
            
            setTokens(sortedTokens)
        } catch (err) {
            console.error("Error fetching tokens:", err)
            setError(err instanceof Error ? err.message : 'Error al cargar los tokens')
        } finally {
            setLoading(false)
        }
    }, [address])

    useEffect(() => {
        if (!address) return;

        // Cargar tokens inicialmente
        reloadTokens();
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
            CONTRACTS.Tokens.address,
            CONTRACTS.Tokens.abi,
            provider
        );

        const handleNewToken = async () => {
            await reloadTokens();
        };

        // Solo suscribirse a los eventos que existen en el ABI
        contract.on("TokenCreado", handleNewToken);
        contract.on("TokenTransferido", handleNewToken);

        // Cleanup function
        return () => {
            contract.removeListener("TokenCreado", handleNewToken);
            contract.removeListener("TokenTransferido", handleNewToken);
        };
    }, [address]);

    useEffect(() => {
        fetchFactories()
    }, [])

    useEffect(() => {
        if (selectedToken) {
        }
    }, [selectedToken]);

    // Función para obtener las fábricas
    const fetchFactories = async () => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.Usuarios.address,
                CONTRACTS.Usuarios.abi,
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

    // Función para crear nuevo lote
    const createNewLot = async (token: Token, quantity: string) => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            const totalTokens = Number(quantity) * 1000

            // Verificar que todos los atributos requeridos tienen un valor
            if (token.atributos && Object.keys(token.atributos).length > 0) {
                const missingAttributes = Object.keys(token.atributos).filter(attr => 
                    !newAttributes.find(newAttr => newAttr.nombre === attr)
                );
                
                if (missingAttributes.length > 0) {
                    alert(`Por favor, complete todos los atributos requeridos: ${missingAttributes.join(', ')}`);
                    return;
                }
            }

            // Separar los atributos en dos arrays
            const nombresAtributos = newAttributes.map(attr => attr.nombre)
            const valoresAtributos = newAttributes.map(attr => attr.valor)

            const tx = await contract.crearToken(
                token.nombre,
                totalTokens,
                newDescription || token.descripcion || '',
                nombresAtributos,
                valoresAtributos
            )

            await tx.wait()
            reloadTokens() // Refrescar la lista
            setIsModalOpen(false)
            setNewQuantity('')
            setNewDescription('')
            setNewAttributes([])
            setSelectedToken(null)
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
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Use the getBalance function instead of trying to access the mapping directly
            const balance = await contract.getBalance(tokenId, address)
            return Number(balance)
        } catch (error) {
            console.error('Error al obtener balance:', error)
            return 0
        }
    }

    // Función para obtener el balance de la fábrica
    const checkFactoryBalance = async (tokenId: number, factoryAddress: string) => {
        if (!factoryAddress) {
            console.error('No factory address provided');
            setFactoryBalance('No se ha seleccionado una fábrica');
            return;
        }

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
            console.error('Faltan datos para la transferencia', {
                selectedToken,
                selectedFactory,
                transferQuantity,
                address
            });
            alert('Por favor, completa todos los campos antes de transferir.');
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
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
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
                CONTRACTS.Usuarios.address,
                CONTRACTS.Usuarios.abi,
                provider
            )
            const isActive = await usuariosContract.estaActivo(selectedFactory);
            if (!isActive) {
                alert('El destinatario no es un usuario activo');
                return;
            }

            // Verificar el balance antes de transferir
            const balance = await getTokenBalance(selectedToken.id, address);
            console.log('Current balance:', Number(balance));
            console.log('Attempting to transfer:', totalTokens);

            if (Number(balance) < totalTokens) {
                alert(`No tienes suficientes tokens. Balance actual: ${Number(balance)/1000} kg`);
                return;
            }

            console.log('Iniciando transferencia:', {
                tokenId: selectedToken.id,
                from: address,
                to: selectedFactory,
                amount: totalTokens
            });

            const tx = await contract.iniciarTransferencia(
                selectedToken.id,
                selectedFactory,
                totalTokens
            )

            await tx.wait()
            
            // Recargar balances y datos
            await checkFactoryBalance(selectedToken.id, selectedFactory);
            await reloadTokens();
            
            setIsTransferModalOpen(false)
            setTransferQuantity('')
            setSelectedFactory('')
            
            alert('Transferencia iniciada con éxito');
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
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            const tx = await contract.iniciarTransferencia(
                tokenId,
                toAddress,
                cantidad
            )

            await tx.wait()
            // Refresh tokens after transfer
            reloadTokens()
        } catch (error) {
            console.error('Error en la transferencia:', error)
        }
    }

    // Función para renderizar el título según el rol
    const getRoleTitle = () => 'Mis Productos'

    // Función para obtener el texto del botón según el rol
    const getActionButtonText = () => 'Crear Nuevo Lote'

    // Función para filtrar los tokens según el rol
    const filteredTokens = useCallback(() => tokens, [tokens])

    if (!address) return <div>Please connect your wallet</div>

    return (
        <>
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
                ) : (
                    <div className="space-y-8">
                        {/* Tabla principal de tokens */}
                        {filteredTokens().length > 0 ? (
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                <h3 className="text-xl font-semibold text-gray-800 p-4 bg-white border-b">
                                    Mis Productos
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="w-10 px-6 py-3"></th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Nombre
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Descripción
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Balance Total
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredTokens().map((token, index) => (
                                                <React.Fragment key={token.id}>
                                                    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                        <td className="px-6 py-4">
                                                            <button 
                                                                onClick={() => toggleRow(token.id)}
                                                                className="text-olive-600 hover:text-olive-800"
                                                            >
                                                                {expandedRows.includes(token.id) ? '-' : '+'}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">{token.nombre}</td>
                                                        <td className="px-6 py-4">{token.descripcion}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span>{token.cantidad / 1000} kg</span>
                                                                <span className="text-gray-500 text-xs">
                                                                    {token.cantidad} tokens
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex items-center justify-center space-x-4">
                                                                <button
                                                                    onClick={() => handleCreateBatchClick(token)}
                                                                    className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-full transition-colors"
                                                                    title="Crear Lote"
                                                                >
                                                                    <PlusIcon className="h-5 w-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {expandedRows.includes(token.id) && (
                                                        <tr>
                                                            <td colSpan={5}>
                                                                <div className="p-4 bg-gray-50">
                                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Remesas disponibles:</h4>
                                                                    <table className="min-w-full divide-y divide-gray-200">
                                                                        <thead className="bg-gray-100">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ID Remesa</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                                                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Acciones</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {token.relatedTokens.map((remesa, idx) => (
                                                                                <tr key={idx} className="hover:bg-gray-100">
                                                                                    <td className="px-4 py-2 text-sm">
                                                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                                            #{remesa.id}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-600">
                                                                                        {remesa.cantidad / 1000} kg
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-500">
                                                                                        {new Date(remesa.timestamp * 1000).toLocaleDateString()}
                                                                                    </td>
                                                                                    <td className="px-4 py-2">
                                                                                        <div className="flex items-center justify-center">
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setSelectedToken({
                                                                                                        ...token,
                                                                                                        cantidad: remesa.cantidad,
                                                                                                        id: remesa.id
                                                                                                    });
                                                                                                    setIsTransferModalOpen(true);
                                                                                                }}
                                                                                                className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-full transition-colors"
                                                                                                title="Transferir Remesa"
                                                                                            >
                                                                                                <ArrowRightIcon className="h-5 w-5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
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
                        ) : (
                            <div className="text-center text-gray-500">
                                <p>No hay tokens disponibles</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal para crear nuevo lote */}
            {isModalOpen && selectedToken && createPortal(
                <div className="fixed inset-0 flex items-center justify-center z-[9999]">
                    <div className="fixed inset-0 bg-black opacity-50"></div>
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 relative z-[10000] max-h-[90vh] overflow-y-auto">
                        <div className="space-y-6">
                            <div className="border-b pb-4">
                                <h3 className="text-xl font-bold text-gray-900">
                                    Nuevo Lote: {selectedToken.nombre}
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                                        Cantidad (kg)
                                    </label>
                                    <input
                                        id="quantity"
                                        type="number"
                                        value={newQuantity}
                                        onChange={(e) => setNewQuantity(e.target.value)}
                                        className="mt-1 w-full p-3 border rounded-md focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm"
                                        placeholder="Ingrese la cantidad en kg"
                                        min="0"
                                        step="0.001"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                        Descripción
                                    </label>
                                    <textarea
                                        id="description"
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        className="mt-1 w-full p-3 border rounded-md focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm"
                                        placeholder="Descripción del lote"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Atributos del Lote
                                    </label>
                                    <div className="space-y-4">
                                        {Object.keys(selectedToken.atributos).map((atributo, index) => (
                                            <div key={index} className="flex flex-col space-y-2">
                                                <label className="text-sm font-medium text-gray-600">
                                                    {atributo}
                                                </label>
                                                <select
                                                    value={newAttributes.find(attr => attr.nombre === atributo)?.valor || ''}
                                                    onChange={(e) => {
                                                        const updatedAttrs = [...newAttributes];
                                                        const existingIndex = updatedAttrs.findIndex(attr => attr.nombre === atributo);
                                                        
                                                        if (existingIndex >= 0) {
                                                            updatedAttrs[existingIndex] = {
                                                                nombre: atributo,
                                                                valor: e.target.value,
                                                                timestamp: Date.now()
                                                            };
                                                        } else {
                                                            updatedAttrs.push({
                                                                nombre: atributo,
                                                                valor: e.target.value,
                                                                timestamp: Date.now()
                                                            });
                                                        }
                                                        
                                                        setNewAttributes(updatedAttrs);
                                                    }}
                                                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm"
                                                >
                                                    <option value="">Seleccionar {atributo}</option>
                                                    {selectedToken.atributos[atributo].valor.split(',').map((opcion, idx) => (
                                                        <option key={idx} value={opcion.trim()}>
                                                            {opcion.trim()}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false)
                                        setNewQuantity('')
                                        setNewDescription('')
                                        setNewAttributes([])
                                        setSelectedToken(null)
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => createNewLot(selectedToken, newQuantity)}
                                    className="px-4 py-2 bg-[#6D8B74] text-white rounded-md hover:bg-[#5F7A65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!newQuantity || Number(newQuantity) <= 0}
                                >
                                    Crear Lote
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Transferencia */}
            {isTransferModalOpen && selectedToken && createPortal(
                <div className="fixed inset-0 flex items-center justify-center z-[9999]">
                    <div className="fixed inset-0 bg-black opacity-50"></div>
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 relative z-[10000]">
                        <div className="space-y-6">
                            <div className="border-b pb-4">
                                <h2 className="text-xl font-bold text-gray-900">Transferir Token</h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Balance disponible: {selectedToken.cantidad / 1000} kg
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Seleccionar Destino
                                    </label>
                                    <select
                                        value={selectedFactory}
                                        onChange={(e) => setSelectedFactory(e.target.value)}
                                        className="w-full p-3 border rounded-md shadow-sm focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                    >
                                        <option value="">Seleccionar Fábrica</option>
                                        {factories.map((factory) => (
                                            <option key={factory.direccion} value={factory.direccion}>
                                                {factory.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cantidad a Transferir
                                    </label>
                                    <input
                                        type="number"
                                        value={transferQuantity}
                                        onChange={(e) => setTransferQuantity(e.target.value)}
                                        className="w-full p-3 border rounded-md shadow-sm focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                        placeholder="Cantidad en kg"
                                    />
                                </div>

                                {factoryBalance && (
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                        {factoryBalance}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t">
                                <button
                                    onClick={() => {
                                        setIsTransferModalOpen(false)
                                        setTransferQuantity('')
                                        setSelectedFactory('')
                                        setSelectedToken(null)
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleTransfer}
                                    disabled={!selectedFactory || !transferQuantity || Number(transferQuantity) <= 0}
                                    className="px-4 py-2 bg-[#6D8B74] text-white rounded-md hover:bg-[#5F7A65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Transferir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

export default ProductorDashboard