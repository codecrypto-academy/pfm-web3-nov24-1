'use client'

import { FC } from 'react'
import { createPortal } from 'react-dom'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useState, useEffect } from 'react'
import { setupMetaMaskEventHandling, getMetaMaskProvider } from '@/utils/metamask'
import 'react-toastify/dist/ReactToastify.css'

interface TokenAttribute {
    nombre: string;
    valor: string;
    timestamp: number;
}

interface TokenRemesa {
    id: number;
    cantidad: number;
    timestamp: number;
    atributos: { [key: string]: any };
    creador: string;
}

interface Ingrediente {
    nombre: string;
    cantidad: number;
    remesas: TokenRemesa[];
    remesaSeleccionada?: number;
}

interface ProcessTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: {
        nombre: string;
        remesas: TokenRemesa[];
        esReceta?: boolean;
    };
    onSubmit: (token: any, processedQuantity: string) => Promise<void>;
}

interface DetallesProcesamiento {
    tokenNombre: string;
    remesaId: number;
    cantidad: string;
    ingredientes?: Array<{
        nombre: string;
        cantidad: number;
        remesaSeleccionada?: number;
    }>;
}

const ProcessTokenModal: FC<ProcessTokenModalProps> = ({
    isOpen,
    onClose,
    token,
    onSubmit
}) => {
    const [processedQuantity, setProcessedQuantity] = useState('')
    const [selectedRemesaId, setSelectedRemesaId] = useState<number | null>(null)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
    const [cargandoIngredientes, setCargandoIngredientes] = useState(false)

    useEffect(() => {
        if (token.esReceta) {
            cargarIngredientes()
        }
    }, [token])

    useEffect(() => {
        const cleanup = setupMetaMaskEventHandling();
        return cleanup;
    }, []);

    const cargarIngredientes = async () => {
        try {
            setCargandoIngredientes(true)
            const provider = await getMetaMaskProvider()
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Obtener los atributos de la receta
            const recipeId = token.remesas[0].id
            
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

            // Filtrar ingredientes
            const ingredientesTemp: Ingrediente[] = []
            for (const attr of atributos) {
                if (attr.nombre.startsWith('Ingrediente_')) {
                    const nombreIngrediente = attr.nombre.replace('Ingrediente_', '')
                    let cantidadNecesaria = Number(attr.valor)
                    
                    // Si la cantidad es menor a 1000, asumimos que es una receta antigua (en KG)
                    // y necesitamos convertirla a tokens
                    if (cantidadNecesaria < 1000) {
                        cantidadNecesaria = cantidadNecesaria * 1000
                    }
                    // Convertir de KG a tokens (1 KG = 1000 tokens)

                    // Obtener el ID del token del ingrediente
                    const tokenId = await contract.getTokenIdByName(nombreIngrediente)
                    
                    // Obtener el token del ingrediente
                    const token = await contract.getToken(tokenId)
                    
                    type RemesaType = {
                        id: number;
                        cantidad: number;
                        timestamp: number;
                        atributos: any;
                        creador: string;
                    };

                    // Mapear las remesas del token
                    const remesasDisponibles = token.remesas
                        .map((remesa: { id: number, cantidad: string | number, timestamp: string | number, atributos?: any, creador: string }): RemesaType => {
                            return {
                                id: remesa.id,
                                cantidad: Number(remesa.cantidad),
                                timestamp: Number(remesa.timestamp),
                                atributos: remesa.atributos || {},
                                creador: remesa.creador
                            }
                        })
                        .filter((remesa: RemesaType) => {
                            const tieneStock = remesa.cantidad >= cantidadNecesaria
                            return tieneStock
                        })
                    
                    ingredientesTemp.push({
                        nombre: nombreIngrediente,
                        cantidad: cantidadNecesaria,
                        remesas: remesasDisponibles,
                        remesaSeleccionada: undefined
                    })
                }
            }

            setIngredientes(ingredientesTemp)
        } catch (error) {
            console.error('Error al cargar ingredientes:', error)
            setError('Error al cargar los ingredientes de la receta')
        } finally {
            setCargandoIngredientes(false)
        }
    }

    const handleIngredienteRemesaChange = (nombreIngrediente: string, remesaId: number) => {
        setIngredientes(prev => {
            const nuevosIngredientes = prev.map(ing => {
                if (ing.nombre === nombreIngrediente) {
                    return { ...ing, remesaSeleccionada: remesaId }
                }
                return ing
            })
            return nuevosIngredientes
        })
    }

    // Función helper para convertir tokens a KG
    const tokensToKg = (tokens: number) => {
        // Si los tokens son menores a 1000, significa que es una cantidad en kg antigua
        if (tokens < 1000) {
            return tokens;
        }
        // Convertir tokens a kg y mantener 3 decimales de precisión
        return Number((tokens / 1000).toFixed(3));
    }

    // Función helper para convertir KG a tokens
    const kgToTokens = (kg: number) => {
        // Asegurar que la cantidad en kg tenga máximo 3 decimales
        const roundedKg = Number(kg.toFixed(3));
        // Convertir a tokens (1 kg = 1000 tokens)
        return Math.floor(roundedKg * 1000);
    }

    if (!isOpen || !token) return null

    // Obtener la remesa seleccionada
    const selectedRemesa = token.remesas.find((r: TokenRemesa) => r.id === selectedRemesaId)
    const maxKg = selectedRemesa ? selectedRemesa.cantidad / 1000 : 0

    const handleSubmit = async () => {
        console.log('Iniciando procesamiento del token');
        try {
            console.log('Token:', token.nombre);
            console.log('Remesa ID:', selectedRemesaId);
            console.log('Cantidad:', processedQuantity);
            
            setError('')
            setIsLoading(true)

            // Validar que se haya seleccionado una remesa
            if (!selectedRemesaId) {
                setError('Debe seleccionar una remesa')
                return
            }

            // Preparar los detalles para mostrar
            const detalles: DetallesProcesamiento = {
                tokenNombre: token.nombre,
                remesaId: selectedRemesaId,
                cantidad: processedQuantity,
            }

            if (token.esReceta) {
                detalles.ingredientes = ingredientes.map(ing => ({
                    nombre: ing.nombre,
                    cantidad: ing.cantidad,
                    remesaSeleccionada: ing.remesaSeleccionada
                }))
            }

            // Crear el mensaje de detalles
            let mensaje = `Procesando Token:\n\n` +
                `Token: ${detalles.tokenNombre}\n` +
                `Remesa ID: ${detalles.remesaId}\n` +
                `Cantidad: ${detalles.cantidad} kg\n`;

            if (token.esReceta && detalles.ingredientes) {
                mensaje += '\nIngredientes:\n';
                detalles.ingredientes.forEach(ing => {
                    mensaje += `- ${ing.nombre}: ${ing.cantidad/1000}kg (Remesa: ${ing.remesaSeleccionada})\n`;
                });
            }

            // Mostrar alert con los detalles
            alert(mensaje);

            // Procesar el token
            const provider = await getMetaMaskProvider()
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            const tokenQuantity = kgToTokens(Number(processedQuantity))
            console.log('Cantidad en tokens:', tokenQuantity);

            let tx;
            if (token.esReceta) {
                console.log('Procesando receta...');
                const ingredientesIds = ingredientes.map(ing => ing.remesaSeleccionada)
                tx = await contract.procesarReceta(
                    selectedRemesaId,
                    tokenQuantity,
                    ingredientesIds,
                    { gasLimit: 500000 }
                )
            } else {
                console.log('Procesando token normal...');
                tx = await contract.procesarToken(
                    selectedRemesaId,
                    tokenQuantity,
                    { gasLimit: 500000 }
                )
            }

            const receipt = await tx.wait()
            console.log('Transacción completada:', receipt);

            // Mostrar mensaje de éxito
            alert('¡Token procesado con éxito!');

            await onSubmit(token, processedQuantity)
            onClose()
        } catch (error) {
            console.error('Error al procesar el token:', error);
            alert('Error al procesar el token: ' + (error as Error).message);
            setError('Error al procesar el token')
        } finally {
            setIsLoading(false)
        }
    }

    return createPortal(
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Procesar {token.nombre}
                                </h3>
                                <span className="bg-olive-100 text-olive-800 px-3 py-1 rounded-full text-sm">
                                    {token.esReceta ? 'Receta' : 'Producto'}
                                </span>
                            </div>

                            <div className="space-y-6">
                                {/* Sección de selección de remesa principal */}
                                <div className={`p-4 rounded-lg ${token.esReceta ? 'bg-olive-50 border border-olive-200' : 'bg-gray-50'}`}>
                                    <h4 className="font-medium text-gray-800 mb-3">
                                        {token.esReceta 
                                            ? '1. Seleccionar Remesa de la Receta'
                                            : 'Seleccionar Remesa del Producto'
                                        }
                                    </h4>
                                    <select
                                        value={selectedRemesaId || ''}
                                        onChange={(e) => setSelectedRemesaId(Number(e.target.value))}
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm bg-white"
                                    >
                                        <option value="">Seleccione una remesa</option>
                                        {token.remesas.map((remesa: TokenRemesa, index: number) => (
                                            <option key={remesa.id} value={remesa.id}>
                                                Remesa #{index + 1} - {remesa.cantidad / 1000} kg - {new Date(remesa.timestamp * 1000).toLocaleDateString()}
                                            </option>
                                        ))}
                                    </select>
                                    {!selectedRemesaId && (
                                        <p className="mt-2 text-sm text-olive-600">
                                            Por favor, seleccione una remesa {token.esReceta ? 'de la receta' : 'del producto'} para continuar
                                        </p>
                                    )}
                                </div>

                                {/* Sección de ingredientes para recetas */}
                                {token.esReceta && (
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-gray-800">2. Seleccionar Remesas de Ingredientes:</h4>
                                        {cargandoIngredientes ? (
                                            <div className="flex items-center justify-center py-6">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
                                                <span className="ml-3 text-olive-600">Cargando ingredientes...</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {ingredientes.map((ingrediente, index) => (
                                                    <div key={index} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h5 className="font-medium text-gray-800">{ingrediente.nombre}</h5>
                                                            <span className="text-sm bg-olive-100 text-olive-800 px-3 py-1 rounded-full">
                                                                Necesario: {tokensToKg(ingrediente.cantidad)} kg
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Seleccionar Remesa del Ingrediente
                                                            </label>
                                                            <select
                                                                value={ingrediente.remesaSeleccionada || ''}
                                                                onChange={(e) => handleIngredienteRemesaChange(ingrediente.nombre, Number(e.target.value))}
                                                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm bg-white"
                                                            >
                                                                <option value="">Seleccione una remesa</option>
                                                                {ingrediente.remesas.map((remesa, idx) => (
                                                                    <option key={remesa.id} value={remesa.id}>
                                                                        Remesa #{idx + 1} - {remesa.cantidad / 1000} kg disponibles - {new Date(remesa.timestamp * 1000).toLocaleDateString()}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {!ingrediente.remesaSeleccionada && (
                                                                <p className="mt-2 text-sm text-olive-600">
                                                                    Seleccione una remesa para {ingrediente.nombre}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Input de Cantidad */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-800 mb-2">
                                        {token.esReceta ? '3. ' : '2. '}Cantidad a Procesar (kg)
                                        {!token.esReceta && maxKg > 0 && (
                                            <span className="ml-2 text-olive-600">
                                                Máximo disponible: {maxKg} kg
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="number"
                                        value={processedQuantity}
                                        onChange={(e) => setProcessedQuantity(e.target.value)}
                                        placeholder="Ingrese la cantidad en kg"
                                        max={token.esReceta ? undefined : maxKg}
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm bg-white"
                                    />
                                    {!processedQuantity && (
                                        <p className="mt-2 text-sm text-olive-600">
                                            Ingrese la cantidad a procesar
                                        </p>
                                    )}
                                </div>

                                {error && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-red-700">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={
                                        isLoading || 
                                        !processedQuantity || 
                                        Number(processedQuantity) <= 0 || 
                                        !selectedRemesaId ||
                                        (token.esReceta && ingredientes.some(ing => !ing.remesaSeleccionada))
                                    }
                                >
                                    {isLoading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Procesando...
                                        </span>
                                    ) : 'Procesar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    )
}

export default ProcessTokenModal
