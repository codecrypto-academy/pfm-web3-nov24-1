'use client'
import { FC } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { useState } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'
import { PlusCircle, XCircle, Info } from 'lucide-react'

interface CreateProductProps {
    role: 'productor' | 'fabrica' | 'distribuidor' | 'mayorista'
}

interface Atributo {
    nombre: string;
    valor: string;
    label?: string;  // Nombre amigable para mostrar en la UI
    valoresPosibles?: string[];  // Lista de valores posibles para el atributo
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
            valor: '', 
            label: 'Método de Recolección',
            valoresPosibles: ['Manual (Vareo tradicional)', 'Mecánico (Vibrador)', 'Mixto (Combinación de ambos)']
        },
        {
            nombre: 'Procesado',
            valor: 'false',
            label: 'Procesado',
            valoresPosibles: ['true', 'false']
        },
        {
            nombre: 'MateriaPrima',
            valor: 'true',
            label: 'Es Materia Prima',
            valoresPosibles: ['true', 'false']
        }
    ])

    const handleAddAtributo = () => {
        setAtributos([...atributos, { nombre: '', valor: '' }])
    }

    const handleRemoveAtributo = (index: number) => {
        setAtributos(atributos.filter((_, i) => i !== index))
    }

    const handleAtributoChange = (index: number, field: 'nombre' | 'valor', value: string) => {
        const nuevosAtributos = [...atributos]
        nuevosAtributos[index][field] = value
        setAtributos(nuevosAtributos)
    }

    const handleAddValorPosible = (index: number, nuevoValor: string) => {
        const nuevosAtributos = [...atributos];
        if (!nuevosAtributos[index].valoresPosibles) {
            nuevosAtributos[index].valoresPosibles = [];
        }
        nuevosAtributos[index].valoresPosibles?.push(nuevoValor);
        // El valor será todos los valores posibles unidos
        nuevosAtributos[index].valor = nuevosAtributos[index].valoresPosibles?.join(', ') || '';
        setAtributos(nuevosAtributos);
    }

    const handleRemoveValorPosible = (atributoIndex: number, valorIndex: number) => {
        const nuevosAtributos = [...atributos];
        nuevosAtributos[atributoIndex].valoresPosibles?.splice(valorIndex, 1);
        // Actualizar el valor después de eliminar
        nuevosAtributos[atributoIndex].valor = nuevosAtributos[atributoIndex].valoresPosibles?.join(', ') || '';
        setAtributos(nuevosAtributos);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setTxStatus('')

        if (!formData.nombre || !formData.descripcion) {
            setError('Por favor complete todos los campos')
            return
        }

        // Validar que los atributos no estén vacíos
        const atributosInvalidos = atributos.some(attr => !attr.nombre || !attr.valor)
        if (atributosInvalidos) {
            setError('Por favor complete todos los campos de los atributos')
            return
        }

        setIsLoading(true)

        try {
            setTxStatus('Conectando con la wallet...')
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            // Para productos, siempre usamos cantidad 0
            const totalTokens = 0

            // Preparar arrays de atributos
            const nombresAtributos = atributos.map(attr => {
                if (attr.nombre === 'metodoRecoleccion') {
                    return 'metodo_de_recoleccion'
                }
                return attr.nombre
            })
            const valoresAtributos = atributos.map(attr => attr.valor)

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

                    {/* Campo de cantidad eliminado */}

                    {/* Sección de Atributos Obligatorios */}
                    <div className="space-y-4 border-b pb-6">
                        <h3 className="text-lg font-semibold text-primary">Atributos Obligatorios</h3>
                        {atributos
                            .filter(attr => attr.label)
                            .map((atributo, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-primary mb-2">
                                            {atributo.label}
                                        </label>
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500">
                                                Añade los valores posibles para este atributo:
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

                    {/* Sección de Atributos Personalizados */}
                    <div className="space-y-4 pt-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-primary">Atributos Personalizados</h3>
                            <button
                                type="button"
                                onClick={handleAddAtributo}
                                className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Añadir Atributo
                            </button>
                        </div>

                        {atributos
                            .filter(attr => !attr.label)
                            .map((atributo, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Nombre del atributo"
                                            className="w-full p-2 border rounded-md bg-input text-primary mb-2"
                                            value={atributo.nombre}
                                            onChange={(e) => handleAtributoChange(index + atributos.filter(a => a.label).length, 'nombre', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Valor"
                                            className="w-full p-2 border rounded-md bg-input text-primary"
                                            value={atributo.valor}
                                            onChange={(e) => handleAtributoChange(index + atributos.filter(a => a.label).length, 'valor', e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAtributo(index + atributos.filter(a => a.label).length)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
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
