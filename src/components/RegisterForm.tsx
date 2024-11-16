'use client'

import { useState } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'

export default function RegisterForm() {
    const [nombre, setNombre] = useState('')
    const [rol, setRol] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage('')

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
                    nombre,
                    rol
                }),
            })

            if (response.ok) {
                setMessage('Solicitud enviada con éxito. El administrador revisará su petición.')
                setNombre('')
                setRol('')
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

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Solicitud de Registro</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Nombre:</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Rol:</label>
                    <select
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                >
                    {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
                </button>
            </form>
            {message && (
                <div className={`mt-4 p-3 rounded-lg ${message.includes('éxito') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {message}
                </div>
            )}
        </div>
    )
}
