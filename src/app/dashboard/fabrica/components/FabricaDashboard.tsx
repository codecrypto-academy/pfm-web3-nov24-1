'use client'

import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { ethers } from 'ethers'
import { Log, Contract, EventLog } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'
import ClientTransactions from '@/components/shared/ClientTransactions'
import PendingTransfers from '@/components/TransferenciasPendientes'

interface Token {
    id: number
    nombre: string
    tipo: string
    creador: string
    cantidad: number
    timestamp: number
    atributos: { [key: string]: TokenAttribute }
    nombresAtributos: string[]
    atributosJSON: string
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

            // Obtener eventos de creación
            const filter = tokensContract.filters.TokenCreado()
            const latestBlock = await provider.getBlockNumber()
            
            console.log('Cargando tokens creados por la fábrica...')
            
            const events = await tokensContract.queryFilter(filter)
            console.log('Eventos sin procesar:', events.length)

            const factoryTokens = events
                .filter((event: Log | EventLog): event is EventLog => {
                    if (!('args' in event)) {
                        return false
                    }

                    const argsArray = Array.from(event.args)
                    
                    // Verificar que tenemos al menos tokenId y creador
                    if (argsArray.length < 2) {
                        console.log('Evento inválido - argumentos insuficientes:', argsArray)
                        return false
                    }

                    const [tokenId, cantidad, creador] = argsArray
                    console.log('Validando token:', {
                        tokenId: tokenId?.toString(),
                        cantidad: cantidad?.toString(),
                        creador: creador?.toString(),
                        factoryAddress: address?.toLowerCase(),
                        isMatch: creador?.toString()?.toLowerCase() === address?.toLowerCase()
                    })

                    return creador?.toString()?.toLowerCase() === address?.toLowerCase()
                })
                .map(async (event) => {
                    const [tokenId] = Array.from(event.args)
                    
                    try {
                        // Obtener datos básicos del token
                        const tokenData = await tokensContract.tokens(tokenId)
                        console.log(`Datos del token ${tokenId}:`, tokenData)

                        // Obtener atributos
                        const nombresAtributos = await tokensContract.getNombresAtributos(tokenId)
                        const atributos: { [key: string]: TokenAttribute } = {}

                        for (const nombre of nombresAtributos) {
                            const attr = await tokensContract.getAtributo(tokenId, nombre)
                            if (attr && attr[0]) {
                                atributos[nombre] = {
                                    nombre: attr[0],
                                    valor: attr[1],
                                    timestamp: Number(attr[2])
                                }
                            }
                        }

                        // Extraer el tipo del token de los atributos y asegurar que sea string
                        const tipoValor = atributos['Tipo_Producto']?.valor
                        const tipo = typeof tipoValor === 'undefined' ? 'Prima' : String(tipoValor)
                        console.log('Token tipo:', {
                            tokenId: tokenId.toString(),
                            tipo,
                            tipoOriginal: tipoValor,
                            atributos: JSON.stringify(atributos, null, 2)
                        })

                        return {
                            id: Number(tokenId),
                            nombre: tokenData.nombre,
                            tipo,
                            creador: address,
                            cantidad: Number(tokenData.cantidad) || 0,
                            timestamp: Math.floor(Date.now() / 1000),
                            atributos,
                            nombresAtributos,
                            atributosJSON: JSON.stringify(atributos, null, 2)
                        }
                    } catch (error) {
                        console.error(`Error cargando token ${tokenId}:`, error)
                        return null
                    }
                })

            // Esperar a que se resuelvan todas las promesas y filtrar los nulos
            const tokens = (await Promise.all(factoryTokens)).filter(token => token !== null)
            console.log('Tokens procesados:', tokens)
            console.log('Actualizando estado con tokens:', tokens.length)

            setTokens(tokens)
            setLoading(false)
        } catch (error) {
            console.error('Error al cargar tokens:', error)
            setError('Error al cargar los tokens')
            setLoading(false)
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
            const nombresAtributos = ['Tipo_Producto'];
            const valoresAtributos = ['Procesado'];

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
        { id: 'materias', name: 'Materias Primas' },
        { id: 'productos', name: 'Productos Procesados' },
        { id: 'procesar', name: 'Procesar Productos' },
        { id: 'historial', name: 'Historial' },
        { id: 'pendientes', name: 'Transferencias Pendientes' },
    ]

    const renderTabContent = () => {
        console.log('Renderizando tab:', activeTab)
        console.log('Tokens disponibles:', tokens.length)
        
        switch (activeTab) {
            case 'materias':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold mb-4">Debug: Todos los Tokens</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-4 py-2 border">ID</th>
                                        <th className="px-4 py-2 border">Nombre</th>
                                        <th className="px-4 py-2 border">Cantidad</th>
                                        <th className="px-4 py-2 border">Creador</th>
                                        <th className="px-4 py-2 border">Tipo</th>
                                        <th className="px-4 py-2 border">Todos los Atributos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tokens.map((token) => (
                                        <tr key={token.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 border">{token.id}</td>
                                            <td className="px-4 py-2 border">{token.nombre}</td>
                                            <td className="px-4 py-2 border">{token.cantidad}</td>
                                            <td className="px-4 py-2 border">{`${token.creador.slice(0, 6)}...${token.creador.slice(-4)}`}</td>
                                            <td className="px-4 py-2 border">{token.tipo}</td>
                                            <td className="px-4 py-2 border">
                                                <pre className="whitespace-pre-wrap text-xs">
                                                    {token.atributosJSON}
                                                </pre>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h2 className="text-xl font-bold mb-4">Materias Primas</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tokens
                                .filter(token => {
                                    const tipo = token.tipo;
                                    console.log('Token en materias:', {
                                        id: token.id,
                                        tipo,
                                        atributos: JSON.parse(token.atributosJSON)
                                    });
                                    return tipo === 'Prima';
                                })
                                .map((token) => (
                                    <div
                                        key={token.id}
                                        className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                            {token.nombre}
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            {/* token.descripcion || 'Sin descripción' */}
                                        </p>
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500">
                                                Cantidad: {token.cantidad}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                ID: {token.id}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                );
            case 'productos':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tokens
                            .filter(token => {
                                const tipo = token.tipo;
                                console.log('Token en procesados:', {
                                    id: token.id,
                                    tipo,
                                    atributos: JSON.parse(token.atributosJSON)
                                });
                                return tipo === 'Procesado';
                            })
                            .map((token) => (
                                <div
                                    key={token.id}
                                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                                >
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                        {token.nombre}
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        {/* token.descripcion || 'Sin descripción' */}
                                    </p>
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-500">
                                            Cantidad: {token.cantidad}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            ID: {token.id}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                );
            case 'procesar':
                return <div>Funcionalidad en desarrollo...</div>
            case 'historial':
                return <ClientTransactions role="fabrica" />
            case 'pendientes':
                return <PendingTransfers />
            default:
                return null
        }
    }

    return (
        <div className="container mx-auto p-8">
            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Materias Primas
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">
                        {tokens.filter(token => {
                            const tipo = token.tipo;
                            console.log('Token en contador materias:', token.id, 'Tipo:', tipo);
                            return tipo === 'Prima';
                        }).length}
                    </p>
                    <p className="text-gray-500">disponibles</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Productos Procesados
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">
                        {tokens.filter(token => {
                            const tipo = token.tipo;
                            console.log('Token en contador procesados:', token.id, 'Tipo:', tipo);
                            return tipo === 'Procesado';
                        }).length}
                    </p>
                    <p className="text-gray-500">creados</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Transferencias
                    </h3>
                    <p className="text-2xl font-bold text-olive-600">0</p>
                    <p className="text-gray-500">pendientes</p>
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
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Contenido de la pestaña */}
            <div className="mt-6">
                {renderTabContent()}
            </div>
        </div>
    )
}
