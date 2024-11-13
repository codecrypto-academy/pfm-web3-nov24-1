'use client'

import React from 'react';
import { CONTRACTS } from '@/constants/contracts'
import { ethers } from 'ethers'
import { useState, useEffect } from 'react'

interface Participante {
    direccion: string
    nombre: string
    rol: string
}

export default function AdminDashboard() {
    const [participants, setParticipants] = useState([])
    const CONTRACT_ADDRESS = CONTRACTS.PARTICIPANTES.ADDRESS

    useEffect(() => {
        const fetchParticipants = async () => {
            if (window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum)
                const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACTS.PARTICIPANTES.ABI, provider)
                const participantsList = await contract.getParticipantes()
                setParticipants(participantsList)
            }
        }
        fetchParticipants()
    }, [])

    return (
        <div className="container mx-auto">
            <h1 className="custom-subtitle">Lista de Participantes</h1>
            <table className="min-w-full bg-white shadow-md rounded-lg">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left">Dirección</th>
                        <th className="px-6 py-3 text-left">Nombre</th>
                        <th className="px-6 py-3 text-left">Rol</th>
                    </tr>
                </thead>
                <tbody>
                    {participants.map((participant: Participante, index) => (
                        <tr key={index} className="border-b">
                            <td className="px-6 py-4">{participant.direccion}</td>
                            <td className="px-6 py-4">{participant.nombre}</td>
                            <td className="px-6 py-4">{participant.rol}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}