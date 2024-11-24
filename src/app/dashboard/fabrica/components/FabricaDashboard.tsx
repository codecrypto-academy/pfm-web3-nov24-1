'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'
import ClientTransactions from '@/components/shared/ClientTransactions'
import PendingTransfers from '@/components/TransferenciasPendientes'

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
                    const nombresAtributos = await tokensContract.getNombresAtributos(tokenId)
                    
                    const atributos: { [key: string]: any } = {}
                    for (const nombre of nombresAtributos) {
                        const attr = await tokensContract.getAtributo(tokenId, nombre)
                        atributos[nombre] = attr[1]
                    }

                    // Incluir el token si tiene balance > 0 o si es una receta
                    const esReceta = atributos['EsReceta'] === true || atributos['EsReceta'] === 'true'
                    if (Number(balance) > 0 || esReceta) {
                        const nombre = tokenData[1];
                        const tipo = esReceta ? 'Receta' : (atributos['Tipo_Producto'] || 'Prima');
                        const key = `${nombre}-${tipo}`;

                        const remesa = {
                            id: tokenId,
                            cantidad: Number(balance),
                            timestamp: Number(tokenData[4]),
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
                                timestamp: Number(tokenData[4]),
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
                            if (Number(tokenData[4]) > existing.timestamp) {
                                existing.timestamp = Number(tokenData[4]);
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

    useEffect(() => {
        if (address && isAuthenticated) {
            loadTokens()
        }
    }, [address, isAuthenticated])

    const handleProcessToken = async (token: Token, quantity: string) => {
        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            );

            console.log('Procesando token:', {
                tokenId: token.id,
                quantity,
                atributos: token.atributos
            });

            // Actualizar los atributos
            const nombresAtributos = ['Tipo_Producto', 'EsReceta'];
            const valoresAtributos = ['Procesado', 'false'];

            console.log('Enviando atributos:', {
                nombresAtributos,
                valoresAtributos
            });

            // Esperar a que se complete la transacción
            const tx = await contract.procesarToken(
                token.id,
                quantity,
                nombresAtributos,
                valoresAtributos,
                { gasLimit: 500000 }
            );

            console.log('Transacción enviada:', tx.hash);
            const receipt = await tx.wait();
            console.log('Transacción confirmada:', receipt);

            // Recargar los tokens
            await loadTokens();
            
        } catch (error: any) {
            console.error('Error al procesar el token:', error);
            setError(error.message || 'Error al procesar el token');
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
                                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200"
                            >
                                <div className="p-5">
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
                                        <p className="font-semibold text-sm text-gray-700">Atributos:</p>
                                        {Object.entries(token.atributos).map(([key, value]) => (
                                            <p key={key} className="text-sm text-gray-600">
                                                {key}: {String(value)}
                                            </p>
                                        ))}
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
                                                            <span>{new Date(remesa.timestamp * 1000).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>Tokens:</span>
                                                            <span>{remesa.cantidad.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>KG:</span>
                                                            <span>{remesaKg.toLocaleString()} kg</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
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

    // Función para formatear nombres de atributos
    const formatAttributeName = (key: string): string => {
        // Casos especiales
        if (key === 'MetodoRecoleccion') {
            return 'Método de Recolección';
        }

        // Eliminar prefijos comunes
        let formatted = key.replace(/^Ingrediente_/, '');
        
        // Reemplazar guiones bajos por espacios
        formatted = formatted.replace(/_/g, ' ');
        
        // Capitalizar cada palabra
        formatted = formatted.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        return formatted;
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
                    <div className="mt-2 text-sm text-gray-600">
                        {tokens.filter(token => token.tipo === 'Procesado').map((token, index) => (
                            <div key={index} className="mt-1">
                                <p>Nombre: {token.nombre}</p>
                                <p>Tipo: {token.tipo}</p>
                                <p>EsReceta: {String(token.esReceta)}</p>
                                <p>Atributos: {JSON.stringify(token.atributos)}</p>
                                <hr className="my-2"/>
                            </div>
                        ))}
                    </div>
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
        </div>
    )
}
