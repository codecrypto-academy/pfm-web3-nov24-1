'use client'

import TransferenciasPendientesMinorista from '@/components/TransferenciasPendientesMinorista'

export default function TransferenciasPage() {
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Transferencias Pendientes</h1>
            <TransferenciasPendientesMinorista />
        </div>
    )
}
