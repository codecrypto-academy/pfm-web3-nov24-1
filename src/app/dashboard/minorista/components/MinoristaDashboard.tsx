'use client'

import { useWeb3 } from '@/context/Web3Context'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ClientTransactions from '@/components/shared/ClientTransactions'
import TokensDisponibles from './TokensDisponibles'

export default function MinoristaDashboard() {
    const { isAuthenticated, isLoading: isAuthLoading, role: userRole } = useWeb3()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

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

        setLoading(false)
    }, [isAuthenticated, isAuthLoading, userRole, router])

    if (isAuthLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
                <span className="ml-3">Cargando...</span>
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
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Panel de Minorista</h1>
            <div className="space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-4">Tokens Disponibles</h2>
                    <TokensDisponibles />
                </section>
                
            </div>
        </div>
    )
}
