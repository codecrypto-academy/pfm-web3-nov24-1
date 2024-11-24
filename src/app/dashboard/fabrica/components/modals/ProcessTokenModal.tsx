'use client'

import { FC } from 'react'
import { createPortal } from 'react-dom'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useState } from 'react'

interface ProcessTokenModalProps {
    isOpen: boolean
    onClose: () => void
    token: any
    onSubmit: (token: any, processedQuantity: string) => Promise<void>
}

interface TokenAttribute {
    nombre: string
    valor: string
    timestamp: number
}

const ProcessTokenModal: FC<ProcessTokenModalProps> = ({
    isOpen,
    onClose,
    token,
    onSubmit
}) => {
    const [processedQuantity, setProcessedQuantity] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    if (!isOpen || !token) return null

    const handleSubmit = async () => {
        try {
            setError('')
            setIsLoading(true)

            // Validar cantidad
            if (!processedQuantity || Number(processedQuantity) <= 0) {
                setError('La cantidad debe ser mayor a 0')
                return
            }

            // Obtener el contrato
            const provider = new ethers.BrowserProvider(window.ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                signer
            )

            // Preparar los atributos del nuevo token procesado
            const baseAttributes = Object.entries(token.atributos).map(([nombre, attr]: [string, any]) => ({
                nombre,
                valor: attr.valor,
                timestamp: Date.now()
            }));

            // Actualizar los atributos críticos
            const updatedAttributes = baseAttributes.map(attr => {
                if (attr.nombre === 'Procesado') {
                    return { ...attr, valor: 'true' };
                }
                if (attr.nombre === 'MateriaPrima') {
                    return { ...attr, valor: 'false' };
                }
                return attr;
            });

            // Asegurarnos de que existan los atributos críticos
            const criticalAttributes = [
                { nombre: 'Procesado', valor: 'true' },
                { nombre: 'MateriaPrima', valor: 'false' }
            ];

            criticalAttributes.forEach(criticalAttr => {
                if (!updatedAttributes.some(attr => attr.nombre === criticalAttr.nombre)) {
                    updatedAttributes.push({
                        ...criticalAttr,
                        timestamp: Date.now()
                    });
                }
            });

            // Preparar los arrays para el contrato
            const nombresAtributos = updatedAttributes.map(attr => attr.nombre);
            const valoresAtributos = updatedAttributes.map(attr => attr.valor);

            // Procesar el token
            const tx = await contract.procesarToken(
                token.id,
                processedQuantity,
                nombresAtributos,
                valoresAtributos,
                { gasLimit: 500000 }
            );
            await tx.wait();

            await onSubmit(token, processedQuantity);
            onClose();

        } catch (error: any) {
            console.error('Error al procesar el token:', error);
            setError(error.message || 'Error al procesar el token');
        } finally {
            setIsLoading(false);
        }
    }

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Procesar {token.nombre}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cantidad a Procesar (kg)
                        </label>
                        <input
                            type="number"
                            value={processedQuantity}
                            onChange={(e) => setProcessedQuantity(e.target.value)}
                            placeholder="Ingrese la cantidad en kg"
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-olive-500 focus:border-olive-500 shadow-sm"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
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
                        className="px-4 py-2 bg-[#6D8B74] text-white rounded-md hover:bg-[#5F7A65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading || !processedQuantity || Number(processedQuantity) <= 0}
                    >
                        {isLoading ? 'Procesando...' : 'Procesar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default ProcessTokenModal
