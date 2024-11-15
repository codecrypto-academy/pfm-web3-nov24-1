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
    const [name, setName] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const router = useRouter()

    const disconnect = useCallback(() => {
        setAddress('')
        setRole('')
        setName('')
        setIsAuthenticated(false)
        localStorage.removeItem('web3Auth')
        router.push('/')
    }, [router])

    const handleAccountsChanged = useCallback(async (accounts: string[]) => {
        if (accounts.length === 0) {
            disconnect()
        } else if (accounts[0] !== address) {
            // First disconnect the current session
            disconnect()

            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.PARTICIPANTES.ADDRESS,
                CONTRACTS.PARTICIPANTES.ABI,
                signer
            )

            const usuarios = await contract.getUsuarios()
            const userFound = usuarios.find(
                (u: any) => u.direccion.toLowerCase() === accounts[0].toLowerCase()
            )

            if (userFound && userFound.activo) {
                const newRole = userFound.rol
                const newName = userFound.nombre

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
            } else {
                // If no valid user is found, stay disconnected
                router.push('/')
            }
        }
    }, [address, router, disconnect])


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
            }
        } catch (error) {
            console.error("Connection error:", error)
        }
    }, [handleAccountsChanged])

    useEffect(() => {
        const storedAuth = localStorage.getItem('web3Auth')
        if (storedAuth) {
            try {
                const { address, role, name } = JSON.parse(storedAuth)
                setAddress(address)
                setRole(role)
                setName(name)
                setIsAuthenticated(true)
                router.push(`/dashboard/${role.toLowerCase()}`)
            } catch (error) {
                localStorage.removeItem('web3Auth')
            }
        }
    }, [router])

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
