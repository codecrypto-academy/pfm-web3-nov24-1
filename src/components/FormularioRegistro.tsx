'use client'

import { useState } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import MapModal from './MapModal'

export default function RegisterForm() {
    const [nombre, setNombre] = useState('')
    const [rol, setRol] = useState('')
    const [gps, setGps] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState('')
    const [showMapModal, setShowMapModal] = useState(false)

    // Validar el formulario antes de enviar
    const validateForm = () => {
        if (nombre.trim().length < 3) {
            setMessage('El nombre debe tener al menos 3 caracteres')
            return false
        }

        if (!gps) {
            setMessage('Por favor seleccione una ubicación en el mapa')
            return false
        }

        const [lat, lng] = gps.split(',').map(Number)
        if (isNaN(lat) || isNaN(lng)) {
            setMessage('Coordenadas GPS inválidas')
            return false
        }

        if (!rol) {
            setMessage('Por favor seleccione un rol')
            return false
        }

        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage('')

        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const userAddress = await signer.getAddress()

            const response = await fetch('/api/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: userAddress,
                    nombre: nombre.trim(),
                    rol: rol.toLowerCase(),  // Convertimos a minúsculas aquí
                    gps
                }),
            })

            if (response.ok) {
                setMessage('Solicitud enviada con éxito. El administrador revisará su petición.')
                setNombre('')
                setRol('')
                setGps('')
            } else {
                throw new Error('Error al enviar la solicitud')
            }
        } catch (error) {
            setMessage('Error al enviar la solicitud. Por favor, inténtelo de nuevo.')
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleMapConfirm = (coordinates: { lat: number; lng: number }) => {
        setGps(`${coordinates.lat},${coordinates.lng}`)
        setShowMapModal(false)
    }

    const handleOpenMap = () => {
        setShowMapModal(true)
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center text-olive-600">Solicitud de Registro</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-earth-600 mb-2">Nombre:</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-3 py-2 border border-olive-200 rounded-lg focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-earth-600 mb-2">GPS:</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={gps}
                            onChange={(e) => setGps(e.target.value)}
                            className="w-full px-3 py-2 border border-olive-200 rounded-lg focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500"
                            placeholder="Seleccione ubicación en el mapa"
                            required
                            readOnly
                        />
                        <button
                            type="button"
                            onClick={handleOpenMap}
                            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
                        >
                            Mapa
                        </button>
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-earth-600 mb-2">Rol:</label>
                    <select
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                        className="w-full px-3 py-2 border border-olive-200 rounded-lg focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500"
                        required
                    >
                        <option value="">Seleccione un rol</option>
                        <option value="Productor">Productor</option>
                        <option value="Fabrica">Fábrica</option>
                        <option value="Minorista">Minorista</option>
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-olive-600 text-white py-2 rounded-lg hover:bg-olive-700 disabled:bg-gray-400 transition-colors"
                >
                    {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
                </button>
            </form>
            {message && (
                <div className={`mt-4 p-3 rounded-lg ${message.includes('éxito') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}
            {showMapModal && (
                <MapModal
                    onConfirm={handleMapConfirm}
                    onClose={() => setShowMapModal(false)}
                />
            )}
        </div>
    )
}
