'use client'

import { useState } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { ethers } from 'ethers'
import {CONTRACTS} from '@/constants/contracts'

interface Attribute {
  nombre: string
  valor: string
}

export default function AddProduct() {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [atributos, setAtributos] = useState<Attribute[]>([{ nombre: '', valor: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { address } = useWeb3()

  const handleAddAttribute = () => {
    setAtributos([...atributos, { nombre: '', valor: '' }])
  }

  const handleAttributeChange = (index: number, field: 'nombre' | 'valor', value: string) => {
    const newAtributos = [...atributos]
    newAtributos[index][field] = value
    setAtributos(newAtributos)
  }

  const handleRemoveAttribute = (index: number) => {
    const newAtributos = atributos.filter((_, i) => i !== index)
    setAtributos(newAtributos)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(
        CONTRACTS.Tokens.address,
        CONTRACTS.Tokens.abi,
        signer
      )

      // Validar campos
      if (!nombre || !cantidad || atributos.some(attr => !attr.nombre || !attr.valor)) {
        throw new Error('Por favor, complete todos los campos requeridos')
      }

      // Preparar los arrays de atributos
      const nombresAtributos = atributos.map(attr => attr.nombre)
      const valoresAtributos = atributos.map(attr => attr.valor)

      // Convertir la cantidad a tokens (multiplicar por 1000)
      const cantidadTokens = Number(cantidad) * 1000

      // Crear el token
      const tx = await contract.crearToken(
        nombre,
        cantidadTokens,
        descripcion || '',
        nombresAtributos,
        valoresAtributos
      )

      await tx.wait()
      setSuccess(true)
      
      // Limpiar el formulario
      setNombre('')
      setDescripcion('')
      setCantidad('')
      setAtributos([{ nombre: '', valor: '' }])
    } catch (err) {
      console.error('Error al crear el token:', err)
      setError(err instanceof Error ? err.message : 'Error al crear el token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div>
        <h2 className="text-2xl font-bold text-olive-800 mb-6">Crear Nuevo Producto</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Producto creado exitosamente
          </div>
        )}
      </div>

      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-olive-700">
          Nombre del Producto *
        </label>
        <input
          type="text"
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 block w-full rounded-md border-olive-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
          required
        />
      </div>

      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-olive-700">
          Descripción
        </label>
        <textarea
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-olive-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
        />
      </div>

      <div>
        <label htmlFor="cantidad" className="block text-sm font-medium text-olive-700">
          Cantidad *
        </label>
        <input
          type="number"
          id="cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="mt-1 block w-full rounded-md border-olive-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
          required
          min="1"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-olive-700">Atributos</label>
          <button
            type="button"
            onClick={handleAddAttribute}
            className="px-3 py-1 text-sm bg-olive-600 text-white rounded hover:bg-olive-700"
          >
            Añadir Atributo
          </button>
        </div>
        <div className="space-y-3">
          {atributos.map((attr, index) => (
            <div key={index} className="flex gap-3">
              <input
                type="text"
                value={attr.nombre}
                onChange={(e) => handleAttributeChange(index, 'nombre', e.target.value)}
                placeholder="Nombre"
                className="flex-1 rounded-md border-olive-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
              <input
                type="text"
                value={attr.valor}
                onChange={(e) => handleAttributeChange(index, 'valor', e.target.value)}
                placeholder="Valor"
                className="flex-1 rounded-md border-olive-300 shadow-sm focus:border-olive-500 focus:ring-olive-500"
              />
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(index)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 bg-olive-600 text-white rounded hover:bg-olive-700 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Creando...' : 'Crear Producto'}
        </button>
      </div>
    </form>
  )
}
