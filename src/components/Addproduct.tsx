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
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        cantidad: '',
        tokenRatio: 1000,
        idTokenPadre: '0'
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.TOKENS.ADDRESS,
                CONTRACTS.TOKENS.ABI,
                signer
            )

            const totalTokens = Number(formData.cantidad) * formData.tokenRatio

            const tx = await contract.crearToken(
                formData.nombre,
                totalTokens,
                formData.descripcion,
                formData.idTokenPadre
            )

            await tx.wait()
            router.push(`/dashboard/${role}`)
        } catch (error) {
            console.error('Error:', error)
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
            </div>
        </div>
    )
}

export default CreateProduct
