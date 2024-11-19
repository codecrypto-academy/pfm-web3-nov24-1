'use client'

import ClientTransactions from '@/components/ClientTransactions'

export default function AdminTransactionsPage() {
    return (
        <div className="container mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Historial de Transacciones</h1>
            <ClientTransactions role="admin" />
        </div>
    )
}
