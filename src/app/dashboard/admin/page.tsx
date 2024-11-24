'use client'

import React, { Suspense } from 'react'
import { CONTRACTS } from '@/constants/contracts'
import { ethers } from 'ethers'
import { useState, useEffect } from 'react'
import { withAuth } from '@/components/hoc/withAuth'
import MapModal from '@/components/MapModal'
import dynamic from 'next/dynamic'
import { FaMapMarkerAlt } from 'react-icons/fa'
import { useWeb3 } from '@/context/Web3Context'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Participante {
    direccion: string
    nombre: string
    rol: string
    activo: boolean
    gps: string
}

interface PendingRequest {
    id: number
    address: string
    nombre: string
    rol: string
    gps: string;
    timestamp: string
    status: string
}

// Import MapaParticipantes dynamically
const MapaParticipantes = dynamic(
  () => import('@/components/MapaParticipantes'),
  { ssr: false }
);

// Función para formatear roles
const formatRole = (role: string): string => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function AdminDashboard() {
    const [participants, setParticipants] = useState<Participante[]>([])
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const CONTRACT_ADDRESS = CONTRACTS.Usuarios.address
    const [isApproving, setIsApproving] = useState<number | null>(null)
    const [showMap, setShowMap] = useState(false)
    const [selectedParticipant, setSelectedParticipant] = useState<Participante | null>(null)
    const { isAuthenticated, role } = useWeb3() || {}
    const router = useRouter()

    const fetchParticipants = async () => {
        try {
            if (!(window as any).ethereum) {
                throw new Error('MetaMask no está instalado')
            }

            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACTS.Usuarios.abi, provider)
            const participantsList = await contract.getUsuarios()
            setParticipants(participantsList)
        } catch (error) {
            console.error('Error fetching participants:', error)
            setError('Error al cargar la lista de participantes')
        }
    }

    const fetchPendingRequests = async () => {
        try {
            const response = await fetch('/api/requests')
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json()
            setPendingRequests(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Error fetching requests:', error)
            setError('Error al cargar las solicitudes pendientes: ' + (error instanceof Error ? error.message : 'Error desconocido'))
            setPendingRequests([]) // Set empty array on error
        }
    }

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true)
                setError(null)
                
                // Verificar autenticación
                if (!isAuthenticated || role?.toLowerCase() !== 'admin') {
                    router.push('/')
                    return
                }

                await Promise.all([
                    fetchParticipants().catch(error => {
                        console.error('Error in fetchParticipants:', error);
                        setParticipants([]);
                        throw error;
                    }),
                    fetchPendingRequests().catch(error => {
                        console.error('Error in fetchPendingRequests:', error);
                        setPendingRequests([]);
                        throw error;
                    })
                ]).catch(error => {
                    console.error('Error in Promise.all:', error);
                    setError('Error al cargar los datos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
                });
            } catch (error) {
                console.error('Error loading dashboard:', error)
                setError('Error al cargar el dashboard: ' + (error instanceof Error ? error.message : 'Error desconocido'))
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [isAuthenticated, role, router])

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <LoadingSpinner />
                <p className="text-gray-600 mt-4">Cargando datos del dashboard...</p>
            </div>
        )
    }

    // Show error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Reintentar
                </button>
            </div>
        )
    }

    const toggleUserStatus = async (direccion: string, isCurrentlyActive: boolean) => {
        try {
            if (!(window as any).ethereum) {
                throw new Error('MetaMask no está instalado')
            }

            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACTS.Usuarios.abi, signer)

            const tx = await contract[isCurrentlyActive ? 'desactivarUsuario' : 'activarUsuario'](direccion)
            await tx.wait()
            await fetchParticipants()
        } catch (error) {
            console.error('Error toggling user status:', error)
            setError('Error al cambiar el estado del usuario')
        }
    }

    const approveRequest = async (request: PendingRequest) => {
        setIsApproving(request.id)
        try {
            if (!(window as any).ethereum) {
                throw new Error('MetaMask no está instalado')
            }

            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACTS.Usuarios.abi, signer)

            const formattedRole = formatRole(request.rol)
            const tx = await contract.nuevoUsuario(request.address, request.nombre, request.gps, formattedRole)
            await tx.wait()

            const response = await fetch('/api/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: request.id,
                    status: 'approved'
                }),
            })

            if (!response.ok) {
                throw new Error('Error updating request status')
            }

            await Promise.all([
                fetchPendingRequests(),
                fetchParticipants()
            ])
        } catch (error) {
            console.error('Error approving request:', error)
            setError('Error al aprobar la solicitud')
        } finally {
            setIsApproving(null)
        }
    }

    return (
        <Suspense fallback={<LoadingSpinner />}>
            <div className="container mx-auto px-4 py-8">
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
                                        <td className="px-6 py-4">{formatRole(request.rol)}</td>
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
                <div className="relative">
                    <table className="min-w-full bg-white shadow-md rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left">Dirección</th>
                                <th className="px-6 py-3 text-left">Nombre</th>
                                <th className="px-6 py-3 text-left">Rol</th>
                                <th className="px-6 py-3 text-left">Estado</th>
                                <th className="px-6 py-3 text-left">Mapa</th>
                                <th className="px-6 py-3 text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.map((participant: Participante, index) => (
                                <tr key={index} className="border-b">
                                    <td className="px-6 py-4">{participant.direccion}</td>
                                    <td className="px-6 py-4">{participant.nombre}</td>
                                    <td className="px-6 py-4">{formatRole(participant.rol)}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-2 py-1 rounded ${participant.activo
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {participant.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => {
                                                setSelectedParticipant(participant)
                                                setShowMap(true)
                                            }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <FaMapMarkerAlt className="text-xl" />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleUserStatus(participant.direccion, participant.activo)}
                                            className={`px-4 py-2 rounded ${participant.activo
                                                ? 'bg-red-500 hover:bg-red-600'
                                                : 'bg-green-500 hover:bg-green-600'
                                                } text-white`}
                                        >
                                            {participant.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {participants.length > 0 && (
                    <MapaParticipantes participants={participants} />
                )}
                
                {showMap && selectedParticipant && (
                    <div id="modal-root">
                        <MapModal
                            onClose={() => {
                                setShowMap(false)
                                setSelectedParticipant(null)
                            }}
                            initialCoordinates={parseGPSString(selectedParticipant.gps)}
                            title={`Ubicación de ${selectedParticipant.nombre}`}
                            readOnly={true}
                        />
                    </div>
                )}
            </div>
        </Suspense>
    )
}

// Función auxiliar para convertir la cadena GPS en coordenadas
function parseGPSString(gps: string): [number, number] {
    try {
        // Asumiendo que el formato es "latitud,longitud"
        const [lat, lng] = gps.split(',').map(coord => parseFloat(coord.trim()))
        if (isNaN(lat) || isNaN(lng)) {
            return [40.4168, -3.7038] // Madrid como fallback
        }
        return [lat, lng]
    } catch (error) {
        console.error('Error parsing GPS coordinates:', error)
        return [40.4168, -3.7038] // Madrid como fallback
    }
}

// Wrap the component with withAuth HOC
const ProtectedAdminDashboard = withAuth(AdminDashboard, 'admin')

// Export the wrapped component
export default function AdminPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <ProtectedAdminDashboard />
        </Suspense>
    )
}
