'use client'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '@/context/Web3Context'
import { CONTRACTS } from '@/constants/contracts'

interface Remesa {
    id: number
    cantidad: number
    timestamp: number
    transactionHash: string
    creador: string
}

interface Token {
    nombre: string
    descripcion: string
    cantidadTotal: number
    numRemesas: number
    remesas: Remesa[]
}

interface Ingredient {
    token: Token
    quantity: number
}

export default function ProcessProduct() {
    const { address } = useWeb3()
    const [availableTokens, setAvailableTokens] = useState<Token[]>([])
    const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([])
    const [newProductName, setNewProductName] = useState('')
    const [newProductDescription, setNewProductDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [expandedToken, setExpandedToken] = useState<string | null>(null)

    // Cargar tokens disponibles
    useEffect(() => {
        fetchAvailableTokens()
    }, [address])

    const fetchAvailableTokens = async () => {
        if (!address) return

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                provider
            )

            // Obtener todos los eventos
            const filter = contract.filters.TokenTransferido()
            const createFilter = contract.filters.TokenCreado()
            const transferEvents = await contract.queryFilter(filter)
            const createEvents = await contract.queryFilter(createFilter)
            const allEvents = [...transferEvents, ...createEvents]

            // Usar un Map para agrupar por nombre de token
            const tokenGroups = new Map<string, {
                nombre: string,
                descripcion: string,
                cantidadTotal: number,
                remesas: Map<string, Remesa> // Usar Map para evitar duplicados
            }>()

            for (const event of allEvents) {
                try {
                    // Obtener el nombre del evento desde el topic
                    const eventName = contract.interface.getEvent(event.topics[0])?.name;
                    let tokenId;

                    if (eventName === 'TokenTransferido' || eventName === 'TokenCreado') {
                        const parsedLog = contract.interface.parseLog({
                            topics: event.topics,
                            data: event.data
                        });
                        if (!parsedLog) continue;
                        tokenId = parsedLog.args[0];
                    }

                    if (!tokenId) continue;

                    const balance = await contract.getBalance(tokenId, address)

                    if (Number(balance) > 0) {
                        const token = await contract.tokens(tokenId)
                        const nombre = token[1]
                        
                        const remesa: Remesa = {
                            id: Number(tokenId),
                            cantidad: Number(balance),
                            timestamp: Number(token[5]),
                            transactionHash: event.transactionHash,
                            creador: token[2]
                        }

                        if (tokenGroups.has(nombre)) {
                            const group = tokenGroups.get(nombre)!
                            // Usar el ID como clave para evitar duplicados
                            group.remesas.set(tokenId.toString(), remesa)
                            group.cantidadTotal = Array.from(group.remesas.values())
                                .reduce((sum, r) => sum + r.cantidad, 0)
                        } else {
                            const remesas = new Map<string, Remesa>()
                            remesas.set(tokenId.toString(), remesa)
                            tokenGroups.set(nombre, {
                                nombre: nombre,
                                descripcion: token[3],
                                cantidadTotal: remesa.cantidad,
                                remesas: remesas
                            })
                        }
                    }
                } catch (error) {
                    console.error(`Error processing event for token:`, error)
                }
            }

            // Convertir el Map a array y ordenar
            const tokens = Array.from(tokenGroups.values()).map(group => ({
                ...group,
                numRemesas: group.remesas.size,
                remesas: Array.from(group.remesas.values())
                    .sort((a, b) => b.timestamp - a.timestamp)
            }))

            tokens.sort((a, b) => a.nombre.localeCompare(b.nombre))
            setAvailableTokens(tokens)
            
            if (tokens.length === 0) {
                setError('No hay materias primas disponibles. Necesitas recibir tokens del productor primero.')
            } else {
                setError('')
            }
        } catch (error) {
            console.error('Error fetching tokens:', error)
            setError('Error al cargar las materias primas disponibles')
        }
    }

    const addIngredient = (token: Token) => {
        setSelectedIngredients(prev => [...prev, { token, quantity: 0 }])
    }

    const removeIngredient = (tokenId: number) => {
        setSelectedIngredients(prev => prev.filter(ing => ing.token.remesas[0].id !== tokenId))
    }

    const updateIngredientQuantity = (tokenId: number, quantity: number) => {
        setSelectedIngredients(prev =>
            prev.map(ing =>
                ing.token.remesas[0].id === tokenId
                    ? { ...ing, quantity }
                    : ing
            )
        )
    }

    const processProduct = async () => {
        if (!address || selectedIngredients.length === 0) return

        try {
            setLoading(true)
            setError('')

            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                signer
            )

            // Verificar que tenemos suficiente cantidad de cada ingrediente
            for (const ing of selectedIngredients) {
                const balance = await contract.getBalance(ing.token.remesas[0].id, address)
                if (Number(balance) < ing.quantity * 1000) {
                    throw new Error(`No hay suficiente cantidad de ${ing.token.nombre}`)
                }
            }

            // Calcular la cantidad total del nuevo producto (por ahora, suma simple)
            const totalQuantity = selectedIngredients.reduce((sum, ing) => sum + ing.quantity, 0)

            // Crear el nuevo producto
            const tx = await contract.procesarMateriasPrimas(
                selectedIngredients.map(ing => ing.token.remesas[0].id),
                selectedIngredients.map(ing => ing.quantity * 1000),
                newProductName,
                totalQuantity * 1000,
                newProductDescription,
                [], // Empty array for attribute names
                []  // Empty array for attribute values
            )

            await tx.wait()
            
            // Limpiar el formulario
            setSelectedIngredients([])
            setNewProductName('')
            setNewProductDescription('')
            
            // Recargar tokens disponibles
            await fetchAvailableTokens()
        } catch (error: any) {
            console.error('Error processing product:', error)
            setError(error.message || 'Error al procesar el producto')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Procesar Nuevo Producto</h2>
            
            {/* Paso 1: Información del Producto Final */}
            <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-olive-100 text-olive-600 text-sm font-bold">1</span>
                    Información del Producto Final
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto</label>
                        <input
                            type="text"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            className="w-full rounded-lg border-gray-300 focus:ring-olive-500 focus:border-olive-500"
                            placeholder="Ej: Aceite de Oliva Extra Virgen"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <input
                            type="text"
                            value={newProductDescription}
                            onChange={(e) => setNewProductDescription(e.target.value)}
                            className="w-full rounded-lg border-gray-300 focus:ring-olive-500 focus:border-olive-500"
                            placeholder="Ej: Aceite de primera prensada en frío"
                        />
                    </div>
                </div>
            </div>

            {/* Paso 2: Selección de Materias Primas */}
            <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-olive-100 text-olive-600 text-sm font-bold">2</span>
                    Selección de Materias Primas
                </h3>
                
                {availableTokens.length === 0 ? (
                    <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p className="mt-4 text-gray-500">No hay materias primas disponibles. Necesitas recibir tokens del productor primero.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {availableTokens.map(token => (
                            <div key={token.nombre} className="border rounded-xl p-5 bg-gray-50 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-semibold text-gray-800">{token.nombre}</h4>
                                        <p className="text-sm text-gray-600">{token.descripcion}</p>
                                        <div className="flex flex-wrap gap-3">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
                                                </svg>
                                                {token.cantidadTotal / 1000} kg
                                            </span>
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
                                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                                </svg>
                                                {token.numRemesas} remesas
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setExpandedToken(expandedToken === token.nombre ? null : token.nombre)}
                                        className={`text-sm px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                                            expandedToken === token.nombre
                                                ? 'bg-olive-200 text-olive-800 shadow-inner'
                                                : 'bg-olive-100 text-olive-700 hover:bg-olive-200 hover:shadow'
                                        }`}
                                    >
                                        {expandedToken === token.nombre ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/>
                                                </svg>
                                                Ocultar
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                                                </svg>
                                                Ver Remesas
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                {/* Desplegable de Remesas */}
                                {expandedToken === token.nombre && (
                                    <div className="mt-4 border-t pt-4">
                                        <h5 className="text-sm font-semibold text-gray-700 mb-3">Remesas Disponibles:</h5>
                                        <div className="space-y-3">
                                            {token.remesas.map(remesa => (
                                                <div key={remesa.id} 
                                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-800">Remesa #{remesa.id}</span>
                                                            <span className="text-sm px-2 py-0.5 bg-green-100 text-green-700 rounded-md">
                                                                {remesa.cantidad / 1000} kg
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                            </svg>
                                                            {new Date(remesa.timestamp * 1000).toLocaleDateString('es-ES', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const tokenWithSingleRemesa = {
                                                                ...token,
                                                                remesas: [remesa],
                                                                cantidadTotal: remesa.cantidad
                                                            }
                                                            addIngredient(tokenWithSingleRemesa)
                                                            setExpandedToken(null)
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                                                            ${selectedIngredients.some(ing => 
                                                                ing.token.remesas.some(r => r.id === remesa.id)
                                                            )
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                : 'bg-olive-100 text-olive-700 hover:bg-olive-200 hover:shadow-sm'
                                                            }`}
                                                        disabled={selectedIngredients.some(ing => 
                                                            ing.token.remesas.some(r => r.id === remesa.id)
                                                        )}
                                                    >
                                                        {selectedIngredients.some(ing => 
                                                            ing.token.remesas.some(r => r.id === remesa.id)
                                                        ) ? (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                                                                </svg>
                                                                Agregada
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                                                </svg>
                                                                Agregar
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Paso 3: Ingredientes Seleccionados y Procesamiento */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-olive-100 text-olive-600 text-sm font-bold">3</span>
                    Ingredientes Seleccionados
                </h3>

                {selectedIngredients.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p className="mt-4 text-gray-500">No has seleccionado ningún ingrediente aún.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedIngredients.map(ing => (
                            <div key={ing.token.remesas[0].id} className="bg-gray-50 rounded-xl border p-4 hover:shadow-md transition-all duration-200">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-medium text-gray-800">{ing.token.nombre}</h4>
                                            <span className="px-2.5 py-1 bg-olive-50 text-olive-700 rounded-lg text-sm font-medium">
                                                Remesa #{ing.token.remesas[0].id}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
                                            </svg>
                                            Disponible: {ing.token.cantidadTotal / 1000} kg
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={ing.quantity}
                                                onChange={(e) => updateIngredientQuantity(ing.token.remesas[0].id, Number(e.target.value))}
                                                className="w-28 rounded-lg border-gray-300 pr-12 py-2 focus:ring-olive-500 focus:border-olive-500"
                                                placeholder="0"
                                                min="0"
                                                max={ing.token.cantidadTotal / 1000}
                                                step="0.1"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                                                kg
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeIngredient(ing.token.remesas[0].id)}
                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar ingrediente"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Botón de Procesar */}
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={processProduct}
                                disabled={loading || selectedIngredients.length === 0 || !newProductName}
                                className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 border
                                    ${loading || selectedIngredients.length === 0 || !newProductName
                                        ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                        : 'bg-green-600 text-white border-green-700 hover:bg-green-700 hover:shadow-md'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                        <span>Procesar Producto</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600">{error}</p>
                </div>
            )}
        </div>
    )
}
