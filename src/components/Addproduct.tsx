'use client'
import { FC } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { useState } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'

interface CreateProductProps {
    role: 'productor' | 'fabrica' | 'distribuidor' | 'mayorista'
}

const CreateProduct: FC<CreateProductProps> = ({ role }) => {
    const router = useRouter()
    const { address } = useWeb3()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [txStatus, setTxStatus] = useState('')
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        cantidad: '',
        tokenRatio: 1000,
        idTokenPadre: '0'
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setTxStatus('')

        if (!formData.nombre || !formData.descripcion || !formData.cantidad) {
            setError('Por favor complete todos los campos')
            return
        }

        setIsLoading(true)

        try {
            setTxStatus('Conectando con la wallet...')
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                signer
            )

            const totalTokens = Number(formData.cantidad) * formData.tokenRatio

            setTxStatus('Enviando transacción...')
            const tx = await contract.crearToken(
                formData.nombre,
                totalTokens,
                formData.descripcion,
                formData.idTokenPadre,
                0
            )

            setTxStatus('Esperando confirmación...')
            const receipt = await tx.wait()
            
            if (receipt.status === 1) {
                setTxStatus('¡Producto creado con éxito!')
                setTimeout(() => {
                    router.push(`/dashboard/${role}`)
                }, 2000)
            } else {
                throw new Error('La transacción falló')
            }
        } catch (error: any) {
            console.error('Error:', error)
            setError(error.message || 'Error al crear el producto')
            setTxStatus('')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bubbles-background">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
                <h1 className="custom-subtitle">Crear Nuevo Producto</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-primary">
                            Nombre del Producto
                        </label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-md bg-input text-primary"
                            placeholder="Ej: Aceituna negra"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-primary">
                            Descripción
                        </label>
                        <textarea
                            className="w-full p-2 border rounded-md bg-input text-primary"
                            placeholder="Descripción detallada del producto"
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-primary">
                            Cantidad (kg)
                        </label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded-md bg-input text-primary"
                            placeholder="Ej: 100"
                            value={formData.cantidad}
                            onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                        />
                        <p className="text-sm text-gray-500">
                            Se generarán {Number(formData.cantidad || 0) * formData.tokenRatio} tokens
                            (1kg = 1000 tokens)
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="company-access-btn"
                    >
                        {isLoading ? 'Procesando...' : 'Crear Producto'}
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
        </div>
    )
}

export default CreateProduct
