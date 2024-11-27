'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'
import ClientTransactions from '@/components/shared/ClientTransactions'
import PendingTransfers from '@/components/TransferenciasPendientes'
import { toast } from 'react-toastify'
import { formatAttributeName } from '@/utils/attributeLabels'

interface Token {
    id: number
    nombre: string
    tipo: string
    creador: string
    cantidadTotal: number
    timestamp: number
    atributos: { [key: string]: any }
    nombresAtributos: string[]
    atributosJSON: string
    esReceta: boolean
    remesas: {
        id: number
        cantidad: number
        timestamp: number
        atributos: { [key: string]: any }
        creador: string
    }[]
    numRemesas: number
    tokensPadres?: {
        id: number
        cantidad: number
        nombre: string
        transferId?: number // ID de la transferencia
    }[]
    transferInfo?: {
        timestamp: number | null
        from: string
        to: string
        transferId: string
    }
}

interface TokenAttribute {
    nombre: string
    valor: string | number | boolean
    timestamp: number
}

interface RelatedToken {
    id: number
    cantidad: number
    timestamp: number
}

interface Usuario {
    direccion: string;
    nombre: string;
    gps: string;
    rol: string;
    activo: boolean;
}

interface BlockchainInfo {
    token: Token & {
        tokensPadres: {
            id: number
            cantidad: number
            nombre: string
            transferId?: number // ID de la transferencia
        }[]
    }
    remesa: {
        id: number
        cantidad: number
        timestamp: number
        atributos: { [key: string]: any }
        creador: string
    }
}

export default function FabricaDashboard() {
    const { address, isAuthenticated, isLoading: isAuthLoading, role: userRole } = useWeb3()
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('materias')
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 12
    const router = useRouter()

    // Estados para el modal de transferencia
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);
    const [transferQuantity, setTransferQuantity] = useState('');
    const [transferDestination, setTransferDestination] = useState('');
    const [selectedRemesa, setSelectedRemesa] = useState<number | null>(null);

    // Estados para el modal de información blockchain
    const [showBlockchainModal, setShowBlockchainModal] = useState(false);
    const [selectedBlockchainInfo, setSelectedBlockchainInfo] = useState<BlockchainInfo | null>(null);

    // Estado para almacenar las direcciones de minoristas
    const [minoristas, setMinoristas] = useState<{ address: string; label: string }[]>([]);

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
        try {
            console.log('Iniciando carga de tokens para dirección:', address);
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            // Obtener el último bloque
            const latestBlock = await provider.getBlockNumber()
            const fromBlock = 0
            
            console.log('Buscando eventos desde el bloque', fromBlock, 'hasta', latestBlock);
            
            // Obtener eventos de transferencia donde la fábrica es el destinatario
            const transferFilter = tokensContract.filters.TokenTransferido()
            const transferEvents = await tokensContract.queryFilter(transferFilter, fromBlock, latestBlock)
            console.log('Eventos de transferencia encontrados:', transferEvents.length);
            
            // Obtener eventos de creación de tokens
            const createFilter = tokensContract.filters.TokenCreado()
            const createEvents = await tokensContract.queryFilter(createFilter, fromBlock, latestBlock)
            console.log('Eventos de creación encontrados:', createEvents.length);
            
            // Filtrar eventos de transferencia donde la fábrica es el destinatario
            const relevantTransferEvents = transferEvents
                .filter((e): e is ethers.EventLog => e instanceof ethers.EventLog)
                .filter(event => 
                    event.args && 
                    event.args[3] && // 'to' address
                    event.args[3].toLowerCase() === address?.toLowerCase()
                )
            
            // Filtrar eventos de creación donde la fábrica es el creador
            const relevantCreateEvents = createEvents
                .filter((e): e is ethers.EventLog => e instanceof ethers.EventLog)
                .filter(event => 
                    event.args && 
                    event.args[2] && // creador address
                    event.args[2].toLowerCase() === address?.toLowerCase()
                )
            
            console.log('Eventos de transferencia relevantes:', relevantTransferEvents.length);
            console.log('Eventos de creación relevantes:', relevantCreateEvents.length);

            // Obtener IDs únicos de tokens
            const tokenIds = Array.from(new Set([
                ...relevantTransferEvents.map(event => Number(event.args[1])), // tokenId de transferencias
                ...relevantCreateEvents.map(event => Number(event.args[0])) // tokenId de creaciones
            ]))
            
            console.log('IDs de tokens únicos:', tokenIds);

            // Agrupar tokens por nombre y tipo de producto
            const tokensByProduct = new Map();

            for (const tokenId of tokenIds) {
                try {
                    const balance = await tokensContract.getBalance(tokenId, address)
                    const tokenData = await tokensContract.tokens(tokenId)
                    console.log('Token Data para ID', tokenId, ':', tokenData);
                    
                    const nombresAtributos = await tokensContract.getNombresAtributos(tokenId)
                    console.log('Nombres de atributos:', nombresAtributos);
                    
                    const atributos: { [key: string]: any } = {}
                    for (const nombre of nombresAtributos) {
                        const attr = await tokensContract.getAtributo(tokenId, nombre)
                        atributos[nombre] = attr[1]
                        if (nombre.toLowerCase().includes('fecha') || nombre.toLowerCase().includes('time')) {
                            console.log('Atributo de fecha encontrado:', nombre, attr[1]);
                        }
                    }

                    // Incluir el token si tiene balance > 0 o si es una receta
                    const esReceta = atributos['EsReceta'] === true || atributos['EsReceta'] === 'true'
                    if (Number(balance) > 0 || esReceta) {
                        // Usar el atributo Nombre si está disponible, si no usar tokenData[1]
                        const nombre = atributos['Nombre'] || tokenData[1];
                        const tipo = esReceta ? 'Receta' : (atributos['Tipo_Producto'] || 'Prima');
                        const key = `${nombre}-${tipo}`;

                        const remesa = {
                            id: tokenId,
                            cantidad: Number(balance),
                            timestamp: Number(tokenData[5]),
                            atributos,
                            creador: tokenData[2]
                        };

                        if (!tokensByProduct.has(key)) {
                            tokensByProduct.set(key, {
                                id: tokenId,
                                nombre,
                                tipo,
                                creador: tokenData[2],
                                cantidadTotal: Number(balance),
                                timestamp: Number(tokenData[5]),
                                atributos,
                                nombresAtributos,
                                atributosJSON: JSON.stringify(atributos),
                                esReceta,
                                remesas: [remesa],
                                numRemesas: 1
                            });
                        } else {
                            const existing = tokensByProduct.get(key);
                            existing.cantidadTotal += Number(balance);
                            existing.remesas.push(remesa);
                            existing.numRemesas += 1;
                            // Mantenemos el timestamp más reciente
                            if (Number(tokenData[5]) > existing.timestamp) {
                                existing.timestamp = Number(tokenData[5]);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error procesando token', tokenId, ':', error);
                }
            }

            // Convertir el Map a array para usar en el estado
            const tokens = Array.from(tokensByProduct.values());

            console.log('Total de tokens encontrados:', tokens.length);
            console.log('Lista de tokens:', tokens);
            setTokens(tokens);
        } catch (error: any) {
            console.error('Error loading tokens:', error);
            setError(error.message || 'Error cargando los tokens');
        } finally {
            setLoading(false);
        }
    }

    // Función para cargar las direcciones de minoristas
    const loadMinoristas = async () => {
        try {
            console.log('Cargando minoristas...');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const usuariosContract = new ethers.Contract(
                CONTRACTS.Usuarios.address,
                CONTRACTS.Usuarios.abi,
                provider
            );

            // Obtener todos los usuarios
            const usuarios = await usuariosContract.getUsuarios() as Usuario[];
            console.log('Usuarios encontrados:', usuarios.length);

            // Filtrar solo los minoristas activos
            const minoristasList = usuarios
                .filter((usuario: Usuario) => 
                    usuario.rol.toLowerCase() === 'minorista' && 
                    usuario.activo
                )
                .map((usuario: Usuario) => ({
                    address: usuario.direccion.toLowerCase(),
                    label: `${usuario.nombre} (${usuario.direccion})`
                }));

            console.log('Minoristas filtrados:', minoristasList);
            setMinoristas(minoristasList);
        } catch (error) {
            console.error('Error cargando minoristas:', error);
        }
    };

    useEffect(() => {
        if (address && isAuthenticated) {
            loadTokens()
            loadMinoristas();
        }
    }, [address, isAuthenticated])

    // Función para validar si una dirección es minorista
    const esMinorista = (direccion: string): boolean => {
        return minoristas.some(minorista => minorista.address === direccion.toLowerCase());
    };

    // Función para convertir entre KG y tokens (1:1 en este caso)
    const kgToTokens = (kg: number): number => {
        return kg;
    };

    const tokensToKg = (tokens: number): number => {
        return tokens;
    };

    // Función para manejar la transferencia de tokens
    const handleTransferToken = async (token: Token, quantityInKg: number, destinatario: string, remesaId: number) => {
        try {
            // Verificar que el token sea un producto procesado
            if (token.tipo !== 'Procesado' || token.esReceta) {
                throw new Error('Solo se pueden transferir productos procesados');
            }

            // Verificar que el destinatario sea un minorista
            if (!esMinorista(destinatario)) {
                throw new Error('Solo se puede transferir a direcciones de minoristas');
            }

            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            );

            // Verificar que la cantidad no exceda el balance disponible
            if (quantityInKg > tokensToKg(token.cantidadTotal)) {
                throw new Error('La cantidad excede el balance disponible');
            }

            // Convertir KG a tokens para la transferencia
            const quantityInTokens = kgToTokens(quantityInKg);

            // Iniciar la transferencia
            const tx = await tokensContract.iniciarTransferencia(
                token.id,
                destinatario,
                quantityInTokens
            );

            await tx.wait();
            
            // Recargar los tokens después de la transferencia
            await loadTokens();
            
        } catch (error: any) {
            console.error('Error en la transferencia:', error);
            setError(error.message || 'Error al transferir tokens');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleProcessToken = async (token: Token, quantity: string) => {
        try {
            setLoading(true);
            // Recargar los tokens después del procesamiento
            await loadTokens();
        } catch (error: any) {
            console.error('Error al actualizar los tokens:', error);
            setError(error.message || 'Error al actualizar los tokens');
        } finally {
            setLoading(false);
        }
    };

    // Función para filtrar tokens según la búsqueda
    const filterTokens = (tokens: Token[]) => {
        return tokens.filter(token => 
            token.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.id.toString().includes(searchTerm)
        );
    };

    // Obtener tokens filtrados según el tab activo y término de búsqueda
    const getFilteredTokens = () => {
        let filtered = tokens;
        
        // Filtrar por tipo según el tab
        switch (activeTab) {
            case 'materias':
                filtered = filtered.filter(token => token.tipo === 'Prima');
                break;
            case 'procesados':
                // Mostrar solo productos procesados que NO son recetas
                filtered = filtered.filter(token => token.tipo === 'Procesado' && !token.esReceta);
                break;
            case 'recetas':
                filtered = filtered.filter(token => token.esReceta);
                break;
        }

        // Aplicar filtro de búsqueda
        return searchTerm ? filterTokens(filtered) : filtered;
    };

    // Calcular páginas
    const filteredTokens = getFilteredTokens();
    const totalPages = Math.ceil(filteredTokens.length / itemsPerPage);
    const currentTokens = filteredTokens.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Funciones para manejar el modal de transferencia
    const handleOpenTransferModal = (token: Token) => {
        setSelectedToken(token);
        setShowTransferModal(true);
        setTransferQuantity('');
        setTransferDestination('');
        setSelectedRemesa(null);
    };

    const handleCloseTransferModal = () => {
        setShowTransferModal(false);
        setSelectedToken(null);
        setTransferQuantity('');
        setTransferDestination('');
        setSelectedRemesa(null);
    };

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedToken || !transferQuantity || !transferDestination || selectedRemesa === null) return;

        try {
            const quantity = parseInt(transferQuantity);
            if (isNaN(quantity) || quantity <= 0) {
                throw new Error('La cantidad debe ser un número positivo');
            }

            const remesa = selectedToken.remesas.find(r => r.id === selectedRemesa);
            if (!remesa) {
                throw new Error('Remesa no encontrada');
            }

            if (quantity > remesa.cantidad) {
                throw new Error('La cantidad excede el balance disponible en la remesa');
            }

            await handleTransferToken(selectedToken, quantity, transferDestination, selectedRemesa);
            handleCloseTransferModal();
        } catch (error: any) {
            setError(error.message || 'Error al procesar la transferencia');
        }
    };

    // Función para formatear fechas
    const formatDate = (timestamp: number): string => {
        if (!timestamp || timestamp === 0) {
            return 'Fecha no disponible';
        }
        return new Date(timestamp * 1000).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Función para mostrar información blockchain
    const handleShowBlockchainInfo = async (remesa: any, token: Token) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Obtener información adicional del token
            const tokenData = await contract.tokens(remesa.id)
            const nombresAtributos = await contract.getNombresAtributos(remesa.id)
            
            // Obtener atributos
            const atributos: { [key: string]: any } = {}
            for (const nombre of nombresAtributos) {
                const attr = await contract.getAtributo(remesa.id, nombre)
                atributos[nombre] = attr[1]
            }

            // Obtener información de transferencia
            const transferFilter = contract.filters.TokenTransferido()
            const transferEvents = await contract.queryFilter(transferFilter)
            const transferEvent = transferEvents.find(event => 
                event instanceof ethers.EventLog && 
                event.args && 
                event.args[1].toString() === remesa.id.toString()
            )

            let transferInfo = undefined
            if (transferEvent && transferEvent instanceof ethers.EventLog) {
                const block = await provider.getBlock(transferEvent.blockNumber)
                transferInfo = {
                    timestamp: block ? block.timestamp : null,
                    from: transferEvent.args[2],
                    to: transferEvent.args[3],
                    transferId: transferEvent.args[0].toString() // Añadimos el ID de la transferencia
                }
            }

            // Si es un token procesado, buscar los tokens padres en los atributos
            let tokensPadres = []
            if (token.tipo === 'Procesado') {
                // Los tokens padres están en atributos que empiezan con "Ingrediente_"
                const atributosTokensPadres = nombresAtributos.filter((nombre: string) => 
                    nombre.startsWith('Ingrediente_')
                )

                for (const nombre of atributosTokensPadres) {
                    const attr = await contract.getAtributo(remesa.id, nombre)
                    const nombreIngrediente = nombre.replace('Ingrediente_', '')
                    const cantidad = Number(attr[1])

                    // Obtener el ID del token padre usando el nombre
                    try {
                        const tokenId = await contract.getTokenIdByName(nombreIngrediente)
                        const tokenPadre = await contract.tokens(tokenId)
                        
                        tokensPadres.push({
                            id: Number(tokenId),
                            nombre: nombreIngrediente,
                            cantidad: cantidad / 1000, // Convertir de tokens a KG
                        })
                    } catch (error) {
                        console.error(`Error al obtener token padre ${nombreIngrediente}:`, error)
                    }
                }
            }

            setSelectedBlockchainInfo({
                token: {
                    ...token,
                    tokensPadres,
                    transferInfo
                },
                remesa: {
                    ...remesa,
                    atributos
                }
            })
            setShowBlockchainModal(true)
        } catch (error) {
            console.error('Error al obtener información de blockchain:', error)
            toast.error('Error al obtener información de blockchain')
        }
    };

    const handleCloseBlockchainModal = () => {
        setShowBlockchainModal(false);
        setSelectedBlockchainInfo(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-olive-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-red-500 text-center p-4">
                {error}
            </div>
        )
    }

    const tabs = [
        { id: 'materias', label: 'Materias Primas' },
        { id: 'procesados', label: 'Productos Procesados' },
        { id: 'recetas', label: 'Recetas' }
    ];

    const renderTokens = () => {
        const filteredTokens = tokens.filter(token =>
            token.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
            ((activeTab === 'materias' && token.tipo === 'Prima') ||
             (activeTab === 'procesados' && token.tipo === 'Procesado') ||
             (activeTab === 'recetas' && token.tipo === 'Receta'))
        );

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedTokens = filteredTokens.slice(startIndex, endIndex);
        const totalPages = Math.ceil(filteredTokens.length / itemsPerPage);

        const renderPagination = () => (
            <div className="mt-6 flex justify-center space-x-2">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                    Anterior
                </button>
                <span className="px-4 py-2">
                    Página {currentPage} de {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                    Siguiente
                </button>
            </div>
        );

        const content = (
            <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedTokens.map((token) => {
                        const cantidadKg = token.cantidadTotal / 1000; // Convertir tokens a kg
                        
                        return (
                            <div
                                key={`${token.nombre}-${token.tipo}`}
                                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200 flex flex-col"
                            >
                                <div className="p-5 flex-grow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {token.nombre}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                Tipo: {token.tipo}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Total Tokens:</span>
                                            <span className="font-medium">{token.cantidadTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Total KG:</span>
                                            <span className="font-medium">{cantidadKg.toLocaleString()} kg</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Remesas:</span>
                                            <span className="font-medium">{token.numRemesas}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Desglose de Remesas:</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {token.remesas.map((remesa, index) => {
                                                const remesaKg = remesa.cantidad / 1000;
                                                return (
                                                    <div 
                                                        key={remesa.id}
                                                        className="p-2 bg-gray-50 rounded text-sm"
                                                    >
                                                        <div className="flex justify-between">
                                                            <span>Remesa #{index + 1}</span>
                                                            <span>{formatDate(remesa.timestamp)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>Cantidad:</span>
                                                            <span>{remesa.cantidad.toLocaleString()} KG</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleShowBlockchainInfo(remesa, token);
                                                            }}
                                                            className="mt-2 w-full text-sm text-olive-600 hover:text-olive-700 flex items-center justify-center gap-1"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Info Blockchain
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Solo mostrar el botón de transferencia para productos procesados que no sean recetas */}
                                {token.tipo === 'Procesado' && !token.esReceta && (
                                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                                        <button
                                            onClick={() => handleOpenTransferModal(token)}
                                            className="w-full bg-olive-600 text-white py-2 px-4 rounded hover:bg-olive-700 transition-colors duration-200"
                                        >
                                            Transferir
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {totalPages > 1 && renderPagination()}
            </>
        );

        return content;
    };

    const handleTokenClick = (token: Token) => {
        console.log('Token clicked:', token);
    };

    return (
        <div className="container mx-auto p-8">
            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Materias Primas
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">
                        {tokens.filter(token => token.tipo === 'Prima').length}
                    </p>
                    <p className="text-gray-500">disponibles</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Productos Procesados
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">
                        {tokens.filter(token => token.tipo === 'Procesado' && !token.esReceta).length}
                    </p>
                    <p className="text-gray-500">creados</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Recetas
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">
                        {tokens.filter(token => token.esReceta).length}
                    </p>
                    <p className="text-gray-500">disponibles</p>
                </div>
            </div>

            {/* Pestañas */}
            <div className="mb-8">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                    ${activeTab === tab.id
                                        ? 'border-olive-500 text-olive-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Contenido de la pestaña */}
            <div className="mt-6">
                {renderTokens()}
            </div>

            {/* Modal de Transferencia */}
            {showTransferModal && selectedToken && (
                <div 
                    className="fixed z-50 flex items-center justify-center"
                    style={{
                        top: `${window.scrollY}px`,
                        left: '0',
                        right: '0',
                        bottom: '0',
                        height: '100vh'
                    }}
                >
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50"
                        onClick={handleCloseTransferModal}
                    ></div>
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Transferir {selectedToken.nombre}</h2>
                            <button
                                onClick={handleCloseTransferModal}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleTransferSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Seleccionar Remesa
                                </label>
                                <select
                                    value={selectedRemesa || ''}
                                    onChange={(e) => setSelectedRemesa(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full p-2 border rounded-md bg-white mb-4"
                                    required
                                >
                                    <option value="">Seleccione una remesa</option>
                                    {selectedToken.remesas.map((remesa, index) => (
                                        <option key={remesa.id} value={remesa.id}>
                                            Remesa #{index + 1} - {remesa.cantidad} KG - {formatDate(remesa.timestamp)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cantidad (KG)
                                </label>
                                <input
                                    type="number"
                                    value={transferQuantity}
                                    onChange={(e) => setTransferQuantity(e.target.value)}
                                    className="w-full p-2 border rounded-md"
                                    max={selectedRemesa !== null ? selectedToken.remesas.find(r => r.id === selectedRemesa)?.cantidad || 0 : 0}
                                    min="1"
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Máximo disponible: {selectedRemesa !== null ? 
                                        (selectedToken.remesas.find(r => r.id === selectedRemesa)?.cantidad || 0) : 0} KG
                                </p>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Seleccionar Minorista
                                </label>
                                <select
                                    value={transferDestination}
                                    onChange={(e) => setTransferDestination(e.target.value)}
                                    className="w-full p-2 border rounded-md bg-white"
                                    required
                                >
                                    <option value="">Seleccione un minorista</option>
                                    {minoristas.length > 0 ? (
                                        minoristas.map((minorista) => (
                                            <option key={minorista.address} value={minorista.address}>
                                                {minorista.label}
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>No hay minoristas disponibles</option>
                                    )}
                                </select>
                                {minoristas.length === 0 && (
                                    <p className="text-sm text-red-500 mt-1">
                                        No se encontraron minoristas registrados
                                    </p>
                                )}
                            </div>
                            <div className="flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={handleCloseTransferModal}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700"
                                    disabled={!transferDestination || minoristas.length === 0}
                                >
                                    Confirmar Transferencia
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Información Blockchain */}
            {showBlockchainModal && selectedBlockchainInfo && (
                <div 
                    className="fixed inset-0 z-50 overflow-y-auto"
                    aria-labelledby="modal-title"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div 
                            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                            aria-hidden="true"
                            onClick={handleCloseBlockchainModal}
                        ></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold" id="modal-title">Información Blockchain</h2>
                                    <button
                                        onClick={handleCloseBlockchainModal}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="space-y-6">
                                    {/* Información General */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <h3 className="font-semibold text-lg mb-3 text-olive-800">Información General</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="font-medium text-gray-600">Nombre:</span>
                                                <span className="ml-2">{selectedBlockchainInfo.token.nombre}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-600">Tipo:</span>
                                                <span className="ml-2">{selectedBlockchainInfo.token.tipo}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-600">Cantidad:</span>
                                                <span className="ml-2">{selectedBlockchainInfo.remesa.cantidad} KG</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-600">Fecha de Creación:</span>
                                                <span className="ml-2">{formatDate(selectedBlockchainInfo.remesa.timestamp)}</span>
                                            </div>
                                            {selectedBlockchainInfo.token.transferInfo?.timestamp && (
                                                <div>
                                                    <span className="font-medium text-gray-600">Fecha de Transferencia:</span>
                                                    <span className="ml-2">{formatDate(selectedBlockchainInfo.token.transferInfo.timestamp)}</span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="font-medium text-gray-600">ID de Transferencia:</span>
                                                <span className="ml-2">{selectedBlockchainInfo.token.transferInfo?.transferId}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="font-medium text-gray-600">Creador:</span>
                                                <span className="ml-2 font-mono text-sm">{selectedBlockchainInfo.remesa.creador}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Atributos */}
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <h3 className="font-semibold text-lg mb-3 text-olive-800">Atributos del Lote</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(selectedBlockchainInfo.remesa.atributos)
                                                .sort(([a], [b]) => a.localeCompare(b))
                                                .map(([key, value]) => (
                                                    <div key={key} className="bg-gray-50 p-2 rounded">
                                                        <span className="font-medium text-gray-600">{formatAttributeName(key)}:</span>
                                                        <span className="ml-2">{value.toString()}</span>
                                                    </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tokens Padres (Trazabilidad) */}
                                    {selectedBlockchainInfo.token.tokensPadres && selectedBlockchainInfo.token.tokensPadres.length > 0 && (
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <h3 className="font-semibold text-lg mb-3 text-olive-800">Trazabilidad</h3>
                                            <div className="space-y-3">
                                                {selectedBlockchainInfo.token.tokensPadres.map((tokenPadre, index) => (
                                                    <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="font-medium text-gray-600">Token ID:</span>
                                                                <span className="ml-2 font-mono">{tokenPadre.id}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-600">Nombre:</span>
                                                                <span className="ml-2">{tokenPadre.nombre}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-600">Cantidad:</span>
                                                                <span className="ml-2">{tokenPadre.cantidad} KG</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
