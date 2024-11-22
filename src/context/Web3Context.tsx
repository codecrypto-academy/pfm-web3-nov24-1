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

// Función para formatear roles
const formatRole = (role: string): string => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

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
        // Siempre desconectar cuando cambia la cuenta
        disconnect()
        
        if (accounts.length === 0) {
            return
        }

        // No intentar reconectar automáticamente
        // El usuario debe volver a conectarse manualmente
        router.push('/')
    }, [disconnect, router])

    const connect = useCallback(async () => {
        if (!(window as any).ethereum) {
            setWeb3Error('Please install MetaMask', 'wallet')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const networkValid = await checkNetwork()
            if (!networkValid) {
                return
            }

            const accounts = await (window as any).ethereum.request({
                method: 'eth_requestAccounts'
            })

            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts found')
            }

            let currentProvider = provider
            if (!currentProvider) {
                currentProvider = await initializeProvider()
                if (!currentProvider) {
                    throw new Error('Failed to initialize provider')
                }
                setProvider(currentProvider)
            }

            const usuariosContract = new ethers.Contract(
                CONTRACTS.Usuarios.address,
                CONTRACTS.Usuarios.abi,
                currentProvider
            )

            const adminAddress = await usuariosContract.admin()
            const isUser = await usuariosContract.esUsuario(accounts[0])

            if (accounts[0].toLowerCase() === adminAddress.toLowerCase() || isUser) {
                const allUsers = await usuariosContract.getUsuarios() as UserData[]
                const currentUser = allUsers.find(user =>
                    user.direccion.toLowerCase() === accounts[0].toLowerCase()
                )

                if (accounts[0].toLowerCase() === adminAddress.toLowerCase()) {
                    setRole('Admin')
                    setName('Admin')
                    setAddress(accounts[0])
                    setIsAuthenticated(true)
                    setIsUnregistered(false)
                    router.push('/dashboard/admin')
                } else if (currentUser) {
                    const userRole = currentUser.rol.toLowerCase()
                    setRole(userRole)
                    setName(currentUser.nombre)
                    setAddress(accounts[0])
                    setIsAuthenticated(true)
                    setIsUnregistered(false)
                    router.push(`/dashboard/${userRole}`)
                } else {
                    setWeb3Error('User data not found', 'contract')
                    setIsAuthenticated(false)
                    return
                }

                try {
                    localStorage.setItem('web3Auth', JSON.stringify({
                        address: accounts[0],
                        role: accounts[0].toLowerCase() === adminAddress.toLowerCase() ? 'Admin' : currentUser?.rol ? currentUser.rol.toLowerCase() : '',
                        name: accounts[0].toLowerCase() === adminAddress.toLowerCase() ? 'Admin' : currentUser?.nombre || ''
                    }))
                } catch (storageError) {
                    console.error('Failed to save auth state:', storageError)
                }
            } else {
                setIsUnregistered(true)
                setIsAuthenticated(false)
            }

        } catch (error: any) {
            console.error('Connection error:', error)
            if (error.code === 4001) {
                setWeb3Error('Please connect your wallet', 'wallet', 4001)
            } else {
                setWeb3Error(error.message || 'Failed to connect', 'wallet')
            }
            disconnect()
        } finally {
            setIsLoading(false)
        }
    }, [checkNetwork, disconnect, initializeProvider, provider, router])

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const savedAuth = localStorage.getItem('web3Auth')
                if (savedAuth) {
                    const { address: savedAddress, role: savedRole, name: savedName } = JSON.parse(savedAuth)
                    
                    // Verificar si MetaMask está disponible
                    if (!window.ethereum) {
                        throw new Error('MetaMask not available')
                    }

                    // Obtener la cuenta actual de MetaMask
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
                    const currentAddress = accounts[0]?.toLowerCase()

                    if (currentAddress && currentAddress === savedAddress.toLowerCase()) {
                        // Verificar que la red es correcta
                        const networkValid = await checkNetwork()
                        if (!networkValid) {
                            throw new Error('Invalid network')
                        }

                        // Verificar que el usuario sigue siendo válido y activo
                        let currentProvider = provider
                        if (!currentProvider) {
                            currentProvider = await initializeProvider()
                            if (!currentProvider) {
                                throw new Error('Failed to initialize provider')
                            }
                        }

                        const usuariosContract = new ethers.Contract(
                            CONTRACTS.Usuarios.address,
                            CONTRACTS.Usuarios.abi,
                            currentProvider
                        )

                        const adminAddress = await usuariosContract.admin()
                        const isUser = await usuariosContract.esUsuario(currentAddress)
                        const isActive = isUser ? await usuariosContract.estaActivo(currentAddress) : false

                        if ((currentAddress === adminAddress.toLowerCase()) || (isUser && isActive)) {
                            setAddress(savedAddress)
                            setRole(savedRole)
                            setName(savedName)
                            setIsAuthenticated(true)
                            setIsUnregistered(false)
                            
                            // Solo redirigir si no estamos ya en la ruta correcta
                            const targetRoute = `/dashboard/${savedRole.toLowerCase()}`
                            if (window.location.pathname !== targetRoute) {
                                router.push(targetRoute)
                            }
                        } else {
                            throw new Error('User no longer valid or inactive')
                        }
                    } else {
                        throw new Error('Account mismatch or not connected')
                    }
                }
            } catch (error) {
                console.error('Failed to restore auth state:', error)
                localStorage.removeItem('web3Auth')
                setIsAuthenticated(false)
                setAddress('')
                setRole('')
                setName('')
                router.push('/')
            } finally {
                setIsLoading(false)
            }
        }

        // Establecer isLoading inmediatamente
        setIsLoading(true)

        // Inicializar autenticación solo si window.ethereum está disponible
        if (window?.ethereum) {
            // Configurar event listeners
            const handleChainChanged = () => {
                window.location.reload()
            }
            
            window.ethereum.setMaxListeners(20)
            window.ethereum.on('accountsChanged', handleAccountsChanged)
            window.ethereum.on('chainChanged', handleChainChanged)
            window.ethereum.on('disconnect', disconnect)

            // Inicializar autenticación
            initializeAuth()

            // Cleanup function
            return () => {
                if (window.ethereum?.removeListener) {
                    window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
                    window.ethereum.removeListener('chainChanged', handleChainChanged)
                    window.ethereum.removeListener('disconnect', disconnect)
                }
            }
        } else {
            // Si no hay window.ethereum, terminar la carga
            setIsLoading(false)
            router.push('/')
        }
    }, [disconnect, handleAccountsChanged, checkNetwork, provider, initializeProvider, router])

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
