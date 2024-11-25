'use client'

import { FC } from 'react'
import { createPortal } from 'react-dom'
import QRCode from '@/components/ui/QRCode'

interface TransferQRModalProps {
    isOpen: boolean
    onClose: () => void
    tokenId: number
    transferId: number
    timestamp: number
}

const TransferQRModal: FC<TransferQRModalProps> = ({
    isOpen,
    onClose,
    tokenId,
    transferId,
    timestamp
}) => {
    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Código QR de la Transferencia
                    </h3>
                    <div className="mb-4">
                        <QRCode
                            tokenId={tokenId}
                            transferId={transferId}
                            timestamp={timestamp}
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default TransferQRModal
