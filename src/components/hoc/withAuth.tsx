'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWeb3 } from '@/context/Web3Context'
import LoadingSpinner from '@/components/LoadingSpinner'

export function withAuth(Component: React.ComponentType, requiredRole: string) {
    return function ProtectedRoute(props: any) {
        const { role, isAuthenticated, address } = useWeb3() || {}
        const router = useRouter()
        const [isChecking, setIsChecking] = useState(true)

        useEffect(() => {
            console.log("Current role:", role)
            console.log("Is authenticated:", isAuthenticated)
            console.log("Required role:", requiredRole)
            console.log("Current address:", address)

            // Add a small delay to ensure context is properly initialized
            const timer = setTimeout(() => {
                if (!isAuthenticated || !role || role.toLowerCase() !== requiredRole.toLowerCase()) {
                    console.log("Redirecting to home...")
                    router.push('/')
                }
                setIsChecking(false)
            }, 500)

            return () => clearTimeout(timer)
        }, [isAuthenticated, role, address, router]) 

        // Show loading state while checking authentication
        if (isChecking) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <LoadingSpinner />
                </div>
            )
        }

        // Only render the component if authenticated and role matches
        if (isAuthenticated && role && role.toLowerCase() === requiredRole.toLowerCase()) {
            return <Component {...props} />
        }

        // Return null while redirecting
        return null
    }
}
