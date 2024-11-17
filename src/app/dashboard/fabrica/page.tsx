'use client'
import Dashboard from '@/components/Dashboard'

export default function FabricaDashboard() {
    return (
        <div className="container mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Panel de Fabricante</h1>
            <Dashboard role="fabrica" />
        </div>
    )
}