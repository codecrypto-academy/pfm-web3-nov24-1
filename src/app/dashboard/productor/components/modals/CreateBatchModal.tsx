'use client'

import { FC, useState } from 'react'
import { createPortal } from 'react-dom'
import { CreateBatchModalProps, TokenAttribute } from '../../types'

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
        await onSubmit(token, quantity)
        onClose()
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
                            {Object.keys(token.atributos).map((atributo, index) => (
                                <div key={index} className="flex flex-col space-y-2">
                                    <label className="text-sm font-medium text-gray-600">
                                        {atributo}
                                    </label>
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
                                    >
                                        <option value="">Seleccionar {atributo}</option>
                                        {token.atributos[atributo].valor.split(',').map((opcion, idx) => (
                                            <option key={idx} value={opcion.trim()}>
                                                {opcion.trim()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
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
