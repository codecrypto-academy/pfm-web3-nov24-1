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
    isUnregistered: boolean
    isLoading: boolean
    error: string | null
    networkName: string
    connect: () => Promise<void>
    disconnect: () => void
}

const SUPPORTED_NETWORKS = {
    sepolia: 11155111,
    // Add other networks as needed
}

const Web3Context = createContext<Web3ContextType | null>(null)

export function Web3Provider({ children }: { children: React.ReactNode }) {
    const [address, setAddress] = useState('')
    const [role, setRole] = useState('')
    const [name, setName] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isUnregistered, setIsUnregistered] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [networkName, setNetworkName] = useState('')
    const router = useRouter()

    const disconnect = useCallback(() => {
        setAddress('')
        setRole('')
        setName('')
        setIsAuthenticated(false)
        setError(null)
        setNetworkName('')
        localStorage.removeItem('web3Auth')
        router.push('/')
    }, [router])

    const checkNetwork = useCallback(async (): Promise<boolean> => {
        if (!(window as any).ethereum) {
            setError('Please install MetaMask')
            return false
        }

        try {
            const chainId = await (window as any).ethereum.request({ 
                method: 'eth_chainId' 
            })
            const networkId = parseInt(chainId, 16)

            // Check if we're on a supported network
            const isSupported = Object.values(SUPPORTED_NETWORKS).includes(networkId)
            if (!isSupported) {
                setError('Please connect to Sepolia testnet')
                try {
                    await (window as any).ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x' + SUPPORTED_NETWORKS.sepolia.toString(16) }],
                    })
                    return true
                } catch (switchError: any) {
                    if (switchError.code === 4902) {
                        setError('Please add Sepolia network to MetaMask')
                    }
                    return false
                }
            }

            // Set network name
            setNetworkName(
                Object.entries(SUPPORTED_NETWORKS).find(
                    ([, id]) => id === networkId
                )?.[0] || 'unknown'
            )
            return true
        } catch (error) {
            console.error('Error checking network:', error)
            setError('Failed to check network')
            return false
        }
    }, [])

    const handleAccountsChanged = useCallback(async (accounts: string[]) => {
        setError(null)
        
        if (!await checkNetwork()) {
            return
        }

        if (!accounts.length) {
            disconnect()
            return
        }

        const newAddress = accounts[0]
        if (newAddress === address && isAuthenticated) {
            return
        }

        setIsLoading(true)
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            const signer = await provider.getSigner()
            const contract = new ethers.Contract(
                CONTRACTS.PARTICIPANTES.ADDRESS,
                CONTRACTS.PARTICIPANTES.ABI,
                signer
            )

            const usuarios = await contract.getUsuarios()
            const userFound = usuarios.find(
                (u: any) => u.direccion.toLowerCase() === newAddress.toLowerCase()
            )

            if (userFound && userFound.activo) {
                setIsUnregistered(false)
                const newRole = userFound.rol
                const newName = userFound.nombre

                setAddress(newAddress)
                setRole(newRole)
                setName(newName)
                setIsAuthenticated(true)

                localStorage.setItem('web3Auth', JSON.stringify({
                    address: newAddress,
                    role: newRole,
                    name: newName
                }))

                router.push(`/dashboard/${newRole.toLowerCase()}`)
            } else {
                disconnect()
                setIsUnregistered(true)
                setAddress(newAddress)
            }
        } catch (error) {
            console.error('Error in handleAccountsChanged:', error)
            setError('Failed to authenticate user')
            disconnect()
        } finally {
            setIsLoading(false)
        }
    }, [address, router, disconnect, isAuthenticated, checkNetwork])

    const connect = useCallback(async () => {
        if (!(window as any).ethereum) {
            setError('Please install MetaMask')
            return
        }

        setIsLoading(true)
        setError(null)
        
        try {
            if (!await checkNetwork()) {
                return
            }

            const accounts = await (window as any).ethereum.request({
                method: 'eth_requestAccounts'
            })

            await handleAccountsChanged(accounts)
        } catch (error: any) {
            console.error('Connection error:', error)
            if (error.code === 4001) {
                setError('Please connect your wallet')
            } else {
                setError('Failed to connect wallet')
            }
            disconnect()
        } finally {
            setIsLoading(false)
        }
    }, [handleAccountsChanged, checkNetwork, disconnect])

    useEffect(() => {
        // Restore session from localStorage
        const savedAuth = localStorage.getItem('web3Auth')
        if (savedAuth) {
            const { address: savedAddress, role: savedRole, name: savedName } = JSON.parse(savedAuth)
            setAddress(savedAddress)
            setRole(savedRole)
            setName(savedName)
            setIsAuthenticated(true)
        }

        // Setup event listeners
        if ((window as any).ethereum) {
            (window as any).ethereum.on('accountsChanged', handleAccountsChanged)
            (window as any).ethereum.on('chainChanged', () => {
                window.location.reload()
            })
            (window as any).ethereum.on('disconnect', disconnect)
        }

        return () => {
            if ((window as any).ethereum) {
                (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged)
                (window as any).ethereum.removeListener('chainChanged', () => {})
                (window as any).ethereum.removeListener('disconnect', disconnect)
            }
        }
    }, [handleAccountsChanged, disconnect])

    return (
        <Web3Context.Provider
            value={{
                address,
                role,
                name,
                isAuthenticated,
                isUnregistered,
                isLoading,
                error,
                networkName,
                connect,
                disconnect,
            }}
        >
            {children}
        </Web3Context.Provider>
    )
}

export function useWeb3() {
    const context = useContext(Web3Context)
    if (!context) {
        throw new Error('useWeb3 must be used within a Web3Provider')
    }
    return context
}
