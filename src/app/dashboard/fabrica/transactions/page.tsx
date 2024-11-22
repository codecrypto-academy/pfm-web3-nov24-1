'use client'

import ClientTransactions from '@/components/shared/ClientTransactions'

export default function FabricaTransactionsPage() {
    return (
        <div className="container mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Historial de Transacciones</h1>
            <ClientTransactions role="fabrica" />
        </div>
    )
}
