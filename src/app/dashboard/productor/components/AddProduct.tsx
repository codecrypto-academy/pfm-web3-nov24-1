'use client'
import { FC } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { useState } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'
import { PlusCircle, XCircle, Info } from 'lucide-react'
import { formatAttributeName } from '@/utils/attributeLabels'

interface CreateProductProps {
    role: 'productor' | 'fabrica' | 'distribuidor' | 'mayorista'
}

interface Atributo {
    nombre: string;
    valor: string;
    label?: string;  // Nombre amigable para mostrar en la UI
    valoresPosibles?: string[];  // Lista de valores posibles para el atributo
    tipo: 'seleccion' | 'texto';  // Tipo de input: selección múltiple o texto libre
    obligatorio: boolean;  // Indica si el atributo es obligatorio
}

const CreateProduct: FC<CreateProductProps> = ({ role }) => {
    const router = useRouter()
    const { address } = useWeb3()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [txStatus, setTxStatus] = useState('')
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        tokenRatio: 1000,
    })
    const [atributos, setAtributos] = useState<Atributo[]>([
        { 
            nombre: 'metodoRecoleccion', 
            valor: JSON.stringify([]), 
            label: 'Método de Recolección',
            valoresPosibles: [],
            tipo: 'seleccion',
            obligatorio: true
        }
    ])

    const handleAddValorPosible = (index: number, nuevoValor: string) => {
        if (!nuevoValor.trim()) return; // No añadir valores vacíos
        
        const nuevosAtributos = [...atributos];
        if (!nuevosAtributos[index].valoresPosibles) {
            nuevosAtributos[index].valoresPosibles = [];
        }
        
        // Evitar duplicados
        if (!nuevosAtributos[index].valoresPosibles?.includes(nuevoValor.trim())) {
            nuevosAtributos[index].valoresPosibles?.push(nuevoValor.trim());
            // Guardar como JSON array
            nuevosAtributos[index].valor = JSON.stringify(nuevosAtributos[index].valoresPosibles);
            setAtributos(nuevosAtributos);
        }
    }

    const handleRemoveValorPosible = (atributoIndex: number, valorIndex: number) => {
        const nuevosAtributos = [...atributos];
        if (nuevosAtributos[atributoIndex].valoresPosibles) {
            nuevosAtributos[atributoIndex].valoresPosibles?.splice(valorIndex, 1);
            // Actualizar el JSON array
            nuevosAtributos[atributoIndex].valor = JSON.stringify(nuevosAtributos[atributoIndex].valoresPosibles);
            setAtributos(nuevosAtributos);
        }
    }

    const handleAddAtributo = () => {
        const nuevoIndex = atributos.length;
        setAtributos([...atributos, {
            nombre: `atributo_${nuevoIndex}`, // Nombre temporal único
            valor: '',
            label: '',
            valoresPosibles: [],
            tipo: 'seleccion',
            obligatorio: false
        }])
    }

    const handleRemoveAtributo = (index: number) => {
        if (atributos[index].obligatorio) return; // No permitir eliminar atributos obligatorios
        const nuevosAtributos = [...atributos];
        nuevosAtributos.splice(index, 1);
        setAtributos(nuevosAtributos);
    }

    const handleAtributoChange = (index: number, campo: keyof Atributo, valor: any) => {
        const nuevosAtributos = [...atributos];
        nuevosAtributos[index] = {
            ...nuevosAtributos[index],
            [campo]: valor
        };

        // Si estamos actualizando el label, actualizar también el nombre
        if (campo === 'label') {
            // Convertir el label a un nombre válido: quitar espacios, acentos y caracteres especiales
            const nombreValido = valor
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                .replace(/[^a-zA-Z0-9]/g, "_") // Reemplazar caracteres especiales con _
                .toLowerCase();
            nuevosAtributos[index].nombre = nombreValido;
            // También actualizar el label formateado
            nuevosAtributos[index].label = formatAttributeName(nombreValido);
        }

        // Si cambiamos el tipo a texto, limpiamos los valores posibles
        if (campo === 'tipo' && valor === 'texto') {
            nuevosAtributos[index].valoresPosibles = [];
            nuevosAtributos[index].valor = '';
        }
        setAtributos(nuevosAtributos);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setTxStatus('')

        const obligatoriosCompletos = atributos
            .filter(attr => attr.obligatorio)
            .every(attr => attr.valoresPosibles && attr.valoresPosibles.length > 0)

        if (!obligatoriosCompletos) {
            setError('Por favor define al menos un valor posible para cada atributo obligatorio')
            return
        }

        try {
            setIsLoading(true)
            setTxStatus('Preparando la transacción...')

            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            const totalTokens = 0

            const todosLosAtributos = [
                ...atributos,
                {
                    nombre: 'Tipo_Producto',
                    valor: 'Prima'  // Por defecto es "Prima" al crear
                },
                {
                    nombre: 'EsRemesa',
                    valor: 'false'
                }
            ]

            const nombresAtributos = todosLosAtributos.map(attr => attr.nombre)
            const valoresAtributos = todosLosAtributos.map(attr => attr.valor)

            setTxStatus('Enviando transacción...')
            const tx = await contract.crearToken(
                formData.nombre,
                totalTokens,
                formData.descripcion,
                nombresAtributos,
                valoresAtributos
            )

            setTxStatus('Esperando confirmación...')
            const receipt = await tx.wait()
            
            if (receipt.status === 1) {
                setTxStatus('¡Producto creado con éxito!')
                setTimeout(() => {
                    router.push(`/dashboard/${role}`)
                }, 2000)
            } else {
                throw new Error('La transacción falló')
            }
        } catch (error: any) {
            console.error('Error:', error)
            setError(error.message || 'Error al crear el producto')
            setTxStatus('')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bubbles-background">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
                <div className="space-y-2">
                    <h1 className="custom-subtitle text-center">Crear Nuevo Producto</h1>
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                        <span className="text-sm">Información para el certificado</span>
                        <div className="group relative">
                            <Info className="w-4 h-4 text-blue-500 cursor-help" />
                            <div className="absolute left-1/2 -translate-x-1/2 w-80 p-3 bg-black text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 mt-1">
                                <span className="font-bold">IMPORTANTE:</span> Para el certificado de calidad, asegúrate que:
                                <ul className="list-disc pl-4 mt-1 space-y-1">
                                    <li>El nombre del producto coincida con la variedad que se pide</li>
                                    <li>Los métodos de recolección deben ser uno de los siguientes:
                                        <ul className="list-disc pl-4 mt-1">
                                            <li>Manual (Vareo tradicional)</li>
                                            <li>Mecánico (Vibrador)</li>
                                            <li>Mixto (Combinación de ambos)</li>
                                        </ul>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-primary">
                            Nombre del Producto
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-md bg-input text-primary"
                            placeholder="Ej: Aceituna negra"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-primary">
                            Descripción
                        </label>
                        <textarea
                            className="w-full p-2 border rounded-md bg-input text-primary"
                            placeholder="Descripción detallada del producto"
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        />
                    </div>

                    {/* Sección de Atributos Obligatorios */}
                    <div className="space-y-4 border-b pb-6">
                        <h3 className="text-lg font-semibold text-primary">Atributos Obligatorios</h3>
                        {atributos
                            .filter(attr => attr.obligatorio)
                            .map((atributo, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-primary mb-2">
                                            {formatAttributeName(atributo.nombre)}
                                        </label>
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500">
                                                Define los valores posibles para este atributo:
                                            </p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Manual"
                                                    className="flex-1 p-2 border rounded-md bg-input text-primary"
                                                    id={`valor-${index}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const input = document.getElementById(`valor-${index}`) as HTMLInputElement;
                                                        if (input.value.trim()) {
                                                            handleAddValorPosible(index, input.value.trim());
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                                >
                                                    Añadir
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {atributo.valoresPosibles?.map((valor, valorIndex) => (
                                                    <div 
                                                        key={valorIndex} 
                                                        className="flex items-center gap-1 bg-blue-100 text-blue-900 px-2 py-1 rounded-md"
                                                    >
                                                        <span>{valor}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveValorPosible(index, valorIndex)}
                                                            className="text-red-500 hover:text-red-700 ml-2"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Sección de Atributos Opcionales */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-primary">Atributos Opcionales</h3>
                            <button
                                type="button"
                                onClick={handleAddAtributo}
                                className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                            >
                                <PlusCircle className="w-5 h-5" />
                                <span>Añadir Atributo</span>
                            </button>
                        </div>
                        
                        {atributos
                            .filter(attr => !attr.obligatorio)
                            .map((atributo, index) => (
                                <div key={index} className="space-y-4 p-4 border rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                placeholder="Nombre del atributo"
                                                className="w-full p-2 border rounded-md bg-input text-primary"
                                                value={atributo.label || ''}
                                                onChange={(e) => handleAtributoChange(
                                                    atributos.findIndex(a => a === atributo),
                                                    'label',
                                                    e.target.value
                                                )}
                                            />
                                            <select
                                                className="w-full p-2 border rounded-md bg-input text-primary"
                                                value={atributo.tipo}
                                                onChange={(e) => handleAtributoChange(
                                                    atributos.findIndex(a => a === atributo),
                                                    'tipo',
                                                    e.target.value
                                                )}
                                            >
                                                <option value="seleccion">Selección múltiple</option>
                                                <option value="texto">Texto libre</option>
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAtributo(atributos.findIndex(a => a === atributo))}
                                            className="text-red-500 hover:text-red-700 ml-2"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {atributo.tipo === 'seleccion' && (
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500">
                                                Define los valores posibles para este atributo:
                                            </p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Añadir valor posible"
                                                    className="flex-1 p-2 border rounded-md bg-input text-primary"
                                                    id={`valor-${index}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const input = document.getElementById(`valor-${index}`) as HTMLInputElement;
                                                        if (input.value.trim()) {
                                                            handleAddValorPosible(atributos.findIndex(a => a === atributo), input.value.trim());
                                                            input.value = '';
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                                >
                                                    Añadir
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {atributo.valoresPosibles?.map((valor, valorIndex) => (
                                                    <div 
                                                        key={valorIndex} 
                                                        className="flex items-center gap-1 bg-blue-100 text-blue-900 px-2 py-1 rounded-md"
                                                    >
                                                        <span>{valor}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveValorPosible(
                                                                atributos.findIndex(a => a === atributo),
                                                                valorIndex
                                                            )}
                                                            className="text-red-500 hover:text-red-700 ml-2"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="company-access-btn w-full"
                    >
                        {isLoading ? 'Procesando...' : 'Crear Producto'}
                    </button>

                    {error && (
                        <p className="text-red-500 text-sm mt-2">{error}</p>
                    )}

                    {txStatus && (
                        <p className="text-blue-500 text-sm mt-2">{txStatus}</p>
                    )}
                </form>
            </div>
        </div>
    )
}

export default CreateProduct
