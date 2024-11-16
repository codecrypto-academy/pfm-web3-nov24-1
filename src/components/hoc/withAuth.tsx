'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWeb3 } from '@/context/Web3Context'

export function withAuth(Component: React.ComponentType, requiredRole: string) {
    return function ProtectedRoute(props: any) {
        const { role, isAuthenticated, address } = useWeb3()
        const router = useRouter()

        useEffect(() => {
            console.log("Current role:", role)
            console.log("Is authenticated:", isAuthenticated)
            console.log("Required role:", requiredRole)
            console.log("Current address:", address)

            if (!isAuthenticated || role.toLowerCase() !== requiredRole.toLowerCase()) {
                console.log("Redirecting to home...")
                router.push('/')
            }
        }, [isAuthenticated, role, address]) // Added address to dependencies

        return <Component {...props} />
    }
}