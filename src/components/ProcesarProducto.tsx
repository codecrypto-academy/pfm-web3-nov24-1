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
    isRecipe?: boolean
}

interface Ingredient {
    token: Token
    quantity: number
}

interface Attribute {
    key: string
    value: string
}

export default function ProcessProduct() {
    const { address } = useWeb3()
    const [rawMaterials, setRawMaterials] = useState<Token[]>([])
    const [processedProducts, setProcessedProducts] = useState<Token[]>([])
    const [recipes, setRecipes] = useState<Token[]>([])
    const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([])
    const [newProductName, setNewProductName] = useState('')
    const [newProductDescription, setNewProductDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [expandedToken, setExpandedToken] = useState<string | null>(null)
    const [attributes, setAttributes] = useState<Attribute[]>([])
    const [isRecipeMode, setIsRecipeMode] = useState(false)
    const [selectedRecipe, setSelectedRecipe] = useState<Token | null>(null)
    const [productQuantity, setProductQuantity] = useState(1)

    // Cargar tokens disponibles
    useEffect(() => {
        fetchAvailableTokens()
    }, [address])

    const fetchAvailableTokens = async () => {
        if (!address) return

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Obtener todos los eventos
            const filter = contract.filters.TokenTransferido()
            const createFilter = contract.filters.TokenCreado()
            const transferEvents = await contract.queryFilter(filter)
            const createEvents = await contract.queryFilter(createFilter)
            const allEvents = [...transferEvents, ...createEvents]

            // Usar un Map para agrupar por nombre de token
            const rawMaterialsMap = new Map<string, {
                nombre: string,
                descripcion: string,
                cantidadTotal: number,
                remesas: Map<string, Remesa> // Usar Map para evitar duplicados
            }>()

            const processedProductsMap = new Map<string, {
                nombre: string,
                descripcion: string,
                cantidadTotal: number,
                remesas: Map<string, Remesa>
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
                        
                        // Verificar si el token ya está procesado y si es una receta
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

                        // Si el token es una receta, lo saltamos
                        const esReceta = atributos.some(attr => 
                            attr.nombre === "EsReceta" && attr.valor === "true"
                        )
                        if (esReceta) continue;

                        // Si el token está procesado, va a productos procesados
                        const isProcesado = atributos.some(attr => 
                            attr.nombre === "Tipo_Producto" && attr.valor === "Procesado"
                        )

                        const nombre = token[1]
                        
                        const remesa: Remesa = {
                            id: Number(tokenId),
                            cantidad: Number(balance),
                            timestamp: Number(token[5]),
                            transactionHash: event.transactionHash,
                            creador: token[2]
                        }

                        // Seleccionar el Map correcto según si es procesado o no
                        const targetMap = isProcesado ? processedProductsMap : rawMaterialsMap

                        if (targetMap.has(nombre)) {
                            const group = targetMap.get(nombre)!
                            // Usar el ID como clave para evitar duplicados
                            group.remesas.set(tokenId.toString(), remesa)
                            group.cantidadTotal = Array.from(group.remesas.values())
                                .reduce((sum, r) => sum + r.cantidad, 0)
                        } else {
                            const remesas = new Map<string, Remesa>()
                            remesas.set(tokenId.toString(), remesa)
                            targetMap.set(nombre, {
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

            // Convertir los Maps a arrays y ordenar
            const rawMaterialsArray = Array.from(rawMaterialsMap.values()).map(group => ({
                ...group,
                numRemesas: group.remesas.size,
                remesas: Array.from(group.remesas.values())
                    .sort((a, b) => b.timestamp - a.timestamp)
            }))

            const processedProductsArray = Array.from(processedProductsMap.values()).map(group => ({
                ...group,
                numRemesas: group.remesas.size,
                remesas: Array.from(group.remesas.values())
                    .sort((a, b) => b.timestamp - a.timestamp)
            }))

            rawMaterialsArray.sort((a, b) => a.nombre.localeCompare(b.nombre))
            processedProductsArray.sort((a, b) => a.nombre.localeCompare(b.nombre))

            setRawMaterials(rawMaterialsArray)
            setProcessedProducts(processedProductsArray)
            
            if (rawMaterialsArray.length === 0 && processedProductsArray.length === 0) {
                setError('No hay materias primas ni productos procesados disponibles.')
            } else {
                setError('')
            }
        } catch (error) {
            console.error('Error fetching tokens:', error)
            setError('Error al cargar los tokens disponibles')
        }
    }

    // Función para cargar recetas (tokens con cantidad 0)
    const fetchRecipes = async () => {
        if (!address) return

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            const filter = contract.filters.TokenCreado()
            const events = await contract.queryFilter(filter)
            const recipesMap = new Map<string, Token>()

            for (const event of events) {
                const parsedLog = contract.interface.parseLog({
                    topics: event.topics,
                    data: event.data
                })
                if (!parsedLog) continue

                const tokenId = parsedLog.args[0]
                const token = await contract.tokens(tokenId)
                const balance = await contract.getBalance(tokenId, token[2]) // token[2] es el creador

                // Verificar si es una receta
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

                const esReceta = atributos.some(attr => 
                    attr.nombre === "EsReceta" && attr.valor === "true"
                )

                // Solo procesar si es una receta
                if (esReceta) {
                    const nombre = token[1]
                    const remesa: Remesa = {
                        id: Number(tokenId),
                        cantidad: 0,
                        timestamp: Number(token[5]),
                        transactionHash: event.transactionHash,
                        creador: token[2]
                    }

                    if (!recipesMap.has(nombre)) {
                        recipesMap.set(nombre, {
                            nombre: nombre,
                            descripcion: token[3],
                            cantidadTotal: 0,
                            numRemesas: 1,
                            remesas: [remesa],
                            isRecipe: true
                        })
                    }
                }
            }

            const recipesArray = Array.from(recipesMap.values())
            recipesArray.sort((a, b) => a.nombre.localeCompare(b.nombre))
            setRecipes(recipesArray)
        } catch (error) {
            console.error('Error fetching recipes:', error)
        }
    }

    // Cargar recetas al montar el componente
    useEffect(() => {
        if (address) {
            fetchRecipes()
        }
    }, [address])

    const addIngredient = (token: Token, remesa?: Remesa) => {
        if (isRecipeMode) {
            // En modo receta, solo agregamos el token sin remesa específica
            setSelectedIngredients(prev => [...prev, {
                token: {
                    ...token,
                    remesas: [] // No necesitamos remesas específicas en modo receta
                },
                quantity: 0
            }])
        } else {
            // En modo normal, necesitamos la remesa específica
            if (remesa) {
                setSelectedIngredients(prev => [...prev, {
                    token: {
                        ...token,
                        remesas: [remesa]
                    },
                    quantity: 0
                }])
            }
        }
    }

    const removeIngredient = (tokenName: string) => {
        setSelectedIngredients(prev => prev.filter(ing => ing.token.nombre !== tokenName))
    }

    const updateIngredientQuantity = (tokenName: string, quantity: number) => {
        setSelectedIngredients(prev =>
            prev.map(ing =>
                ing.token.nombre === tokenName
                    ? { ...ing, quantity }
                    : ing
            )
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (loading) return

        // Validaciones
        if (!newProductName.trim()) {
            setError('El nombre del producto es requerido')
            return
        }

        if (!isRecipeMode && selectedIngredients.length === 0) {
            setError('Debes seleccionar al menos un ingrediente')
            return
        }

        if (!isRecipeMode && selectedIngredients.some(ing => ing.quantity <= 0)) {
            setError('Las cantidades deben ser mayores a 0')
            return
        }

        try {
            setLoading(true)
            setError('')

            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            // Preparar atributos
            const nombresAtributos = []
            const valoresAtributos = []

            // Añadir atributos personalizados
            for (const attr of attributes) {
                if (attr.key.trim() && attr.value.trim()) {
                    nombresAtributos.push(attr.key)
                    valoresAtributos.push(attr.value)
                }
            }

            // Añadir ingredientes como atributos
            for (const ing of selectedIngredients) {
                nombresAtributos.push(`Ingrediente_${ing.token.nombre}`)
                valoresAtributos.push(ing.quantity.toString())
            }

            // Marcar como receta o producto procesado
            nombresAtributos.push("EsReceta")
            valoresAtributos.push(isRecipeMode ? "true" : "false")

            // Establecer el tipo de producto
            nombresAtributos.push("Tipo_Producto")
            valoresAtributos.push("Procesado")

            // Crear el token
            const cantidad = isRecipeMode ? 0 : productQuantity // Cantidad 0 para recetas
            const tx = await contract.crearToken(
                newProductName,
                cantidad,
                newProductDescription,
                nombresAtributos,
                valoresAtributos
            )

            await tx.wait()

            // Limpiar el formulario
            setNewProductName('')
            setNewProductDescription('')
            setSelectedIngredients([])
            setAttributes([{ key: '', value: '' }])
            setError('')
            
            // Recargar datos
            fetchAvailableTokens()
            fetchRecipes()

        } catch (error: any) {
            console.error('Error creating token:', error)
            setError(error.message || 'Error al crear el token')
        } finally {
            setLoading(false)
        }
    }

    const addAttribute = () => {
        setAttributes([...attributes, { key: '', value: '' }])
    }

    const removeAttribute = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index))
    }

    const handleAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
        const newAttributes = [...attributes]
        newAttributes[index][field] = value
        setAttributes(newAttributes)
    }

    // Función para usar una receta
    const useRecipe = async (recipe: Token) => {
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Obtener los atributos de la receta
            const recipeId = recipe.remesas[0].id
            const nombresAtributos = await contract.getNombresAtributos(recipeId)
            const atributos = await Promise.all(
                nombresAtributos.map(async (nombre: string) => {
                    const attr = await contract.getAtributo(recipeId, nombre)
                    return {
                        nombre: attr[0],
                        valor: attr[1],
                        timestamp: Number(attr[2])
                    }
                })
            )

            // Filtrar los atributos que son ingredientes
            const ingredientes = atributos
                .filter(attr => attr.nombre.startsWith('Ingrediente_'))
                .map(attr => {
                    const nombreIngrediente = attr.nombre.replace('Ingrediente_', '')
                    const cantidad = Number(attr.valor)
                    
                    // Buscar el token correspondiente en materias primas o productos procesados
                    const token = [...rawMaterials, ...processedProducts]
                        .find(t => t.nombre === nombreIngrediente)
                    
                    if (token) {
                        return {
                            token: token,
                            quantity: cantidad
                        }
                    }
                    return null
                })
                .filter((ing): ing is Ingredient => ing !== null)

            setSelectedRecipe(recipe)
            setNewProductName(recipe.nombre)
            setNewProductDescription(recipe.descripcion)
            setSelectedIngredients(ingredientes)
            setIsRecipeMode(false) // Cambiamos a modo producción
        } catch (error) {
            console.error('Error al cargar la receta:', error)
            setError('Error al cargar la receta')
        }
    }

    return (
        <div className="space-y-8">
            {/* Switch de modo receta */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={isRecipeMode}
                            onChange={(e) => {
                                setIsRecipeMode(e.target.checked)
                                if (e.target.checked) {
                                    setSelectedRecipe(null)
                                }
                            }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-olive-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
                    </label>
                    <span className="text-sm font-medium text-olive-900">
                        Modo Receta
                    </span>
                </div>
                {isRecipeMode && (
                    <span className="text-sm text-olive-600">
                        Las recetas se guardan con cantidad 0
                    </span>
                )}
            </div>

            {/* Sección de recetas disponibles */}
            {!isRecipeMode && recipes.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-olive-100 p-6">
                    <h2 className="text-xl font-semibold text-olive-800 mb-4">Recetas Disponibles</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recipes.map((recipe) => (
                            <div key={recipe.nombre} className="bg-olive-50/50 rounded-lg p-4 border border-olive-100">
                                <h3 className="font-medium text-olive-800">{recipe.nombre}</h3>
                                <p className="text-sm text-olive-600 mt-1">{recipe.descripcion}</p>
                                <button
                                    onClick={() => useRecipe(recipe)}
                                    className="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-olive-600 rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                                >
                                    Usar Receta
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Formulario principal */}
            <div className="bg-white rounded-lg shadow-sm border border-olive-100 p-6">
                <h3 className="text-lg font-semibold text-olive-800 mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-olive-100 text-olive-600 text-sm font-bold">1</span>
                    {isRecipeMode ? 'Información de la Receta' : 'Información del Producto'}
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-olive-700 mb-1">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            className="w-full px-3 py-2 border border-olive-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                            placeholder={isRecipeMode ? "Nombre de la receta" : "Nombre del producto"}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-olive-700 mb-1">
                            Descripción
                        </label>
                        <textarea
                            value={newProductDescription}
                            onChange={(e) => setNewProductDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-olive-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                            rows={3}
                            placeholder={isRecipeMode ? "Descripción de la receta" : "Descripción del producto"}
                        />
                    </div>

                    {!isRecipeMode && (
                        <div>
                            <label className="block text-sm font-medium text-olive-700 mb-1">
                                Cantidad a Producir
                            </label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-olive-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                                placeholder="Cantidad"
                                min="1"
                                value={productQuantity}
                                onChange={(e) => setProductQuantity(Number(e.target.value))}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Paso 2: Selección de Ingredientes */}
            <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-olive-100 text-olive-600 text-sm font-bold">2</span>
                    Selección de Ingredientes
                </h3>
                
                {rawMaterials.length === 0 && processedProducts.length === 0 ? (
                    <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p className="mt-4 text-gray-500">No hay materias primas ni productos procesados disponibles.</p>
                    </div>
                ) : (
                    <>
                        {/* Materias Primas */}
                        <div className="mb-8">
                            <h4 className="text-lg font-medium mb-4 text-olive-700 border-b pb-2">Materias Primas Disponibles</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {rawMaterials.map(token => (
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

                                            {/* Controles de ingrediente */}
                                            {selectedIngredients.some(ing => ing.token.nombre === token.nombre) ? (
                                                <div className="flex items-center space-x-3">
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.001"
                                                            value={selectedIngredients.find(ing => ing.token.nombre === token.nombre)?.quantity || 0}
                                                            onChange={(e) => updateIngredientQuantity(token.nombre, Number(e.target.value))}
                                                            className="w-28 px-3 py-2 border border-olive-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                                                            placeholder="Cantidad"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                                            kg
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => removeIngredient(token.nombre)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                        title="Eliminar ingrediente"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    {isRecipeMode ? (
                                                        // Botón simple para agregar a receta
                                                        <button
                                                            onClick={() => addIngredient(token)}
                                                            className="text-sm px-4 py-2 rounded-lg bg-olive-100 text-olive-700 hover:bg-olive-200 hover:shadow-sm transition-all duration-200 flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                                            </svg>
                                                            Agregar a Receta
                                                        </button>
                                                    ) : (
                                                        // Botón para ver remesas en modo normal
                                                        <button
                                                            onClick={() => setExpandedToken(expandedToken === token.nombre ? null : token.nombre)}
                                                            className="text-sm px-4 py-2 rounded-lg bg-olive-100 text-olive-700 hover:bg-olive-200 hover:shadow-sm transition-all duration-200 flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                {expandedToken === token.nombre ? (
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/>
                                                                ) : (
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                                                                )}
                                                            </svg>
                                                            {expandedToken === token.nombre ? 'Ocultar Remesas' : 'Ver Remesas'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Lista de remesas (solo visible en modo normal) */}
                                        {!isRecipeMode && expandedToken === token.nombre && (
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
                                                                    addIngredient(tokenWithSingleRemesa, remesa)
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
                        </div>

                        {/* Productos Procesados */}
                        <div className="mb-8">
                            <h4 className="text-lg font-medium mb-4 text-olive-700 border-b pb-2">Productos Procesados Disponibles</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {processedProducts.map(token => (
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
                                                                    addIngredient(tokenWithSingleRemesa, remesa)
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
                        </div>

                        {/* Lista de Ingredientes Seleccionados */}
                        {selectedIngredients.length > 0 && (
                            <div className="mt-6 space-y-4">
                                <h4 className="font-medium text-gray-700">Ingredientes Seleccionados:</h4>
                                {selectedIngredients.map((ing, index) => (
                                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h4 className="font-medium">{ing.token.nombre}</h4>
                                                {!isRecipeMode && ing.token.remesas[0] && (
                                                    <span className="px-2.5 py-1 bg-olive-50 text-olive-700 rounded-lg text-sm font-medium">
                                                        Remesa #{ing.token.remesas[0].id}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={ing.quantity}
                                                        onChange={(e) => updateIngredientQuantity(ing.token.nombre, Number(e.target.value))}
                                                        className="w-28 rounded-lg border-gray-300 pr-12 py-2 focus:ring-olive-500 focus:border-olive-500"
                                                        placeholder="0"
                                                        min="0"
                                                        step="0.001"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                                                        kg
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => removeIngredient(ing.token.nombre)}
                                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                    title="Eliminar ingrediente"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        {!isRecipeMode && ing.token.remesas[0] && (
                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                </svg>
                                                {new Date(ing.token.remesas[0].timestamp * 1000).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Botón de submit */}
            <div className="flex justify-end mt-6">
                <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={loading || (!isRecipeMode && selectedIngredients.length === 0) || !newProductName}
                    className={`
                        px-4 py-2 rounded-md text-white font-medium
                        ${loading || (!isRecipeMode && selectedIngredients.length === 0) || !newProductName
                            ? 'bg-olive-400 cursor-not-allowed'
                            : 'bg-olive-600 hover:bg-olive-700'
                        }
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500
                        flex items-center space-x-2
                    `}
                >
                    {loading && (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    <span>
                        {loading ? 'Procesando...' : (isRecipeMode ? 'Guardar Receta' : 'Procesar Producto')}
                    </span>
                </button>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md">
                    {error}
                </div>
            )}
        </div>
    )
}
