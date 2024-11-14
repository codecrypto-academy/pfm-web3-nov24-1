'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'

export type Web3ContextType = {
    address: string
    role: string
    name: string
    isAuthenticated: boolean
    connect: () => Promise<void>
    disconnect: () => void
}

const Web3Context = createContext<Web3ContextType | null>(null)

export function Web3Provider({ children }: { children: React.ReactNode }) {
    const [address, setAddress] = useState('')
    const [role, setRole] = useState('')
    const [name, setName] = useState('')  // Add this line to define the 'name' state
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const router = useRouter()

    // Función para verificar el rol del participante
    const checkParticipantRole = useCallback(async (address: string): Promise<string | undefined> => {
        console.log("Checking role for address:", address)
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.PARTICIPANTES.ADDRESS,
                CONTRACTS.PARTICIPANTES.ABI,
                signer
            )

            const participants = await contract.getParticipantes()
            console.log("Raw participant data:", participants)

            const userParticipant = participants.find(
                (p: any) => p[0].toLowerCase() === address.toLowerCase()
            )
            console.log("Found participant:", userParticipant)


            if (userParticipant) {
                setRole(userParticipant[2])  // Should use array index instead of .rol
                setName(userParticipant[1])  // Should use array index instead of .nombre
                return userParticipant[2]
            }
            console.log("No participant found for address:", address)
            return undefined
        } catch (error) {
            console.error("Error checking participant role:", error)
            return undefined
        }
    }, [])


    // Función para manejar cambios en las cuentas
    const handleAccountsChanged = useCallback(async (accounts: string[]) => {
        if (accounts.length === 0) {
            // ... existing disconnect logic ...
        } else if (accounts[0] !== address) {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.PARTICIPANTES.ADDRESS,
                CONTRACTS.PARTICIPANTES.ABI,
                signer
            )

            const participants = await contract.getParticipantes()
            const userParticipant = participants.find(
                (p: any) => p[0].toLowerCase() === accounts[0].toLowerCase()
            )

            if (userParticipant) {
                const newRole = userParticipant[2]
                const newName = userParticipant[1]

                setAddress(accounts[0])
                setRole(newRole)
                setName(newName)
                setIsAuthenticated(true)

                localStorage.setItem('web3Auth', JSON.stringify({
                    address: accounts[0],
                    role: newRole,
                    name: newName
                }))

                router.push(`/dashboard/${newRole.toLowerCase()}`)
            }
        }
    }, [address, router])

    // Conectar la wallet
    const connect = useCallback(async () => {
        if (!(window as any).ethereum) {
            return
        }

        try {
            const permissions = await (window as any).ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }],
            })

            const accounts = await (window as any).ethereum.request({
                method: 'eth_accounts'
            })

            if (accounts.length > 0) {
                await handleAccountsChanged(accounts)
            } else {
            }
        } catch (error) {
        }
    }, [handleAccountsChanged])

    // Desconectar la wallet
    const disconnect = useCallback(() => {
        setAddress('')
        setRole('')
        setName('')  // Clear the name when disconnecting
        setIsAuthenticated(false)
        localStorage.removeItem('web3Auth')
        router.push('/')
    }, [router])

    // Cargar estado de autenticación inicial desde localStorage
    useEffect(() => {
        const storedAuth = localStorage.getItem('web3Auth')
        if (storedAuth) {
            try {
                const { address, role, name } = JSON.parse(storedAuth)
                setAddress(address)
                setRole(role)
                setName(name)  // Set the name from localStorage
                setIsAuthenticated(true)
                router.push(`/dashboard/${role.toLowerCase()}`)
            } catch (error) {
                localStorage.removeItem('web3Auth')
            }
        } else {
        }
    }, [router])

    // Configurar listener para cambios en las cuentas
    useEffect(() => {
        if (!(window as any).ethereum) {
            return
        }


        (window as any).ethereum.on('accountsChanged', handleAccountsChanged)

        return () => {

            (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
    }, [handleAccountsChanged])
    return (
        <Web3Context.Provider value={{
            address,
            role,
            name,
            isAuthenticated,
            connect,
            disconnect
        }}>
            {children}
        </Web3Context.Provider>
    )
}
export const useWeb3 = () => {
    const context = useContext(Web3Context)
    if (!context) throw new Error('useWeb3 must be used within a Web3Provider')
    return context
}
