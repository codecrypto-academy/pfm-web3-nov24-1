'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'
import { useRouter } from 'next/navigation'

// Network configuration
const SUPPORTED_NETWORKS = {
    anvil: 31337,  // Local Anvil network
} as const

// Types for better type safety
type NetworkType = keyof typeof SUPPORTED_NETWORKS
type UserData = {
    direccion: string
    nombre: string
    gps: string
    rol: string
    activo: boolean
}

type Web3Error = {
    code: number
    message: string
    type: 'wallet' | 'network' | 'contract' | 'storage'
}

export type Web3ContextType = {
    address: string
    role: string
    name: string
    isAuthenticated: boolean
    isUnregistered: boolean
    isLoading: boolean
    error: Web3Error | null
    networkName: NetworkType | 'unknown'
    connect: () => Promise<void>
    disconnect: () => void
}

const Web3Context = createContext<Web3ContextType | null>(null)

export function Web3Provider({ children }: { children: React.ReactNode }) {
    const [address, setAddress] = useState('')
    const [role, setRole] = useState('')
    const [name, setName] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isUnregistered, setIsUnregistered] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Web3Error | null>(null)
    const [networkName, setNetworkName] = useState<NetworkType | 'unknown'>('unknown')
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
    const router = useRouter()

    const setWeb3Error = (message: string, type: Web3Error['type'], code: number = 0) => {
        setError({ message, type, code })
    }

    const disconnect = useCallback(() => {
        setAddress('')
        setRole('')
        setName('')
        setIsAuthenticated(false)
        setError(null)
        setNetworkName('unknown')
        setProvider(null)
        try {
            localStorage.removeItem('web3Auth')
        } catch (error) {
            console.error('Failed to clear localStorage:', error)
        }
        router.push('/')
    }, [router])

    const initializeProvider = useCallback(async () => {
        if (!(window as any).ethereum) {
            setWeb3Error('Please install MetaMask', 'wallet')
            return null
        }
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum)
            setProvider(provider)
            return provider
        } catch (error) {
            setWeb3Error('Failed to initialize provider', 'wallet')
            return null
        }
    }, [])

    const checkNetwork = useCallback(async (): Promise<boolean> => {
        let currentProvider = provider
        if (!currentProvider) {
            currentProvider = await initializeProvider()
            if (!currentProvider) return false
        }

        try {
            const network = await currentProvider.getNetwork()
            const networkId = Number(network.chainId) as (typeof SUPPORTED_NETWORKS)['anvil']

            const isSupported = Object.values(SUPPORTED_NETWORKS).includes(networkId)
            if (!isSupported) {
                setWeb3Error(
                    'Please connect to Anvil local network',
                    'network'
                )
                try {
                    // Try to switch to Anvil first
                    await (window as any).ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x' + SUPPORTED_NETWORKS.anvil.toString(16) }],
                    })
                    // Re-initialize provider after network switch
                    currentProvider = await initializeProvider()
                    if (!currentProvider) return false
                    return true
                } catch (switchError: any) {
                    if (switchError.code === 4902) {
                        setWeb3Error(
                            'Please add Anvil network to MetaMask (Chain ID: 31337)',
                            'network',
                            4902
                        )
                    }
                    return false
                }
            }

            const foundNetwork = Object.entries(SUPPORTED_NETWORKS).find(
                ([, id]) => id === networkId
            )
            setNetworkName(foundNetwork ? foundNetwork[0] as NetworkType : 'unknown')
            return true
        } catch (error) {
            console.error('Error checking network:', error)
            setWeb3Error('Failed to check network', 'network')
            return false
        }
    }, [provider, initializeProvider])

    const handleAccountsChanged = useCallback(async (accounts: string[]) => {
        if (accounts.length === 0) {
            disconnect()
            return
        }

        try {
            let currentProvider = provider
            if (!currentProvider) {
                currentProvider = await initializeProvider()
                if (!currentProvider) {
                    setWeb3Error('Failed to initialize provider', 'wallet')
                    return
                }
                setProvider(currentProvider)
            }

            const signer = await currentProvider.getSigner()
            const usuariosContract = new ethers.Contract(
                CONTRACTS.PARTICIPANTES.ADDRESS,
                CONTRACTS.PARTICIPANTES.ABI,
                currentProvider
            )

            try {
                const adminAddress = await usuariosContract.admin()
                const isUser = await usuariosContract.esUsuario(accounts[0])

                if (accounts[0].toLowerCase() === adminAddress.toLowerCase() || isUser) {
                    const allUsers = await usuariosContract.getUsuarios() as UserData[]
                    const currentUser = allUsers.find(user =>
                        user.direccion.toLowerCase() === accounts[0].toLowerCase()
                    )

                    if (!currentUser) {
                        setWeb3Error('User data not found', 'contract')
                        setIsAuthenticated(false)
                        return
                    }

                    // Validate user data
                    if (!currentUser.rol || !currentUser.nombre) {
                        setWeb3Error('Invalid user data', 'contract')
                        setIsAuthenticated(false)
                        return
                    }

                    setAddress(accounts[0])
                    setRole(currentUser.rol)
                    setName(currentUser.nombre)
                    setIsAuthenticated(true)
                    setIsUnregistered(false)

                    // Redirigir al usuario a su dashboard correspondiente
                    router.push(`/dashboard/${currentUser.rol.toLowerCase()}`)

                    try {
                        localStorage.setItem('web3Auth', JSON.stringify({
                            address: accounts[0],
                            role: currentUser.rol,
                            name: currentUser.nombre
                        }))
                    } catch (storageError) {
                        console.error('Failed to save auth state:', storageError)
                        setWeb3Error('Failed to save authentication state', 'storage')
                    }
                } else {
                    setIsUnregistered(true)
                    setIsAuthenticated(false)
                }
            } catch (contractError) {
                console.error('Contract interaction error:', contractError)
                setWeb3Error('Failed to interact with contract', 'contract')
                setIsAuthenticated(false)
            }
        } catch (error) {
            console.error('Provider error:', error)
            setWeb3Error('Failed to initialize Web3 provider', 'wallet')
            setIsAuthenticated(false)
        }
    }, [provider, initializeProvider, disconnect, router])

    const connect = useCallback(async () => {
        if (!(window as any).ethereum) {
            setWeb3Error('Please install MetaMask', 'wallet')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            if (!await checkNetwork()) {
                setIsLoading(false)
                return
            }

            const accounts = await (window as any).ethereum.request({
                method: 'eth_requestAccounts'
            })

            await handleAccountsChanged(accounts)
        } catch (error: any) {
            console.error('Connection error:', error)
            if (error.code === 4001) {
                setWeb3Error('Please connect your wallet', 'wallet', 4001)
            } else {
                setWeb3Error('Failed to connect wallet', 'wallet')
            }
            disconnect()
        } finally {
            setIsLoading(false)
        }
    }, [checkNetwork, disconnect, handleAccountsChanged])

    useEffect(() => {
        try {
            const savedAuth = localStorage.getItem('web3Auth')
            if (savedAuth) {
                const { address: savedAddress, role: savedRole, name: savedName } = JSON.parse(savedAuth)
                if (savedAddress && savedRole && savedName) {
                    setAddress(savedAddress)
                    setRole(savedRole)
                    setName(savedName)
                    setIsAuthenticated(true)
                }
            }
        } catch (error) {
            console.error('Failed to restore auth state:', error)
        }

        const provider = (window as any).ethereum
        if (provider) {
            provider.on('accountsChanged', handleAccountsChanged)
            provider.on('chainChanged', () => window.location.reload())
            provider.on('disconnect', disconnect)

            return () => {
                provider.removeListener('accountsChanged', handleAccountsChanged)
                provider.removeListener('chainChanged', () => window.location.reload())
                provider.removeListener('disconnect', disconnect)
            }
        }
    }, [disconnect, handleAccountsChanged])

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

export const useWeb3 = () => {
    const context = useContext(Web3Context)
    if (!context) throw new Error('useWeb3 must be used within a Web3Provider')
    return context
}
