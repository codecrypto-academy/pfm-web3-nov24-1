'use client'

import { FC, useState } from 'react'
import { createPortal } from 'react-dom'
import { CreateBatchModalProps, TokenAttribute } from '@/types/types'
import { formatAttributeName } from '@/utils/attributeLabels'

const CreateBatchModal: FC<CreateBatchModalProps> = ({
    isOpen,
    onClose,
    token,
    onSubmit,
    quantity,
    setQuantity,
    description,
    setDescription,
    attributes,
    setAttributes
}) => {
    if (!isOpen || !token) return null

    const handleSubmit = async () => {
        // Asegurarnos de que heredamos los atributos del token base
        const baseAttributes = Object.entries(token.atributos).map(([nombre, attr]) => {
            // Si es un atributo del sistema
            if (nombre === 'EsRemesa') {
                return {
                    nombre,
                    valor: 'true',
                    timestamp: Date.now()
                };
            }
            if (nombre === 'Tipo_Producto') {
                return {
                    nombre,
                    valor: attr.valor,
                    timestamp: Date.now()
                };
            }
            // Para todos los demás atributos, usar el valor seleccionado o ingresado
            const selectedAttr = attributes.find(a => a.nombre === nombre);
            return {
                nombre,
                valor: selectedAttr?.valor || attr.valor,
                timestamp: Date.now()
            };
        });

        setAttributes(baseAttributes);
        await onSubmit(token, quantity);
        onClose();
    }

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Crear Nuevo Lote de {token.nombre}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cantidad (kg)
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Ingrese la cantidad en kg"
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ingrese una descripción"
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Atributos del Lote
                        </label>
                        <div className="space-y-4">
                            {Object.entries(token.atributos)
                                .filter(([nombre]) => {
                                    // No mostrar atributos del sistema
                                    return !['EsRemesa', 'Tipo_Producto'].includes(nombre);
                                })
                                .map(([atributo, valor], index) => {
                                    // Intentar parsear el valor como JSON
                                    let opciones: string[] = [];
                                    try {
                                        const parsed = JSON.parse(valor.valor);
                                        if (Array.isArray(parsed)) {
                                            opciones = parsed;
                                        }
                                    } catch {
                                        // Si no es JSON, usar el valor como está
                                        opciones = [];
                                    }

                                    // Formatear el nombre para mostrar usando el utilitario
                                    const nombreMostrar = formatAttributeName(atributo);

                                    return (
                                        <div key={index} className="flex flex-col space-y-2">
                                            <label className="text-sm font-medium text-gray-600">
                                                {nombreMostrar}
                                            </label>
                                            {/* Si es un atributo de tipo texto */}
                                            {!opciones.length ? (
                                                <input
                                                    type="text"
                                                    value={attributes.find(attr => attr.nombre === atributo)?.valor || ''}
                                                    onChange={(e) => {
                                                        const updatedAttrs = [...attributes];
                                                        const existingIndex = updatedAttrs.findIndex(attr => attr.nombre === atributo);
                                                        
                                                        if (existingIndex >= 0) {
                                                            updatedAttrs[existingIndex] = {
                                                                nombre: atributo,
                                                                valor: e.target.value,
                                                                timestamp: Date.now()
                                                            };
                                                        } else {
                                                            updatedAttrs.push({
                                                                nombre: atributo,
                                                                valor: e.target.value,
                                                                timestamp: Date.now()
                                                            });
                                                        }
                                                        
                                                        setAttributes(updatedAttrs);
                                                    }}
                                                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm"
                                                    placeholder={`Ingrese ${nombreMostrar}`}
                                                />
                                            ) : (
                                                <select
                                                    value={attributes.find(attr => attr.nombre === atributo)?.valor || ''}
                                                    onChange={(e) => {
                                                        const updatedAttrs = [...attributes];
                                                        const existingIndex = updatedAttrs.findIndex(attr => attr.nombre === atributo);
                                                        
                                                        if (existingIndex >= 0) {
                                                            updatedAttrs[existingIndex] = {
                                                                nombre: atributo,
                                                                valor: e.target.value,
                                                                timestamp: Date.now()
                                                            };
                                                        } else {
                                                            updatedAttrs.push({
                                                                nombre: atributo,
                                                                valor: e.target.value,
                                                                timestamp: Date.now()
                                                            });
                                                        }
                                                        
                                                        setAttributes(updatedAttrs);
                                                    }}
                                                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm"
                                                    required
                                                >
                                                    <option value="">Seleccionar {nombreMostrar}</option>
                                                    {opciones.map((opcion, idx) => (
                                                        <option key={idx} value={opcion}>
                                                            {opcion}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-[#6D8B74] text-white rounded-md hover:bg-[#5F7A65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!quantity || Number(quantity) <= 0}
                    >
                        Crear Lote
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default CreateBatchModal
