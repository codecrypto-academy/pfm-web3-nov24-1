'use client'

import PendingTransfers from '@/components/TransferenciasPendientes'

export default function PendingTransfersPage() {
    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-olive-800">Productos en Camino</h1>
                <p className="text-gray-600 mt-1">
                    Gestiona las transferencias de productos pendientes de aceptar
                </p>
            </div>
            <PendingTransfers />
        </div>
    )
}
