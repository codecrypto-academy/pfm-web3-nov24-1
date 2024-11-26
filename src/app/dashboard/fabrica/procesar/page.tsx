'use client'
import ProcessProduct from '@/components/ProcesarProducto'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function ProcesarPage() {
    return (
        <div className="container mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Procesar Materias Primas</h1>
            <ProcessProduct />
            <ToastContainer />
        </div>
    )
}
