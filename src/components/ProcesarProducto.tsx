'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ethers } from 'ethers'
import { useWeb3 } from '@/context/Web3Context'
import { CONTRACTS } from '@/constants/contracts'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

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
    const [unitsToCreate, setUnitsToCreate] = useState(1)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedSection, setExpandedSection] = useState<'rawMaterials' | 'processedProducts' | null>('rawMaterials')
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
    const searchRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Filtrar materias primas y productos procesados según el término de búsqueda
    const filteredRawMaterials = rawMaterials.filter(material =>
        material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredProcessedProducts = processedProducts.filter(product =>
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalResults = filteredRawMaterials.length + filteredProcessedProducts.length

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
                    let tokenId: number | undefined;

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

        // Validar que no se excedan las cantidades disponibles
        const excedeLimite = !isRecipeMode && selectedIngredients.some(ing => {
            const totalKg = ing.quantity * unitsToCreate;
            const disponibleKg = ing.token.cantidadTotal / 1000;
            return totalKg > disponibleKg;
        });

        if (excedeLimite) {
            setError('Uno o más ingredientes exceden la cantidad disponible')
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

            // Añadir nombre y descripción como atributos
            nombresAtributos.push("Nombre")
            valoresAtributos.push(newProductName)
            nombresAtributos.push("Descripcion")
            valoresAtributos.push(newProductDescription)
            
            // Marcar si es una receta
            nombresAtributos.push("EsReceta")
            valoresAtributos.push(isRecipeMode ? "true" : "false")

            // Añadir tipo de producto
            nombresAtributos.push("Tipo_Producto")
            valoresAtributos.push(isRecipeMode ? "Receta" : "Procesado")

            // Añadir ingredientes como atributos
            selectedIngredients.forEach((ing, index) => {
                nombresAtributos.push(`Ingrediente_${ing.token.nombre}`)
                valoresAtributos.push(ing.quantity.toString())
            })

            let tx;
            if (isRecipeMode) {
                // En modo receta, usamos crearToken
                tx = await contract.crearToken(
                    newProductName,
                    0, // cantidad 0 para recetas
                    newProductDescription,
                    nombresAtributos,
                    valoresAtributos
                );
            } else {
                // En modo producción, usamos procesarToken
                const tokenIds = selectedIngredients.map(ing => ing.token.remesas[0].id);
                const cantidades = selectedIngredients.map(ing => ing.quantity * 1000 * unitsToCreate);
                
                tx = await contract.procesarToken(
                    tokenIds,
                    cantidades,
                    newProductName,           // Nombre del producto
                    newProductDescription,    // Descripción del producto
                    nombresAtributos,
                    valoresAtributos
                );
            }

            const receipt = await tx.wait()

            // Toast de éxito con todos los detalles
            toast.success(
                <div>
                    <h3 className="font-bold mb-2">
                        ¡{isRecipeMode ? "Receta Creada" : "Producto Procesado"}!
                    </h3>
                    <p><strong>Nombre:</strong> {newProductName}</p>
                    {selectedIngredients.length > 0 && (
                        <div>
                            <p className="font-bold mt-2">Ingredientes:</p>
                            {selectedIngredients.map((ing, index) => (
                                <p key={index}>
                                    - {ing.token.nombre}: {ing.quantity * unitsToCreate} kg 
                                    {!isRecipeMode && `(${ing.quantity * unitsToCreate * 1000} tokens)`}
                                    (ID: {ing.token.remesas[0]?.id})
                                </p>
                            ))}
                        </div>
                    )}
                    <p className="mt-2"><strong>Hash de transacción:</strong></p>
                    <p className="text-xs break-all">{receipt.hash}</p>
                </div>,
                {
                    position: "top-right",
                    autoClose: 8000,
                }
            );

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
            toast.error(
                <div>
                    <h3 className="font-bold mb-2">Error al crear el producto</h3>
                    <p><strong>Nombre:</strong> {newProductName}</p>
                    <p><strong>Error:</strong> {(error as Error).message}</p>
                </div>,
                {
                    position: "top-right",
                    autoClose: 5000,
                }
            );
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

    // Función para resaltar el texto buscado
    const highlightText = (text: string, highlight: string) => {
        if (!highlight.trim()) return text
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'))
        return parts.map((part, i) => 
            part.toLowerCase() === highlight.toLowerCase() ? 
                <span key={i} className="bg-yellow-200">{part}</span> : part
        )
    }

    // Función debounce para la búsqueda
    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearchTerm(value)
        }, 300),
        []
    )

    // Manejar navegación con teclado
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const allResults = [...filteredRawMaterials, ...filteredProcessedProducts]
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedResultIndex(prev => 
                    prev < allResults.length - 1 ? prev + 1 : prev
                )
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedResultIndex(prev => prev > 0 ? prev - 1 : prev)
                break
            case 'Enter':
                e.preventDefault()
                if (selectedResultIndex >= 0 && selectedResultIndex < allResults.length) {
                    const selectedItem = allResults[selectedResultIndex]
                    const isRawMaterial = filteredRawMaterials.includes(selectedItem)
                    setExpandedSection(isRawMaterial ? 'rawMaterials' : 'processedProducts')
                    setExpandedToken(selectedItem.nombre)
                    setShowSearchResults(false)
                    setSearchTerm('')
                    setSelectedResultIndex(-1)
                }
                break
            case 'Escape':
                setShowSearchResults(false)
                setSelectedResultIndex(-1)
                break
        }
    }

    // Cerrar el desplegable cuando se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false)
                setSelectedResultIndex(-1)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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
                                Cantidad de Unidades a Producir
                            </label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-olive-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                                placeholder="Cantidad"
                                min="1"
                                value={unitsToCreate}
                                onChange={(e) => setUnitsToCreate(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Paso 2: Selección de Ingredientes */}
            <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-olive-100 text-olive-600 text-sm font-bold">2</span>
                    Selección de Ingredientes (Por unidad a producir)
                </h3>
                
                {/* Barra de búsqueda con resultados desplegables */}
                <div className="mb-6 relative">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full px-4 py-2 pl-10 pr-4 border border-olive-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
                            placeholder="Buscar por nombre o descripción..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setShowSearchResults(true)
                            }}
                            onFocus={() => setShowSearchResults(true)}
                            onKeyDown={handleKeyDown}
                        />
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        {searchTerm && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                {totalResults} resultado{totalResults !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Resultados de búsqueda desplegables */}
                    {showSearchResults && searchTerm && (
                        <div ref={searchRef} className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                            {totalResults === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    No se encontraron resultados
                                </div>
                            ) : (
                                <>
                                    {filteredRawMaterials.length > 0 && (
                                        <div className="p-2">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
                                                Materias Primas ({filteredRawMaterials.length})
                                            </h4>
                                            {filteredRawMaterials.map((material, index) => (
                                                <button
                                                    key={material.nombre}
                                                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors duration-150 flex items-center justify-between ${
                                                        selectedResultIndex === index
                                                            ? 'bg-gray-100 text-gray-800'
                                                            : 'text-gray-600'
                                                    }`}
                                                    onClick={() => {
                                                        setExpandedSection('rawMaterials')
                                                        setExpandedToken(material.nombre)
                                                        setShowSearchResults(false)
                                                        setSearchTerm('')
                                                        setSelectedResultIndex(-1)
                                                    }}
                                                >
                                                    <div>
                                                        <div className="font-medium text-gray-800">
                                                            {highlightText(material.nombre, searchTerm)}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {highlightText(material.descripcion, searchTerm)}
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-olive-600">
                                                        {material.cantidadTotal / 1000} kg
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {filteredProcessedProducts.length > 0 && (
                                        <div className="p-2 border-t">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
                                                Productos Procesados ({filteredProcessedProducts.length})
                                            </h4>
                                            {filteredProcessedProducts.map((product, index) => (
                                                <button
                                                    key={product.nombre}
                                                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg transition-colors duration-150 flex items-center justify-between ${
                                                        selectedResultIndex === index + filteredRawMaterials.length
                                                            ? 'bg-gray-100 text-gray-800'
                                                            : 'text-gray-600'
                                                    }`}
                                                    onClick={() => {
                                                        setExpandedSection('processedProducts')
                                                        setExpandedToken(product.nombre)
                                                        setShowSearchResults(false)
                                                        setSearchTerm('')
                                                        setSelectedResultIndex(-1)
                                                    }}
                                                >
                                                    <div>
                                                        <div className="font-medium text-gray-800">
                                                            {highlightText(product.nombre, searchTerm)}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {highlightText(product.descripcion, searchTerm)}
                                                        </div>
                                                    </div>
                                                    <span className="text-sm text-olive-600">
                                                        {product.cantidadTotal / 1000} kg
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Materias Primas */}
                <div className="mb-8">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'rawMaterials' ? null : 'rawMaterials')}
                        className="w-full flex justify-between items-center text-lg font-medium mb-4 text-olive-700 border-b pb-2 hover:text-olive-800"
                    >
                        <span>Materias Primas Disponibles</span>
                        <svg
                            className={`h-6 w-6 transform transition-transform ${expandedSection === 'rawMaterials' ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expandedSection === 'rawMaterials' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredRawMaterials.map(token => (
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
                                                {!isRecipeMode && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
                                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                                                    </svg>
                                                    {token.numRemesas} remesas
                                                </span>
                                                )}
                                            </div>
                                        </div>
                                        {isRecipeMode ? (
                                            <button
                                                onClick={() => {
                                                    addIngredient(token)
                                                }}
                                                className={`text-sm px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                                                    selectedIngredients.some(ing => ing.token.nombre === token.nombre)
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-olive-100 text-olive-700 hover:bg-olive-200 hover:shadow'
                                                }`}
                                                disabled={selectedIngredients.some(ing => ing.token.nombre === token.nombre)}
                                            >
                                                {selectedIngredients.some(ing => ing.token.nombre === token.nombre) ? (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                                                        </svg>
                                                        Agregado
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                                        </svg>
                                                        Añadir
                                                    </>
                                                )}
                                            </button>
                                        ) : (
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
                    )}
                </div>

                {/* Productos Procesados */}
                <div className="mb-8">
                    <button
                        onClick={() => setExpandedSection(expandedSection === 'processedProducts' ? null : 'processedProducts')}
                        className="w-full flex justify-between items-center text-lg font-medium mb-4 text-olive-700 border-b pb-2 hover:text-olive-800"
                    >
                        <span>Productos Procesados Disponibles</span>
                        <svg
                            className={`h-6 w-6 transform transition-transform ${expandedSection === 'processedProducts' ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {expandedSection === 'processedProducts' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredProcessedProducts.map(token => (
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
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
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
                    )}
                </div>

                {/* Lista de Ingredientes Seleccionados */}
                {selectedIngredients.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Ingredientes Seleccionados:</h4>
                        <div className="space-y-3">
                            {selectedIngredients.map((ingredient, index) => {
                                const totalKg = ingredient.quantity * unitsToCreate;
                                const totalTokens = totalKg * 1000;
                                const disponibleKg = ingredient.token.cantidadTotal / 1000;
                                const excedeLimite = totalKg > disponibleKg;

                                return (
                                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${excedeLimite ? 'bg-red-50' : 'bg-gray-50'}`}>
                                        <div className="flex-grow">
                                            <div className="font-medium text-gray-800">{ingredient.token.nombre}</div>                                            <div className="text-sm text-gray-500">
                                                Disponible: {disponibleKg} KG ({disponibleKg.toFixed(3)} Tokens)
                                            </div>
                                            
                                            <div className="text-sm mt-1">
                                                <span className={`${excedeLimite ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                                    Total para {unitsToCreate} unidad(es): {totalKg.toFixed(3)} kg ({totalTokens.toFixed(0)} tokens)
                                                </span>
                                            </div>
                                            {excedeLimite && (
                                                <div className="text-red-600 text-sm mt-1">
                                                    ⚠️ Excede la cantidad disponible
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-32">
                                                <input
                                                    type="number"
                                                    value={ingredient.quantity || ''}
                                                    onChange={(e) => updateIngredientQuantity(ingredient.token.nombre, Number(e.target.value))}
                                                    className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 ${
                                                        excedeLimite 
                                                            ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                                                            : 'border-gray-300 focus:ring-olive-500'
                                                    }`}
                                                    placeholder="KG por unidad"
                                                    min="0"
                                                    max={disponibleKg / unitsToCreate}
                                                    step="0.001"
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeIngredient(ingredient.token.nombre)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Resumen total */}
                            <div className="mt-4 p-4 bg-olive-50 rounded-lg">
                                <h5 className="font-medium text-olive-800 mb-2">Resumen Total</h5>
                                <div className="space-y-2">
                                    <p className="text-sm text-olive-700">
                                        <span className="font-medium">Unidades a producir:</span> {unitsToCreate}
                                    </p>
                                    <p className="text-sm text-olive-700">
                                        <span className="font-medium">Total KG:</span> {selectedIngredients.reduce((acc, ing) => acc + (ing.quantity * unitsToCreate), 0).toFixed(3)} kg
                                    </p>
                                    <p className="text-sm text-olive-700">
                                        <span className="font-medium">Total Tokens:</span> {selectedIngredients.reduce((acc, ing) => acc + (ing.quantity * unitsToCreate * 1000), 0).toFixed(0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
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
