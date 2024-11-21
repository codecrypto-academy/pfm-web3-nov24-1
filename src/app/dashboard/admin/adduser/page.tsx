'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import MapModal from '@/components/MapModal'

export default function AddUsser() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [txStatus, setTxStatus] = useState('')
    const [formData, setFormData] = useState({
        address: '',
        name: '',
        role: '',
        gps: ''
    })
    const [showMapModal, setShowMapModal] = useState(false)

    const handleMapConfirm = (coordinates: { lat: number; lng: number }) => {
        setFormData({
            ...formData,
            gps: `${coordinates.lat},${coordinates.lng}`
        })
        setShowMapModal(false)
    }

    const handleOpenMap = () => {
        setShowMapModal(true)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        setTxStatus('')

        if (!formData.address || !formData.name || !formData.role || !formData.gps) {
            setError('Por favor complete todos los campos')
            return
        }

        if (!ethers.isAddress(formData.address)) {
            setError('Dirección Ethereum inválida')
            return
        }

        setIsLoading(true)

        try {
            setTxStatus('Conectando con la wallet...')
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(CONTRACTS.Usuarios.address, CONTRACTS.Usuarios.abi, signer)

            setTxStatus('Enviando transacción...')
            const tx = await contract.nuevoUsuario(
                formData.address,
                formData.name,
                formData.gps,
                formData.role
            )

            setTxStatus('Esperando confirmación...')
            const receipt = await tx.wait()
            
            if (receipt.status === 1) {
                setTxStatus('¡Usuario añadido con éxito!')
                setTimeout(() => {
                    router.push('/dashboard/admin')
                }, 2000)
            } else {
                throw new Error('La transacción falló')
            }
        } catch (error: any) {
            console.error('Error:', error)
            setError(error.message || 'Error al añadir usuario')
            setTxStatus('')
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
                        <label htmlFor="gps" className="text-sm font-medium text-primary">
                            GPS
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="gps"
                                name="gps"
                                value={formData.gps}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md bg-input text-primary"
                                placeholder="Seleccione ubicación en el mapa"
                                readOnly
                            />
                            <button
                                type="button"
                                onClick={handleOpenMap}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                Mapa
                            </button>
                        </div>
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

                {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                )}
                
                {txStatus && (
                    <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded-md">
                        {txStatus}
                    </div>
                )}
            </div>
            {showMapModal && (
                <MapModal
                    onConfirm={handleMapConfirm}
                    onClose={() => setShowMapModal(false)}
                />
            )}
        </div>
    )
}