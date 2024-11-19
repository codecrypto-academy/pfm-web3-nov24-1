'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWeb3 } from '@/context/Web3Context'

export default function DashboardPage() {
    const router = useRouter()
    const { role } = useWeb3()

    useEffect(() => {
        if (role) {
            router.push(`/dashboard/${role.toLowerCase()}`)
        }
    }, [role, router])

    // Mostrar un mensaje mientras se redirige
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-600">Redirigiendo al panel correspondiente...</p>
        </div>
    )
}