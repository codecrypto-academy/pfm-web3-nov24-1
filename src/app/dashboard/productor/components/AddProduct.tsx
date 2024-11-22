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
      // Validaciones mejoradas
      if (!nombre.trim()) {
        throw new Error('El nombre del producto es requerido')
      }

      // Filtrar atributos vacíos
      const atributosFiltrados = atributos.filter(
        attr => attr.nombre.trim() && attr.valor.trim()
      )

      if (atributosFiltrados.length === 0) {
        throw new Error('Debe agregar al menos un atributo válido')
      }

      // Validar que no haya nombres de atributos duplicados
      const nombresUnicos = new Set(atributosFiltrados.map(attr => attr.nombre.trim()))
      if (nombresUnicos.size !== atributosFiltrados.length) {
        throw new Error('Los nombres de los atributos no pueden estar duplicados')
      }

      // Preparar los arrays de atributos (ya filtrados y trimmed)
      const nombresAtributos = atributosFiltrados.map(attr => attr.nombre.trim())
      const valoresAtributos = atributosFiltrados.map(attr => attr.valor.trim())

      // Crear una nueva instancia del contrato con el signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      // Verificar que el usuario está conectado
      if (!address) {
        throw new Error('Por favor, conecta tu wallet primero')
      }

      console.log('Dirección del usuario:', address)

      // Verificar que el usuario está registrado
      const usuariosContract = new ethers.Contract(
        CONTRACTS.Usuarios.address,
        CONTRACTS.Usuarios.abi,
        signer
      )

      console.log('Verificando registro de usuario...')
      const esUsuarioRegistrado = await usuariosContract.esUsuario(address)
      console.log('¿Usuario registrado?:', esUsuarioRegistrado)

      const estaActivo = await usuariosContract.estaActivo(address)
      console.log('¿Usuario activo?:', estaActivo)

      if (!esUsuarioRegistrado) {
        throw new Error('Tu dirección no está registrada en el sistema. Contacta al administrador.')
      }

      if (!estaActivo) {
        throw new Error('Tu usuario está desactivado. Contacta al administrador.')
      }

      // Crear el contrato de tokens
      const tokensContract = new ethers.Contract(
        CONTRACTS.Tokens.address,
        CONTRACTS.Tokens.abi,
        signer
      )

      // Obtener el balance de ETH del usuario
      const balance = await provider.getBalance(address)
      console.log('Balance de ETH:', ethers.formatEther(balance), 'ETH')

      console.log('Datos a enviar:', {
        nombre: nombre.trim(),
        cantidad: 0,
        descripcion: descripcion.trim() || '',
        nombresAtributos,
        valoresAtributos
      })

      // Enviar la transacción sin estimación de gas
      const tx = await tokensContract.crearToken(
        nombre.trim(),
        0,
        descripcion.trim() || '',
        nombresAtributos,
        valoresAtributos
      )

      console.log('Transacción enviada:', tx.hash)
      
      // Esperar a que la transacción se confirme
      const receipt = await tx.wait()
      console.log('Transacción confirmada:', receipt)
      
      setSuccess(true)
      
      // Limpiar el formulario
      setNombre('')
      setDescripcion('')
      setAtributos([{ nombre: '', valor: '' }])
    } catch (error: any) {
      console.error('Error detallado:', {
        error,
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data
      })
      
      // Manejo de errores específicos
      if (typeof error.message === 'string') {
        if (error.message.includes('user rejected')) {
          setError('Transacción rechazada por el usuario')
        } else if (error.message.includes('insufficient funds')) {
          setError('Fondos insuficientes para realizar la transacción')
        } else if (error.message.includes('Los arrays de atributos')) {
          setError('Error en los atributos: ' + error.message)
        } else if (error.message.includes('execution reverted')) {
          setError('Error en el contrato: La transacción fue revertida. Verifica que tienes los permisos necesarios.')
        } else {
          const errorMessage = error.message || error.reason || 'Error desconocido'
          setError('Error al crear el producto: ' + errorMessage)
        }
      } else {
        setError('Error desconocido al crear el producto')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div>
        <h2 className="text-2xl font-bold text-olive-900">Crear Nuevo Producto</h2>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <p className="text-green-700">¡Producto creado exitosamente! Ahora puedes crear remesas de este producto.</p>
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
