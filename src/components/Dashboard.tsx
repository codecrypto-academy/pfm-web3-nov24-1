'use client'
import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect, useCallback } from 'react'
import { ethers, EventLog, Log } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import React from 'react'
import { FC } from 'react'
import router from 'next/router'
import { ArrowRightIcon, PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

// Declaración de tipos para window.ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

interface DashboardProps {
    role: 'productor' | 'fabrica' | 'distribuidor' | 'mayorista' | 'minorista'
}

interface TokenAttribute {
    nombre: string;
    valor: string;
    timestamp: number;
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
    atributos?: TokenAttribute[];
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
    const [lastUpdate, setLastUpdate] = useState(Date.now());

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
    const fetchTokens = async () => {
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
                            const attribute: TokenAttribute = {
                                nombre: attr[0],
                                valor: attr[1],
                                timestamp: Number(attr[2])
                            }
                            return attribute
                        })
                    )

                    // Verificar si es un producto procesado
                    const isProcesado = atributos.some(attr => 
                        attr.nombre === "Procesado" && attr.valor.toLowerCase() === "true"
                    )

                    // Obtener token padre si existe
                    const tokenPadre = atributos.find(attr => attr.nombre === "TokenPadre")?.valor

                    const relatedToken: RelatedToken = {
                        id: tokenId,
                        cantidad: Number(balance),
                        timestamp: Number(tokenData[5])
                    }

                    const token: Token = {
                        id: tokenId,
                        nombre: tokenData[1],
                        creador: tokenData[2],
                        descripcion: tokenData[3],
                        cantidad: Number(balance),
                        timestamp: Number(tokenData[5]),
                        isProcesado,
                        tokenPadre,
                        atributos,
                        relatedTokens: [relatedToken]
                    }

                    return token
                } catch (error) {
                    console.error(`Error fetching token ${tokenId}:`, error)
                    return null
                }
            })

            const allTokens = (await Promise.all(tokenPromises)).filter((token): token is Token => token !== null)
            
            // Group tokens by product name
            const groupedTokens = allTokens.reduce((acc, token) => {
                const existingProduct = acc.find(p => p.nombre === token.nombre)
                if (existingProduct) {
                    const relatedToken: RelatedToken = {
                        id: token.id,
                        cantidad: token.cantidad,
                        timestamp: token.timestamp
                    }
                    existingProduct.relatedTokens.push(relatedToken)
                } else {
                    acc.push(token)
                }
                return acc
            }, [] as Token[])

            setTokens(groupedTokens)
        } catch (err) {
            console.error("Error fetching tokens:", err)
            setError(err instanceof Error ? err.message : 'Error al cargar los tokens')
        } finally {
            setLoading(false)
        }
    }

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

        // Los nombres de los eventos deben coincidir exactamente con los del contrato
        contract.on("TokenCreado", handleNewToken);
        contract.on("TokenTransferido", handleNewToken);
        contract.on("TokenProcesado", handleNewToken);

        // Cleanup function
        return () => {
            contract.removeListener("TokenCreado", handleNewToken);
            contract.removeListener("TokenTransferido", handleNewToken);
            contract.removeListener("TokenProcesado", handleNewToken);
        };
    }, [address]);

    useEffect(() => {
        if (role === 'productor') {
            fetchFactories()
        }
    }, [role])

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

            const tx = await contract.crearToken(
                token.nombre,
                totalTokens,
                token.descripcion,
                [], // array vacío para nombres de atributos
                []  // array vacío para valores de atributos
            )

            await tx.wait()
            reloadTokens() // Refrescar la lista
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
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
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
            reloadTokens()
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
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
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
            reloadTokens()
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
            ) : (
                <div className="space-y-8">
                    {/* Materias Primas */}
                    {tokens.length > 0 ? (
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Materias Primas</h3>
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
                                        {tokens
                                            .filter(token => !token.isProcesado)
                                            .map((token, index) => {
                                                // Calcular el balance total sumando todas las remesas
                                                const balanceTotal = token.relatedTokens.reduce((sum, remesa) => sum + remesa.cantidad, 0);
                                                
                                                return (
                                                    <React.Fragment key={token.id}>
                                                        {/* Fila del producto principal */}
                                                        <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-6 py-4">
                                                                <button 
                                                                    onClick={() => toggleRow(token.id)} 
                                                                    className="text-olive-600 hover:text-olive-800"
                                                                >
                                                                    {expandedRows.includes(token.id) ? '-' : '+'}
                                                                </button>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <div>
                                                                    <span className="font-medium">{token.nombre}</span>
                                                                    {token.descripcion && (
                                                                        <span className="block text-xs text-gray-500">
                                                                            {token.descripcion}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                                {token.descripcion || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {balanceTotal / 1000} kg
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {role === 'productor' && (
                                                                    <div className="flex items-center justify-center space-x-4">
                                                                        <button
                                                                            onClick={() => handleCreateBatchClick(token)}
                                                                            className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-full transition-colors"
                                                                            title="Crear Lote"
                                                                        >
                                                                            <PlusIcon className="h-5 w-5" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {/* Filas de remesas expandibles */}
                                                        {expandedRows.includes(token.id) && (
                                                            <tr>
                                                                <td colSpan={5} className="px-6 py-4 bg-gray-50">
                                                                    <div className="space-y-4">
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
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <p>No hay tokens disponibles</p>
                        </div>
                    )}

                    {/* Productos Procesados */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Productos Procesados</h3>
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="w-10 px-6 py-3"></th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tokens
                                        .filter(token => token.isProcesado)
                                        .map((token) => {
                                            const parentTokenIds = token.atributos?.find(attr => 
                                                attr.nombre === "TokenPadre")?.valor?.split(',') || [];
                                            return (
                                                <React.Fragment key={token.id}>
                                                    <tr className="hover:bg-gray-50">
                                                        <td className="px-6 py-4">
                                                            <button onClick={() => toggleRow(token.id)} className="text-olive-600 hover:text-olive-800">
                                                                {expandedRows.includes(token.id) ? '-' : '+'}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">{token.nombre}</td>
                                                        <td className="px-6 py-4">{token.descripcion}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span>{token.relatedTokens[0]?.cantidad / 1000} kg</span>
                                                                <span className="text-gray-500 text-xs">
                                                                    {token.relatedTokens[0]?.cantidad} tokens
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {new Date(Number(token.timestamp) * 1000).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                    {expandedRows.includes(token.id) && (
                                                        <tr>
                                                            <td colSpan={5}>
                                                                <div className="p-4 bg-gray-50">
                                                                    {/* Atributos */}
                                                                    <div className="mb-6">
                                                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Atributos del Producto:</h4>
                                                                        <div className="grid grid-cols-3 gap-4">
                                                                            {token.atributos
                                                                                ?.filter(attr => !['Procesado', 'TokenPadre'].includes(attr.nombre))
                                                                                .map((attr, index) => (
                                                                                    <div key={index} className="bg-white p-3 rounded shadow-sm">
                                                                                        <div className="font-medium text-gray-700">{attr.nombre}</div>
                                                                                        <div className="text-gray-600">{attr.valor}</div>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {/* Materias Primas Utilizadas */}
                                                                    <div>
                                                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Materias Primas Utilizadas:</h4>
                                                                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                                <thead className="bg-gray-100">
                                                                                    <tr>
                                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Token ID</th>
                                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-200">
                                                                                    {parentTokenIds.map((id, index) => {
                                                                                        const numericId = parseInt(id);
                                                                                        
                                                                                        // Primero buscar el token que tenga este ID en sus remesas
                                                                                        let parentToken = tokens.find(t => 
                                                                                            t.relatedTokens?.some(rt => rt.id === numericId)
                                                                                        );

                                                                                        // Si no lo encontramos, buscar por ID de token
                                                                                        if (!parentToken) {
                                                                                            parentToken = tokens.find(t => t.id === numericId);
                                                                                        }

                                                                                        // Buscar la remesa específica
                                                                                        let parentRemesa = parentToken?.relatedTokens?.find(rt => rt.id === numericId);
                                                                                        
                                                                                        // Si no encontramos la remesa específica pero tenemos el token,
                                                                                        // usar la primera remesa disponible
                                                                                        if (!parentRemesa && parentToken?.relatedTokens && parentToken.relatedTokens.length > 0) {
                                                                                            parentRemesa = parentToken.relatedTokens[0];
                                                                                        }
                                                                                        
                                                                                        return (
                                                                                            <tr key={index} className="hover:bg-gray-50">
                                                                                                <td className="px-4 py-2 text-sm text-gray-900">
                                                                                                    <span className="font-medium">Token #{id}</span>
                                                                                                </td>
                                                                                                <td className="px-4 py-2 text-sm text-gray-900">
                                                                                                    {parentToken?.nombre || 'N/A'}
                                                                                                    {parentToken?.descripcion && (
                                                                                                        <span className="block text-xs text-gray-500">
                                                                                                            {parentToken.descripcion}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="px-4 py-2 text-sm text-gray-900">
                                                                                                    {parentRemesa ? (
                                                                                                        <div>
                                                                                                            <span className="font-medium">{parentRemesa.cantidad / 1000} kg</span>
                                                                                                            <span className="block text-xs text-gray-500">
                                                                                                                Remesa #{parentRemesa.id}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    ) : 'N/A'}
                                                                                                </td>
                                                                                                <td className="px-4 py-2 text-sm text-gray-900">
                                                                                                    {parentRemesa ? (
                                                                                                        <div>
                                                                                                            <span>{new Date(Number(parentRemesa.timestamp) * 1000).toLocaleDateString()}</span>
                                                                                                            <span className="block text-xs text-gray-500">
                                                                                                                {new Date(Number(parentRemesa.timestamp) * 1000).toLocaleTimeString()}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    ) : 'N/A'}
                                                                                                </td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
