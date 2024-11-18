'use client'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '@/context/Web3Context'
import { CONTRACTS } from '@/constants/contracts'

interface Token {
    id: number
    nombre: string
    descripcion: string
    cantidad: number
    creador: string
    timestamp: number
    transactionHash: string
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

            // Obtener todos los eventos de transferencia y creación
            const transferEvents = await contract.queryFilter('TokenTransferido')
            const createEvents = await contract.queryFilter('TokenCreado')

            // Combinar todos los eventos
            const allEvents = [...transferEvents, ...createEvents]

            // Obtener los tokens únicos y sus balances actuales
            const tokenMap = new Map()

            for (const event of allEvents) {
                const tokenId = event.args[0] // El ID es siempre el primer argumento
                
                try {
                    // Obtener el balance actual del token
                    const balance = await contract.getBalance(tokenId, address)
                    
                    // Solo procesar si hay balance
                    if (Number(balance) > 0) {
                        const token = await contract.tokens(tokenId)
                        tokenMap.set(Number(tokenId), {
                            id: Number(tokenId),
                            nombre: token.nombre,
                            descripcion: token.descripcion,
                            cantidad: Number(balance),
                            creador: token.creador,
                            timestamp: Number(token.timestamp),
                            transactionHash: event.transactionHash
                        })
                    }
                } catch (error) {
                    console.error(`Error fetching token ${tokenId}:`, error)
                }
            }

            // Convertir el Map a array
            const tokens = Array.from(tokenMap.values())
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
        setSelectedIngredients(prev => prev.filter(ing => ing.token.id !== tokenId))
    }

    const updateIngredientQuantity = (tokenId: number, quantity: number) => {
        setSelectedIngredients(prev =>
            prev.map(ing =>
                ing.token.id === tokenId
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
                const balance = await contract.getBalance(ing.token.id, address)
                if (Number(balance) < ing.quantity * 1000) {
                    throw new Error(`No hay suficiente cantidad de ${ing.token.nombre}`)
                }
            }

            // Calcular la cantidad total del nuevo producto (por ahora, suma simple)
            const totalQuantity = selectedIngredients.reduce((sum, ing) => sum + ing.quantity, 0)

            // Crear el nuevo producto
            const tx = await contract.procesarProducto(
                selectedIngredients.map(ing => ing.token.id),
                selectedIngredients.map(ing => ing.quantity * 1000),
                newProductName,
                totalQuantity * 1000,
                newProductDescription
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
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Procesar Nuevo Producto</h2>
            
            {/* Formulario del nuevo producto */}
            <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">1. Información del Producto Final</h3>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                    <input
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
                        placeholder="Aceite de Oliva Premium"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                    <textarea
                        value={newProductDescription}
                        onChange={(e) => setNewProductDescription(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
                        rows={3}
                        placeholder="Describe el proceso y las materias primas utilizadas"
                    />
                </div>
            </div>

            {/* Lista de materias primas disponibles */}
            <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">2. Seleccionar Materias Primas</h3>
                {availableTokens.length === 0 ? (
                    <div className="text-center py-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-gray-500">No hay materias primas disponibles. Necesitas recibir tokens del productor primero.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableTokens.map(token => (
                            <div key={token.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium">{token.nombre}</h4>
                                        <p className="text-sm text-gray-500">{token.descripcion}</p>
                                        <p className="text-sm mt-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Disponible: {token.cantidad / 1000} kg
                                            </span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => addIngredient(token)}
                                        className={`px-3 py-1 rounded-md transition-colors ${
                                            selectedIngredients.some(ing => ing.token.id === token.id)
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-olive-100 text-olive-700 hover:bg-olive-200'
                                        }`}
                                        disabled={selectedIngredients.some(ing => ing.token.id === token.id)}
                                    >
                                        {selectedIngredients.some(ing => ing.token.id === token.id)
                                            ? 'Agregado'
                                            : 'Agregar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Ingredientes seleccionados */}
            <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">3. Especificar Cantidades</h3>
                {selectedIngredients.length === 0 ? (
                    <div className="text-center py-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <p className="text-gray-500">No has seleccionado ningún ingrediente aún.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {selectedIngredients.map(ing => (
                            <div key={ing.token.id} className="flex items-center gap-4 border rounded-lg p-4 bg-white">
                                <div className="flex-1">
                                    <h4 className="font-medium">{ing.token.nombre}</h4>
                                    <p className="text-sm text-gray-500">Disponible: {ing.token.cantidad / 1000} kg</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={ing.quantity}
                                            onChange={(e) => updateIngredientQuantity(ing.token.id, Number(e.target.value))}
                                            className="w-24 rounded-md border-gray-300 pr-12"
                                            placeholder="0"
                                            min="0"
                                            max={ing.token.cantidad / 1000}
                                            step="0.1"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">kg</span>
                                    </div>
                                    <button
                                        onClick={() => removeIngredient(ing.token.id)}
                                        className="text-red-600 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                                        title="Eliminar ingrediente"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="mt-4 p-4 bg-olive-50 rounded-lg">
                            <p className="text-olive-700 font-medium">
                                Total de ingredientes: {selectedIngredients.reduce((sum, ing) => sum + ing.quantity, 0)} kg
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            <button
                onClick={processProduct}
                disabled={loading || selectedIngredients.length === 0 || !newProductName}
                className={`w-full py-3 px-4 rounded-md transition-colors ${
                    loading || selectedIngredients.length === 0 || !newProductName
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-olive-600 hover:bg-olive-700 text-white'
                }`}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Procesando...
                    </span>
                ) : (
                    'Procesar Producto'
                )}
            </button>
        </div>
    )
}
