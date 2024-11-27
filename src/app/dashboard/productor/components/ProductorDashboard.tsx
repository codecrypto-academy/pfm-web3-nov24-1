'use client'

import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect, useCallback } from 'react'
import { ethers, EventLog } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import React from 'react'
import { FC } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, ArrowRightIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Token, TokenTransferidoEvent, TokenCreadoEvent, TokenAttribute, RelatedToken } from '@/types/types'
import CreateBatchModal from './modals/CreateBatchModal'
import TransferModal from './modals/TransferModal'
import { formatAttributeName } from '@/utils/attributeLabels'

const ProductorDashboard: FC = (): React.ReactElement => {
    const { address, isAuthenticated, isLoading: isAuthLoading, role: userRole } = useWeb3()
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedRows, setExpandedRows] = useState<number[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
    const [selectedToken, setSelectedToken] = useState<Token | null>(null)
    const [factories, setFactories] = useState<{ direccion: string; nombre: string }[]>([])
    const [lastUpdate, setLastUpdate] = useState(Date.now())
    const router = useRouter()
    const [newQuantity, setNewQuantity] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [newAttributes, setNewAttributes] = useState<TokenAttribute[]>([])
    const [selectedFactory, setSelectedFactory] = useState('')
    const [transferQuantity, setTransferQuantity] = useState('')
    const [factoryBalance, setFactoryBalance] = useState('')
    const [selectedRemesaInfo, setSelectedRemesaInfo] = useState<any>(null);
    const [expandedRemesas, setExpandedRemesas] = useState<string[]>([]);
    const [selectedTab, setSelectedTab] = useState<string>('general');
    const [ownerNames, setOwnerNames] = useState<{[key: string]: string}>({});
    const [transferId, setTransferId] = useState<number | undefined>(undefined);
    const [transferTimestamp, setTransferTimestamp] = useState<number | undefined>(undefined);

    useEffect(() => {
        const loadOwnerName = async () => {
            if (address) {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum)
                    const contract = new ethers.Contract(
                        CONTRACTS.Usuarios.address,
                        CONTRACTS.Usuarios.abi,
                        provider
                    )
                    const users = await contract.getUsuarios()
                    const user = users.find((u: any) => u.direccion.toLowerCase() === address.toLowerCase())
                    setOwnerNames(prev => ({
                        ...prev,
                        [address.toLowerCase()]: user ? user.nombre : 'Desconocido'
                    }))
                } catch (error) {
                    console.error('Error al obtener el nombre del usuario:', error)
                    setOwnerNames(prev => ({
                        ...prev,
                        [address.toLowerCase()]: 'Desconocido'
                    }))
                }
            }
        };
        loadOwnerName();
    }, [address]);

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
        // Inicializar los atributos con los valores del token base
        const initialAttributes = Object.entries(token.atributos)
            .filter(([nombre]) => !['EsRemesa', 'Tipo_Producto'].includes(nombre))
            .map(([nombre, attr]) => ({
                nombre,
                valor: attr.valor,
                timestamp: Date.now()
            }));

        // Añadir atributos adicionales si no existen
        const additionalAttributes = [
            { nombre: 'temperatura', valor: '', timestamp: Date.now() }
        ];

        // Solo añadir los atributos adicionales que no existan ya
        additionalAttributes.forEach(attr => {
            if (!initialAttributes.some(existing => existing.nombre === attr.nombre)) {
                initialAttributes.push(attr);
            }
        });

        setNewAttributes(initialAttributes);
        setSelectedToken(token);
        setIsModalOpen(true);
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
            // Get events from block 0 to ensure we capture all events
            const fromBlock = 0
            
            console.log('Buscando eventos desde el bloque', fromBlock, 'hasta', latestBlock);
            
            // Get all creation events first
            const creationFilter = contract.filters.TokenCreado()
            const creationEvents = await retryRPC(() => contract.queryFilter(creationFilter, fromBlock, latestBlock))
            console.log('Eventos de creación encontrados:', creationEvents.length);
            console.log('Ejemplo de evento de creación:', creationEvents[0]);
            const typedCreationEvents = creationEvents.filter((e): e is TokenCreadoEvent => e instanceof EventLog)
            
            // Filter creation events by creator
            const myCreatedTokens = typedCreationEvents.filter(event =>
                event.args.creador.toLowerCase() === address?.toLowerCase()
            )
            console.log('Mis tokens creados:', myCreatedTokens.length);

            // Get transfer events
            const transferFilter = contract.filters.TokenTransferido()
            const transferEvents = await retryRPC(() => contract.queryFilter(transferFilter, fromBlock, latestBlock))
            console.log('Eventos de transferencia encontrados:', transferEvents.length);
            console.log('Ejemplo de evento de transferencia:', transferEvents[0]);
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
                        id: Number(tokenId),
                        cantidad: Number(balance),
                        timestamp: Number(tokenData[5]),
                        transactionHash: '',  // Se actualizará con el evento
                        blockNumber: 0,       // Se actualizará con el evento
                        transfers: [],        // Se actualizará después
                        atributos: {},        // Se actualizará después
                        creador: tokenData[2] // Asumiendo que tokenData[2] es el creador, ajusta el índice según corresponda
                    };

                    // Obtener el evento de creación para este token
                    const creationEvent = typedCreationEvents.find(event => Number(event.args.id) === tokenId);
                    
                    const token: Token = {
                        id: Number(tokenId),
                        nombre: tokenData[1],
                        descripcion: tokenData[3],
                        creador: tokenData[2],
                        cantidad: Number(balance),
                        timestamp: Number(tokenData[5]),
                        isProcesado,
                        atributos,
                        nombresAtributos: Object.keys(atributos),
                        relatedTokens: [relatedToken],
                        transactionHash: creationEvent?.transactionHash || '',
                        blockNumber: creationEvent?.blockNumber || 0,
                        transfers: relevantTransferEvents
                            .filter(event => Number(event.args.tokenId) === tokenId)
                            .map(event => ({
                                from: event.args.from,
                                to: event.args.to,
                                cantidad: Number(event.args.cantidad),
                                timestamp: Number(event.args.timestamp),
                                transactionHash: event.transactionHash || '',
                                blockNumber: event.blockNumber || 0
                            }))
                    }

                    return token
                } catch (error) {
                    console.error(`Error fetching token ${tokenId}:`, error)
                    return null
                }
            })

            const allTokens = (await Promise.all(tokenPromises)).filter((token): token is Token => token !== null)
            
            // Primero filtramos los productos base
            const productosBase = allTokens.filter(token => token.atributos['EsRemesa']?.valor !== 'true');

            // Luego creamos el array final con los productos y sus remesas
            const groupedTokens = productosBase.map(producto => {
                const remesas = allTokens.filter(token => 
                    token.nombre === producto.nombre && 
                    token.atributos['EsRemesa']?.valor === 'true'
                ).map(remesa => ({
                    id: Number(remesa.id),
                    cantidad: remesa.cantidad,
                    timestamp: remesa.timestamp,
                    atributos: remesa.atributos,
                    transactionHash: remesa.transactionHash,
                    blockNumber: remesa.blockNumber,
                    transfers: remesa.transfers,
                    creador: remesa.creador // Agregar la propiedad creador a cada remesa
                }));

                return {
                    ...producto,
                    relatedTokens: remesas
                };
            });

            // Ordenar por timestamp
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

            // Verificar solo los atributos que requieren selección
            if (token.atributos) {
                const requiredAttributes = ['metodoRecoleccion'];
                const missingAttributes = requiredAttributes.filter(attr => 
                    !newAttributes.find(newAttr => newAttr.nombre === attr && newAttr.valor)
                );
                
                if (missingAttributes.length > 0) {
                    alert(`Por favor, complete todos los atributos requeridos: ${missingAttributes.join(', ')}`);
                    return;
                }
            }

            // Combinar todos los atributos
            const allAttributes = [
                // Atributos del sistema
                {
                    nombre: 'EsRemesa',
                    valor: 'true'
                },
                {
                    nombre: 'Tipo_Producto',
                    valor: token.atributos['Tipo_Producto']?.valor || 'Prima'
                },
                // Atributos heredados y nuevos
                ...newAttributes.map(attr => ({
                    nombre: attr.nombre,
                    valor: attr.valor || ''  // Asegurarnos de que nunca sea undefined
                }))
            ];

            console.log('Atributos a enviar:', allAttributes);

            // Separar los atributos en dos arrays
            const nombresAtributos = allAttributes.map(attr => attr.nombre);
            const valoresAtributos = allAttributes.map(attr => attr.valor);

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

            // Verificar que la fábrica existe y está activa en el contrato de Usuarios
            const usuariosContract = new ethers.Contract(
                CONTRACTS.Usuarios.address,
                CONTRACTS.Usuarios.abi,
                provider
            )

            try {
                console.log('Verificando fábrica:', selectedFactory);
                const [existe, estaActivo] = await Promise.all([
                    usuariosContract.esUsuario(selectedFactory),
                    usuariosContract.estaActivo(selectedFactory)
                ]);

                console.log('Resultado verificación:', { existe, estaActivo });

                if (!existe) {
                    alert('Error: La dirección de la fábrica no existe en el sistema');
                    return;
                }

                if (!estaActivo) {
                    alert('Error: La fábrica seleccionada no está activa');
                    return;
                }

                // Obtener el rol usando getUsuarios y getIndiceUsuario
                console.log('Obteniendo índice del usuario...');
                const indice = await usuariosContract.getIndiceUsuario(selectedFactory);
                console.log('Índice obtenido:', indice);
                
                console.log('Obteniendo lista de usuarios...');
                const usuarios = await usuariosContract.getUsuarios();
                console.log('Usuarios obtenidos:', usuarios);
                
                const usuario = usuarios[indice];
                console.log('Usuario encontrado:', usuario);

                if (usuario[3].toLowerCase() !== 'fabrica') {
                    alert('Error: La dirección seleccionada no corresponde a una fábrica');
                    return;
                }
            } catch (error) {
                console.error('Error verificando la fábrica:', error);
                alert('Error al verificar la fábrica seleccionada');
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
                amount: totalTokens,
                tokensContract: CONTRACTS.Tokens.address,
                usuariosContract: CONTRACTS.Usuarios.address
            });

            const tx = await contract.iniciarTransferencia(
                selectedToken.id,
                selectedFactory,
                totalTokens
            )

            console.log('Esperando confirmación de la transacción...');
            const receipt = await tx.wait()
            console.log('Receipt completo:', receipt);

            // Buscar el evento TokenTransferido
            const transferEvent = receipt.logs.find(
                (log: any) => {
                    console.log('Revisando log:', log);
                    if (log instanceof EventLog) {
                        console.log('Es un EventLog con nombre:', log.eventName);
                        return log.eventName === 'TokenTransferido';
                    }
                    return false;
                }
            );

            console.log('Evento encontrado:', transferEvent);

            if (transferEvent && transferEvent instanceof EventLog) {
                console.log('Args del evento:', transferEvent.args);
                const transferId = Number(transferEvent.args[0]); // El primer argumento es el transferId
                const timestamp = Math.floor(Date.now() / 1000); // Usamos el timestamp actual
                console.log('Datos capturados:', { transferId, timestamp });
                
                setTransferId(transferId);
                setTransferTimestamp(timestamp);
                setIsTransferModalOpen(true);
            } else {
                console.error('No se encontró el evento TokenTransferido o no es del tipo esperado');
            }

            // Actualizar el estado
            setLastUpdate(Date.now())
            await reloadTokens()

            alert('Transferencia iniciada con éxito')
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

    const toggleRemesaDetails = (remesaId: number) => {
        setExpandedRemesas(prev => 
            prev.includes(remesaId.toString()) 
                ? prev.filter(id => id !== remesaId.toString())
                : [...prev, remesaId.toString()]
        );
    };

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

    // Función para obtener el nombre del usuario
    const getUserName = async (userAddress: string) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.Usuarios.address,
                CONTRACTS.Usuarios.abi,
                provider
            )
            const users = await contract.getUsuarios()
            const user = users.find((u: any) => u.direccion.toLowerCase() === userAddress.toLowerCase())
            return user ? user.nombre : 'Desconocido'
        } catch (error) {
            console.error('Error al obtener el nombre del usuario:', error)
            return 'Desconocido'
        }
    }

    // Función para renderizar el título según el rol
    const getRoleTitle = () => 'Mis Productos'

    // Función para obtener el texto del botón según el rol
    const getActionButtonText = () => 'Crear Nuevo Lote'

    // Función para filtrar los tokens según el rol
    const filteredTokens = useCallback(() => tokens, [tokens])

    const handleInfoClick = (remesa: any) => {
        setSelectedRemesaInfo(remesa);
    };

    const handleCloseInfo = () => {
        setSelectedRemesaInfo(null);
    };

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
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Ver Remesas
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Token ID
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Nombre
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Descripción
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Cantidad Total
                                                </th>
                                                <th className="px-6 py-4 whitespace-nowrap text-center">
                                                    Crear Remesa
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredTokens().map((token, index) => (
                                                <React.Fragment key={token.id}>
                                                    <tr>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div 
                                                                onClick={() => toggleRow(token.id)}
                                                                className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors duration-150"
                                                            >
                                                                <div className="text-indigo-600">
                                                                    {expandedRows.includes(token.id) ? '-' : '+'}
                                                                </div>
                                                                {token.relatedTokens && token.relatedTokens.length > 0 && (
                                                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                                        {token.relatedTokens.length} remesa{token.relatedTokens.length !== 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">{token.id}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {token.nombre}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">{token.descripcion}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {token.relatedTokens?.reduce((acc, remesa) => acc + remesa.cantidad, 0) / 1000} kg 
                                                                <br/>
                                                                ({token.relatedTokens?.reduce((acc, remesa) => acc + remesa.cantidad, 0)} tokens)
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <button
                                                                onClick={() => handleCreateBatchClick(token)}
                                                                className="text-green-600 hover:text-green-900 text-xl font-bold"
                                                            >
                                                                +
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* Sección de remesas */}
                                                    {expandedRows.includes(token.id) && token.relatedTokens && token.relatedTokens.length > 0 && (
                                                        <tr>
                                                            <td colSpan={6}>
                                                                <div className="bg-gray-50 p-4 rounded-lg mx-2 my-2">
                                                                    <h4 className="text-sm font-medium text-gray-900 mb-2 pl-2 border-l-4 border-indigo-500">Remesas disponibles:</h4>
                                                                    <table className="min-w-full divide-y divide-gray-200">
                                                                        <thead className="bg-gray-100">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Info</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Token ID</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha de Recolección</th>
                                                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Transferir</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {token.relatedTokens.map((remesa, idx) => (
                                                                                <React.Fragment key={remesa.id}>
                                                                                    <tr key={remesa.id} 
                                                                                        onClick={() => toggleRemesaDetails(remesa.id)}
                                                                                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} 
                                                                                        hover:bg-gray-100/50 transition-colors duration-150 cursor-pointer`}>
                                                                                        <td className="px-4 py-2">
                                                                                            <div className="text-indigo-600">
                                                                                                {expandedRemesas.includes(remesa.id.toString()) ? '-' : '+'}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-4 py-2">
                                                                                            <div className="text-sm text-gray-900">{remesa.id}</div>
                                                                                        </td>
                                                                                        <td className="px-4 py-2 text-sm text-gray-600">
                                                                                            {remesa.cantidad / 1000} kg ({remesa.cantidad} tokens)
                                                                                        </td>
                                                                                        <td className="px-4 py-2 text-sm text-gray-500">
                                                                                            {new Date(remesa.timestamp * 1000).toLocaleDateString()}
                                                                                        </td>
                                                                                        <td className="px-4 py-2 text-center">
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation(); // Evita que el click del botón active el toggle de la fila
                                                                                                    setSelectedToken({
                                                                                                        ...token,
                                                                                                        cantidad: remesa.cantidad,
                                                                                                        id: remesa.id
                                                                                                    });
                                                                                                    setIsTransferModalOpen(true);
                                                                                                }}
                                                                                                className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                                                                                            >
                                                                                                <ArrowRightIcon className="h-5 w-5" />
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>

                                                                                    {expandedRemesas.includes(remesa.id.toString()) && (
                                                                                        <tr>
                                                                                            <td colSpan={5}>
                                                                                                <div className="border rounded-lg overflow-hidden">
                                                                                                    {/* Tabs */}
                                                                                                    <div className="border-b">
                                                                                                        <nav className="-mb-px flex">
                                                                                                            <button
                                                                                                                onClick={() => setSelectedTab('general')}
                                                                                                                className={`px-4 py-2 text-sm font-medium ${
                                                                                                                    selectedTab === 'general'
                                                                                                                        ? 'border-b-2 border-indigo-500 text-indigo-600'
                                                                                                                        : 'text-gray-500 hover:text-gray-700'
                                                                                                                }`}
                                                                                                            >
                                                                                                                General
                                                                                                            </button>
                                                                                                            <button
                                                                                                                onClick={() => setSelectedTab('atributos')}
                                                                                                                className={`px-4 py-2 text-sm font-medium ${
                                                                                                                    selectedTab === 'atributos'
                                                                                                                        ? 'border-b-2 border-indigo-500 text-indigo-600'
                                                                                                                        : 'text-gray-500 hover:text-gray-700'
                                                                                                                }`}
                                                                                                            >
                                                                                                                Atributos
                                                                                                            </button>
                                                                                                            <button
                                                                                                                onClick={() => setSelectedTab('blockchain')}
                                                                                                                className={`px-4 py-2 text-sm font-medium ${
                                                                                                                    selectedTab === 'blockchain'
                                                                                                                        ? 'border-b-2 border-indigo-500 text-indigo-600'
                                                                                                                        : 'text-gray-500 hover:text-gray-700'
                                                                                                                }`}
                                                                                                            >
                                                                                                                Blockchain
                                                                                                            </button>
                                                                                                        </nav>
                                                                                                    </div>

                                                                                                    {/* Tab Content */}
                                                                                                    <div className="p-4">
                                                                                                        {selectedTab === 'general' && (
                                                                                                            <div className="space-y-2">
                                                                                                                <p><span className="font-medium">Token ID:</span> {remesa.id}</p>
                                                                                                                <p><span className="font-medium">Cantidad en kg:</span> {remesa.cantidad / 1000} kg</p>
                                                                                                                <p><span className="font-medium">Fecha de Recolección:</span> {new Date(remesa.timestamp * 1000).toLocaleString()}</p>
                                                                                                            </div>
                                                                                                        )}

                                                                                                        {selectedTab === 'atributos' && (
                                                                                                            <div className="space-y-2">
                                                                                                                {Object.entries(remesa.atributos || {}).map(([nombre, valor]: [string, any]) => (
                                                                                                                    <p key={nombre}>
                                                                                                                        <span className="font-medium">{formatAttributeName(nombre)}:</span> {valor.valor}
                                                                                                                    </p>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        )}

                                                                                                        {selectedTab === 'blockchain' && (
                                                                                                            <div className="space-y-2">
                                                                                                                <p><span className="font-medium">Token ID:</span> {remesa.id}</p>
                                                                                                                <p><span className="font-medium">Smart Contract:</span> {CONTRACTS.Tokens.address}</p>
                                                                                                                <p><span className="font-medium">Propietario Actual:</span> <span className="font-mono">{address}</span> ({address === remesa.creador ? 'Creador' : ownerNames[address.toLowerCase()] || 'Cargando...'})</p>
                                                                                                                <p><span className="font-medium">Cantidad:</span> {remesa.cantidad} tokens</p>
                                                                                                                <p><span className="font-medium">Fecha de Creación:</span> {new Date(remesa.timestamp * 1000).toLocaleString()}</p>
                                                                                                                <p><span className="font-medium">Hash de Transacción:</span> {remesa.transactionHash || 'No disponible'}</p>
                                                                                                                <p><span className="font-medium">Bloque:</span> {remesa.blockNumber || 'No disponible'}</p>
                                                                                                                <div className="mt-4">
                                                                                                                    <p className="font-medium mb-2">Historial de Transferencias:</p>
                                                                                                                    {remesa.transfers && remesa.transfers.length > 0 ? (
                                                                                                                        <div className="space-y-2">
                                                                                                                            {remesa.transfers.map((transfer: any, index: number) => (
                                                                                                                                <div key={index} className="pl-4 border-l-2 border-gray-200">
                                                                                                                                    <p className="text-sm">
                                                                                                                                        <span className="font-medium">De:</span> {transfer.from}
                                                                                                                                    </p>
                                                                                                                                    <p className="text-sm">
                                                                                                                                        <span className="font-medium">A:</span> {transfer.to}
                                                                                                                                    </p>
                                                                                                                                    <p className="text-sm">
                                                                                                                                        <span className="font-medium">Cantidad:</span> {transfer.cantidad} tokens
                                                                                                                                    </p>
                                                                                                                                    <p className="text-sm">
                                                                                                                                        <span className="font-medium">Fecha:</span> {new Date(transfer.timestamp * 1000).toLocaleString()}
                                                                                                                                    </p>
                                                                                                                                    <p className="text-sm">
                                                                                                                                        <span className="font-medium">Hash de Transacción:</span> {transfer.transactionHash || 'No disponible'}
                                                                                                                                    </p>
                                                                                                                                    <p className="text-sm">
                                                                                                                                        <span className="font-medium">Bloque:</span> {transfer.blockNumber || 'No disponible'}
                                                                                                                                    </p>
                                                                                                                                </div>
                                                                                                                            ))}
                                                                                                                        </div>
                                                                                                                    ) : (
                                                                                                                        <p className="text-sm text-gray-500">No hay transferencias registradas</p>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )}
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
                            <div className="text-center py-8">
                                <p className="text-gray-500">No hay tokens disponibles</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modales */}
            <CreateBatchModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setSelectedToken(null)
                    setNewQuantity('')
                    setNewDescription('')
                    setNewAttributes([])
                }}
                token={selectedToken}
                onSubmit={createNewLot}
                quantity={newQuantity}
                setQuantity={setNewQuantity}
                description={newDescription}
                setDescription={setNewDescription}
                attributes={newAttributes}
                setAttributes={setNewAttributes}
            />

            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => {
                    setIsTransferModalOpen(false)
                    setSelectedFactory('')
                    setTransferQuantity('')
                    setFactoryBalance('')
                    setTransferId(undefined)
                    setTransferTimestamp(undefined)
                }}
                token={selectedToken}
                onSubmit={handleTransfer}
                factories={factories}
                selectedFactory={selectedFactory}
                setSelectedFactory={setSelectedFactory}
                quantity={transferQuantity}
                setQuantity={setTransferQuantity}
                factoryBalance={factoryBalance}
                onFactorySelect={checkFactoryBalance}
                direccion={address || ''}
                nombre={ownerNames[address || ''] || ''}
                transferId={transferId}
                transferTimestamp={transferTimestamp}
            />

            {/* Modal de Información Detallada de Remesa */}
            {selectedRemesaInfo && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Información Detallada de la Remesa</h3>
                            <button
                                onClick={handleCloseInfo}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-gray-700">Información Básica</h4>
                                    <div className="mt-2 space-y-2">
                                        <p><span className="font-medium">Token ID:</span> {selectedRemesaInfo.id}</p>
                                        <p><span className="font-medium">Cantidad en kg:</span> {selectedRemesaInfo.cantidad / 1000} kg</p>
                                        <p><span className="font-medium">Fecha de Recolección:</span> {new Date(selectedRemesaInfo.timestamp * 1000).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-700">Atributos</h4>
                                    <div className="mt-2 space-y-2">
                                        {Object.entries(selectedRemesaInfo.atributos || {}).map(([nombre, valor]: [string, any]) => (
                                            <p key={nombre}>
                                                <span className="font-medium">{formatAttributeName(nombre)}:</span> {valor.valor}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-700">Información Blockchain</h4>
                                <div className="mt-2 space-y-2 text-sm">
                                    <p className="break-all">
                                        <span className="font-medium">Transaction Hash:</span> {selectedRemesaInfo.transactionHash || 'No disponible'}
                                    </p>
                                    <p className="break-all">
                                        <span className="font-medium">Block Number:</span> {selectedRemesaInfo.blockNumber || 'No disponible'}
                                    </p>
                                    <p className="break-all">
                                        <span className="font-medium">Contract Address:</span> {selectedRemesaInfo.contractAddress || 'No disponible'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default ProductorDashboard