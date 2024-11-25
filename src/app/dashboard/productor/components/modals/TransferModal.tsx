'use client'

import { FC, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TransferModalProps } from '@/types/types'
import QRCode from '@/components/ui/QRCode'

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
    onFactorySelect,
    transferCompleted = false,
    transferId,
    transferTimestamp
}) => {
    const [showQR, setShowQR] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    useEffect(() => {
        console.log('Transfer values changed:', { transferId, transferTimestamp });
        if (transferId !== undefined && transferTimestamp !== undefined) {
            console.log('Setting showQR to true');
            setShowQR(true);
        }
    }, [transferId, transferTimestamp]);

    if (!isOpen || !token) return null
    if (!mounted) return null

    const handleSubmit = async () => {
        try {
            await onSubmit()
        } catch (error) {
            console.error('Error en la transferencia:', error)
        }
    }

    const handleClose = () => {
        setShowQR(false)
        onClose()
    }

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                {!showQR ? (
                    <>
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
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    placeholder="Ingrese la cantidad en kg"
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
                                        if (onFactorySelect && token) {
                                            onFactorySelect(token.id, e.target.value)
                                        }
                                    }}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                >
                                    <option value="">Seleccione una fábrica</option>
                                    {factories.map((factory) => (
                                        <option key={factory.direccion} value={factory.direccion}>
                                            {factory.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {factoryBalance && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Balance Actual de la Fábrica
                                    </label>
                                    <p className="text-gray-600">{factoryBalance}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                disabled={!selectedFactory || !quantity}
                            >
                                Transferir
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Transferencia Exitosa
                        </h3>
                        <div className="mb-4">
                            <QRCode
                                tokenId={token.id}
                                transferId={transferId}
                                timestamp={transferTimestamp}
                            />
                        </div>
                        <button
                            onClick={handleClose}
                            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}

export default TransferModal
