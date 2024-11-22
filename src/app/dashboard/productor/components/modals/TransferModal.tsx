'use client'

import { FC, useState } from 'react'
import { createPortal } from 'react-dom'
import { TransferModalProps } from '../../types'

const TransferModal: FC<TransferModalProps> = ({
    isOpen,
    onClose,
    token,
    onSubmit,
    factories,
    selectedFactory,
    setSelectedFactory,
    quantity,
    setQuantity,
    factoryBalance,
    onFactorySelect
}) => {
    if (!isOpen || !token) return null

    const handleSubmit = async () => {
        await onSubmit()
        onClose()
    }

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Transferir Lote #{token.id} de {token.nombre}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cantidad Disponible
                        </label>
                        <p className="text-gray-600">
                            {token.cantidad / 1000} kg ({token.cantidad} tokens)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cantidad a Transferir (kg)
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
                            Seleccionar Fábrica
                        </label>
                        <select
                            value={selectedFactory}
                            onChange={(e) => {
                                setSelectedFactory(e.target.value)
                                if (e.target.value) {
                                    onFactorySelect(token.id, e.target.value)
                                }
                            }}
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm"
                        >
                            <option value="">Seleccionar una fábrica</option>
                            {factories.map((factory, index) => (
                                <option key={index} value={factory.direccion}>
                                    {factory.nombre} ({factory.direccion})
                                </option>
                            ))}
                        </select>
                    </div>

                    {factoryBalance && (
                        <div>
                            <p className="text-sm text-gray-600">{factoryBalance}</p>
                        </div>
                    )}
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
                        disabled={!quantity || !selectedFactory || Number(quantity) <= 0 || Number(quantity) * 1000 > token.cantidad}
                    >
                        Transferir
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default TransferModal
