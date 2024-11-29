'use client'

import { useState, useEffect } from 'react'
import { ethers, EventLog } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { ShoppingCartIcon, TagIcon, ClockIcon, MapIcon } from '@heroicons/react/24/outline'
import TokenRouteModal from '@/components/shared/TokenRouteModal'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useWeb3 } from '@/context/Web3Context';

interface Token {
    id: number;
    nombre: string;
    descripcion: string;
    cantidad: string;
    creador: string;
    balance: string;
}

export default function TokensDisponibles() {
    const { address } = useWeb3()
    const [tokens, setTokens] = useState<Token[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedToken, setSelectedToken] = useState<Token | null>(null)
    const [showRouteModal, setShowRouteModal] = useState(false)
    const [showSellModal, setShowSellModal] = useState(false)
    const [sellAmount, setSellAmount] = useState('')

    useEffect(() => {
        if (address) {
            loadTokens()
        } else {
            setLoading(false)
        }
    }, [address])

    const loadTokens = async () => {
        try {
            if (!window.ethereum) {
                throw new Error('No ethereum provider found')
            }
            
            console.log('Iniciando carga de tokens para minorista:', address)
            const provider = new ethers.BrowserProvider(window.ethereum)
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Obtener el último bloque
            const latestBlock = await provider.getBlockNumber()
            const fromBlock = 0
            
            console.log('Buscando eventos desde el bloque', fromBlock, 'hasta', latestBlock)
            
            // Obtener eventos de transferencia
            const transferFilter = tokensContract.filters.TokenTransferido()
            const transferEvents = await tokensContract.queryFilter(transferFilter, fromBlock, latestBlock)
            console.log('Eventos de transferencia encontrados:', transferEvents.length)
            
            // Filtrar eventos donde el minorista es el destinatario
            const myTransferEvents = transferEvents
                .filter((e): e is EventLog => e instanceof EventLog)
                .filter(event => 
                    event.args.to.toLowerCase() === address?.toLowerCase()
                )
            
            console.log('Mis eventos de transferencia:', myTransferEvents.length)

            // Obtener IDs únicos de tokens
            const tokenIds = Array.from(new Set(
                myTransferEvents.map(event => Number(event.args.tokenId))
            ))

            console.log('Token IDs encontrados:', tokenIds)

            // Obtener datos de cada token
            const tokenPromises = tokenIds.map(async (tokenId) => {
                try {
                    const tokenData = await tokensContract.tokens(tokenId)
                    const balance = await tokensContract.getBalance(tokenId, address)
                    
                    if (balance > 0) {
                        const enTransito = await tokensContract.tokensEnTransito(address, tokenId)
                        
                        // Obtener los atributos del token
                        const attrNames = await tokensContract.getNombresAtributos(tokenId)
                        const attributes = await Promise.all(
                            attrNames.map(async (name: string) => {
                                const attr = await tokensContract.getAtributo(tokenId, name)
                                return {
                                    nombre: name,
                                    valor: attr.valor || ''
                                }
                            })
                        )
                        
                        const nombreAttr = attributes.find(attr => attr.nombre === 'Nombre')
                        
                        return {
                            id: tokenId,
                            nombre: nombreAttr?.valor || tokenData[1],
                            descripcion: tokenData[3],
                            cantidad: balance.toString(),
                            creador: tokenData[2],
                            balance: enTransito.toString()
                        }
                    }
                    return null
                } catch (error) {
                    console.error(`Error obteniendo token ${tokenId}:`, error)
                    return null
                }
            })

            const validTokens = (await Promise.all(tokenPromises))
                .filter((token): token is Token => token !== null)

            console.log('Lista final de tokens:', validTokens)
            setTokens(validTokens)
        } catch (err) {
            console.error('Error cargando tokens:', err)
            setError('Error cargando los tokens disponibles')
        } finally {
            setLoading(false)
        }
    }

    const burnTokens = async (tokenId: number, cantidad: string) => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            );

            console.log('Iniciando venta:', {
                tokenId,
                cantidad,
                address: await signer.getAddress()
            });

            // Quemar los tokens usando la función específica del contrato
            const tx = await tokensContract.quemarTokens(
                tokenId,
                ethers.parseUnits(cantidad, 'wei'),
                { gasLimit: 1000000 }
            );

            console.log('Transacción enviada:', tx.hash);
            const receipt = await tx.wait();
            console.log('Transacción confirmada:', {
                hash: receipt.hash,
                status: receipt.status,
                events: receipt.logs
            });

            toast.success("Venta realizada exitosamente", {
                icon: false
            });
            loadTokens(); // Recargar tokens después de quemar
        } catch (error: any) {
            console.error("Error detallado:", {
                error,
                data: error.data,
                message: error.message,
                reason: error.reason
            });
            toast.error("Error al quemar tokens", {
                icon: false
            });
        }
    };

    const handleSell = async () => {
        if (!selectedToken || !sellAmount) {
            toast.error("Por favor, ingrese una cantidad", {
                icon: false
            });
            return;
        }
        
        try {
            const amountInKg = parseFloat(sellAmount);
            if (isNaN(amountInKg) || amountInKg <= 0) {
                toast.error("Por favor, ingrese una cantidad válida mayor a 0", {
                    icon: false
                });
                return;
            }
            
            // Convertir kg a tokens (1 kg = 1000 tokens)
            const tokensToSell = Math.floor(amountInKg * 1000);
            const disponibleKg = parseInt(selectedToken.cantidad) / 1000;
            
            if (amountInKg > disponibleKg) {
                toast.error(`La cantidad máxima disponible es ${disponibleKg.toFixed(3)} kg`, {
                    icon: false
                });
                return;
            }
            
            // Mostrar mensaje de confirmación
            const confirmar = window.confirm(
                `¿Está seguro que desea vender ${amountInKg.toFixed(3)} kg de ${selectedToken.nombre}?`
            );
            
            if (!confirmar) return;
            
            // Mostrar loading
            toast.info("Procesando venta...", {
                icon: false,
                position: "bottom-right",
                autoClose: false,
                hideProgressBar: true
            });
            
            await burnTokens(selectedToken.id, tokensToSell.toString());
            setShowSellModal(false);
            setSellAmount('');
            
            // Mostrar éxito con la cantidad vendida
            toast.success(`Se vendieron ${amountInKg.toFixed(3)} kg de ${selectedToken.nombre} exitosamente`, {
                icon: false
            });
        } catch (error) {
            console.error("Error en la venta:", error);
            toast.error("Error al procesar la venta. Por favor intente nuevamente", {
                icon: false
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="animate-pulse flex flex-col space-y-4">
                    <div className="h-12 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="bg-white p-6 rounded-lg shadow-sm">
                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Productos Disponibles</h1>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => {}} 
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700"
                        >
                            <ShoppingCartIcon className="h-5 w-5 mr-2" />
                            Ver Carrito
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tokens.map((token) => (
                        <div 
                            key={token.id}
                            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">{token.nombre}</h3>
                                    <TagIcon className="h-5 w-5 text-olive-600" />
                                </div>
                                
                                <p className="text-gray-600 mb-4 line-clamp-2">{token.descripcion}</p>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <ClockIcon className="h-4 w-4 mr-2" />
                                        <span>Stock: {(Number(token.cantidad) / 1000).toFixed(3)} kg</span>
                                    </div>
                                    {token.balance !== "0" && (
                                        <div className="text-sm text-amber-600">
                                            {(Number(token.balance) / 1000).toFixed(3)} kg en tránsito
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-6 flex space-x-2">
                                    <button
                                        onClick={() => setSelectedToken(token)}
                                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                                    >
                                        <ShoppingCartIcon className="h-4 w-4 mr-2" />
                                        Ver Detalles
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedToken(token)
                                            setShowRouteModal(true)
                                        }}
                                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                                    >
                                        <MapIcon className="h-4 w-4 mr-2" />
                                        Ver Ruta
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedToken(token)
                                            setShowSellModal(true)
                                        }}
                                        className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        Vender
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {tokens.length === 0 && (
                    <div className="text-center py-12">
                        <ShoppingCartIcon className="mx-auto h-8 w-8 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos disponibles</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Los productos aparecerán aquí cuando estén disponibles.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de Venta */}
            {showSellModal && selectedToken && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-lg font-semibold mb-4">Vender {selectedToken.nombre}</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cantidad disponible: {(Number(selectedToken.cantidad) / 1000).toFixed(3)} kg
                            </label>
                            <input
                                type="number"
                                min="0.001"
                                max={(Number(selectedToken.cantidad) / 1000)}
                                step="0.001"
                                value={sellAmount}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Permitir números positivos y decimales
                                    if (value === '' || parseFloat(value) >= 0) {
                                        setSellAmount(value);
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                                placeholder="Ingrese la cantidad en kilogramos"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                {sellAmount && !isNaN(parseFloat(sellAmount)) 
                                    ? `Se quemarán ${Math.floor(parseFloat(sellAmount) * 1000)} tokens` 
                                    : 'Ingrese la cantidad en kilogramos'}
                            </p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowSellModal(false);
                                    setSellAmount('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSell}
                                className="px-4 py-2 text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 rounded-md"
                            >
                                Confirmar Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Ruta del Token */}
            {selectedToken && (
                <TokenRouteModal
                    isOpen={showRouteModal}
                    onClose={() => setShowRouteModal(false)}
                    tokenId={selectedToken.id}
                    creador={selectedToken.creador}
                />
            )}
            <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                limit={3}
            />
        </div>
    )
}
