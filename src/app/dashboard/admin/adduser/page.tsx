'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
export default function AddUsser() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        address: '',
        name: '',
        role: ''
    })

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!formData.address || !formData.name || !formData.role) {
            alert('Por favor complete todos los campos')
            return
        }

        if (!ethers.isAddress(formData.address)) {
            alert('Dirección Ethereum inválida')
            return
        }

        setIsLoading(true)

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(CONTRACTS.PARTICIPANTES.ADDRESS, CONTRACTS.PARTICIPANTES.ABI, signer)

            const tx = await contract.nuevoUsuario(
                formData.address,
                formData.name,
                formData.role
            )

            await tx.wait()
            router.push('/dashboard/admin')
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
                <h1 className="custom-subtitle ">Añadir Usuario</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="address" className="text-sm font-medium text-primary">
                            Dirección Ethereum
                        </label>
                        <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-input text-primary"
                            placeholder="0x..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-primary">
                            Nombre
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-input text-primary"
                            placeholder="Nombre del usuario"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="role" className="text-sm font-medium text-primary">
                            Rol
                        </label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md bg-input text-primary"
                        >
                            <option value="">Seleccionar rol</option>
                            <option value="Admin">Admin</option>
                            <option value="Productor">Productor</option>
                            <option value="Fabrica">Fabrica</option>
                            <option value="Minorista">Minorista</option>
                            <option value="Consumidor">Consumidor</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="company-access-btn"
                    >
                        {isLoading ? 'Procesando...' : 'Añadir Usuario'}
                    </button>
                </form>
            </div>
        </div>
    )
}