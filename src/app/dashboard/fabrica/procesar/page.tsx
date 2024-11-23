'use client'
import ProcessProduct from '@/components/ProcesarProducto'

export default function ProcesarPage() {
    return (
        <div className="container mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Procesar Materias Primas</h1>
            <ProcessProduct />
        </div>
    )
}
