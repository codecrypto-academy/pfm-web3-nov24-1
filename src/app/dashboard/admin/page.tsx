'use client'

import React from 'react'
import { CONTRACTS } from '@/constants/contracts'
import { ethers } from 'ethers'
import { useState, useEffect } from 'react'
import { withAuth } from '@/components/hoc/withAuth'

interface Participante {
    direccion: string
    nombre: string
    rol: string
    activo: boolean
}

interface PendingRequest {
    id: number
    address: string
    nombre: string
    rol: string
    timestamp: string
    status: string
}

function AdminDashboard() {
    const [participants, setParticipants] = useState([])
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
    const CONTRACT_ADDRESS = CONTRACTS.PARTICIPANTES.ADDRESS
    const [isApproving, setIsApproving] = useState<number | null>(null)


    const fetchParticipants = async () => {
        if ((window as any).ethereum) {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACTS.PARTICIPANTES.ABI, provider)
            const participantsList = await contract.getUsuarios()
            setParticipants(participantsList)
        }
    }

    const fetchPendingRequests = async () => {
        const response = await fetch('/api/requests')
        const data = await response.json()
        setPendingRequests(data)
    }

    useEffect(() => {
        fetchParticipants()
        fetchPendingRequests()
    }, [])

    const toggleUserStatus = async (direccion: string, isCurrentlyActive: boolean) => {
        if ((window as any).ethereum) {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACTS.PARTICIPANTES.ABI, signer)

            const tx = await contract[isCurrentlyActive ? 'desactivarUsuario' : 'activarUsuario'](direccion)
            await tx.wait() // Wait for blockchain confirmation
            await fetchParticipants() // Refresh the list after confirmation
        }
    }

    const approveRequest = async (request: PendingRequest) => {
        setIsApproving(request.id)
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACTS.PARTICIPANTES.ABI, signer)

            const tx = await contract.nuevoUsuario(request.address, request.nombre, request.rol)
            await tx.wait() // Wait for blockchain confirmation

            // After blockchain confirmation, remove from JSON
            await fetch('/api/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: request.id,
                    status: 'approved'
                }),
            })

            fetchPendingRequests()
            fetchParticipants()
        } catch (error) {
            console.error('Error approving request:', error)
        } finally {
            setIsApproving(null)
        }
    }

    return (
        <div className="container mx-auto">
            {pendingRequests.length > 0 && (
                <>
                    <h2 className="custom-subtitle mt-8 mb-4">Solicitudes Pendientes</h2>
                    <table className="min-w-full bg-white shadow-md rounded-lg mb-8">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left">Dirección</th>
                                <th className="px-6 py-3 text-left">Nombre</th>
                                <th className="px-6 py-3 text-left">Rol</th>
                                <th className="px-6 py-3 text-left">Fecha</th>
                                <th className="px-6 py-3 text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRequests.map((request) => (
                                <tr key={request.id} className="border-b">
                                    <td className="px-6 py-4">{request.address}</td>
                                    <td className="px-6 py-4">{request.nombre}</td>
                                    <td className="px-6 py-4">{request.rol}</td>
                                    <td className="px-6 py-4">
                                        {new Date(request.timestamp).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => approveRequest(request)}
                                            disabled={isApproving === request.id}
                                            className={`px-4 py-2 rounded ${isApproving === request.id
                                                ? 'bg-gray-400'
                                                : 'bg-green-500 hover:bg-green-600'
                                                } text-white mr-2`}
                                        >
                                            {isApproving === request.id ? 'Procesando...' : 'Aprobar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            <h1 className="custom-subtitle">Lista de Participantes</h1>
            <table className="min-w-full bg-white shadow-md rounded-lg">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left">Dirección</th>
                        <th className="px-6 py-3 text-left">Nombre</th>
                        <th className="px-6 py-3 text-left">Rol</th>
                        <th className="px-6 py-3 text-left">Estado</th>
                        <th className="px-6 py-3 text-left">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {participants.map((participant: Participante, index) => (
                        <tr key={index} className="border-b">
                            <td className="px-6 py-4">{participant.direccion}</td>
                            <td className="px-6 py-4">{participant.nombre}</td>
                            <td className="px-6 py-4">{participant.rol}</td>
                            <td className="px-6 py-4">
                                {participant.activo ?
                                    <span className="text-green-600">Activo</span> :
                                    <span className="text-red-600">Inactivo</span>
                                }
                            </td>
                            <td className="px-6 py-4">
                                <button
                                    onClick={() => toggleUserStatus(participant.direccion, participant.activo)}


                                    className={`px-4 py-2 rounded ${participant.activo
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                        }`}
                                >
                                    {participant.activo ? 'Desactivar' : 'Activar'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default withAuth(AdminDashboard, 'admin')
