'use client'

import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ClientTransactions from '@/components/shared/ClientTransactions'

export default function MinoristaDashboard() {
    const { isAuthenticated, isLoading: isAuthLoading, role: userRole } = useWeb3()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    // Efecto para manejar la redirección basada en el rol
    useEffect(() => {
        if (isAuthLoading) return

        if (!isAuthenticated) {
            router.push('/')
            return
        }

        if (userRole && userRole !== 'minorista') {
            router.push(`/dashboard/${userRole}`)
            return
        }
    }, [isAuthenticated, isAuthLoading, userRole, router])

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
                <span className="ml-3">Verificando autenticación...</span>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
                <span className="ml-3">Cargando datos...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-600">{error}</div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Panel de Minorista</h1>
            </div>

            {/* Sección de Historial de Transacciones */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Historial de Transacciones</h2>
                <ClientTransactions role="minorista" />
            </div>
        </div>
    )
}
