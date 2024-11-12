'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
    const router = useRouter()

    return (
        <div>
            <h1>Admin Dashboard</h1>
            {/* Add your admin dashboard content here */}
        </div>
    )
}