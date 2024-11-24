'use client'

import { useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import BubbleBackground from '@/components/ui/BubbleBackground'
import Header from '@/components/ui/Header'
import Footer from '@/components/ui/Footer'; 
import Link from 'next/link'
import { useWeb3 } from '@/context/Web3Context'
import { useRouter } from 'next/navigation'
import { HomeIcon, ClockIcon, PlusIcon, TruckIcon, Bars3Icon, XMarkIcon, CogIcon } from '@heroicons/react/24/outline'
import { CONTRACTS } from '@/constants/contracts'

interface LayoutProps {
    children: ReactNode
}

export default function DashboardLayout({ children }: LayoutProps) {
    const [account, setAccount] = useState('')
    const { role, isAuthenticated, isLoading: authLoading, address } = useWeb3()
    const [pendingTransfers, setPendingTransfers] = useState(0)
    const [isMenuOpen, setIsMenuOpen] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    // Función para cargar las transferencias pendientes para la fábrica
    const loadPendingTransfers = async () => {
        if (!address || role !== 'fabrica' || isLoading) {
            console.log('No loading transfers:', { address, role, isLoading })
            return
        }

        try {
            setIsLoading(true)
            console.log('Loading pending transfers for factory:', address)
            const provider = new ethers.BrowserProvider(window.ethereum)
            const tokensContract = new ethers.Contract(
                CONTRACTS.Tokens.address,
                CONTRACTS.Tokens.abi,
                provider
            )

            // Obtener transferencias pendientes usando la función del contrato
            const pendingTransferIds = await tokensContract.getTransferenciasPendientes(address)
            console.log('Pending transfers found:', pendingTransferIds.length)
            
            setPendingTransfers(pendingTransferIds.length)
        } catch (error) {
            console.error('Error al cargar transferencias pendientes:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        let isMounted = true
        let intervalId: NodeJS.Timeout | null = null

        const setupTransferMonitoring = async () => {
            if (address && role === 'fabrica' && isMounted) {
                console.log('Setting up transfer monitoring for factory')
                await loadPendingTransfers()
                
                // Actualizar cada 5 segundos
                intervalId = setInterval(async () => {
                    if (isMounted && !isLoading) {
                        await loadPendingTransfers()
                    }
                }, 5000)
            }
        }

        setupTransferMonitoring()

        // Cleanup function
        return () => {
            isMounted = false
            if (intervalId) {
                clearInterval(intervalId)
            }
        }
    }, [address, role])

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/')
        }
    }, [authLoading, isAuthenticated, router])

    // Mostrar un estado de carga mientras se verifica la autenticación
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-olive-600"></div>
            </div>
        )
    }

    // No mostrar nada si no está autenticado (evita el flash de contenido)
    if (!isAuthenticated) {
        return null
    }

    const renderNavigation = () => {
        if (!role) return null;

        const commonNavItems = [
            {
                name: 'Panel Principal',
                href: `/dashboard/${role.toLowerCase()}`,
                icon: HomeIcon,
            },
            {
                name: 'Historial de Transacciones',
                href: `/dashboard/${role.toLowerCase()}/transactions`,
                icon: ClockIcon,
            },
        ]

        switch (role.toLowerCase()) {
            case 'admin':
                return (
                    <nav className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-olive-800">
                                Panel de Control
                            </h2>
                            <p className="text-sm text-olive-600">Administración</p>
                        </div>
                        <ul className="space-y-2">
                            {commonNavItems.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2"
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.name}</span>
                                    </Link>
                                </li>
                            ))}
                            <div className="border-t border-olive-200 my-4 opacity-50" />
                            <li>
                                <Link href="/dashboard/admin/adduser" className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2">
                                    <PlusIcon className="w-5 h-5" />
                                    <span className="font-medium">Añadir Usuario</span>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                )
            case 'productor':
                return (
                    <nav className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-olive-800">Panel de Productor</h2>
                            <p className="text-sm text-olive-600">Gestión de Olivos</p>
                        </div>
                        <ul className="space-y-2">
                            {commonNavItems.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2"
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.name}</span>
                                    </Link>
                                </li>
                            ))}
                            <div className="border-t border-olive-200 my-4 opacity-50" />
                            <li>
                                <Link
                                    href="/dashboard/productor/crear-producto"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span className="font-medium">Crear Producto</span>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                )
            case 'fabrica':
                return (
                    <nav className="p-6">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-olive-800 tracking-tight">
                                Panel de Fábrica
                            </h2>
                            <p className="text-sm text-olive-600/80 mt-1">Procesamiento de Aceite</p>
                        </div>
                        <div className="space-y-2">
                            <div className="mb-2">
                                <p className="text-sm font-medium text-olive-600 mb-2 px-3">General</p>
                                <ul className="space-y-1">
                                    {commonNavItems.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className="flex items-center text-olive-700 hover:bg-olive-100/80 hover:text-olive-900 rounded-xl p-3.5 transition-all duration-300 ease-in-out gap-3 group relative"
                                            >
                                                <item.icon className="w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110" />
                                                <span className="font-medium">{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="border-t border-olive-200 my-4"></div>
                            
                            <div>
                                <p className="text-sm font-medium text-olive-600 mb-2 px-3">Gestión de Productos</p>
                                <ul className="space-y-1">
                                    <li>
                                        <Link
                                            href="/dashboard/fabrica/procesar"
                                            className="flex items-center text-olive-700 hover:bg-olive-100/80 hover:text-olive-900 rounded-xl p-3.5 transition-all duration-300 ease-in-out gap-3 group relative"
                                        >
                                            <CogIcon className="w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-45" />
                                            <span className="font-medium">Procesar Productos</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/dashboard/fabrica/transferencias"
                                            className="flex items-center text-olive-700 hover:bg-olive-100/80 hover:text-olive-900 rounded-xl p-3.5 transition-all duration-300 ease-in-out gap-3 group relative"
                                        >
                                            <TruckIcon className="w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110 group-hover:-translate-x-1" />
                                            <span className="font-medium">Transferencias</span>
                                            {pendingTransfers > 0 && (
                                                <span className="ml-auto bg-red-100 text-red-600 px-2.5 py-1 rounded-full text-xs font-semibold min-w-[24px] text-center shadow-sm">
                                                    {pendingTransfers}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </nav>
                )
            case 'minorista':
                return (
                    <nav className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-olive-800">Panel de Minorista</h2>
                            <p className="text-sm text-olive-600">Venta al Público</p>
                        </div>
                        <ul className="space-y-2">
                            {commonNavItems.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2"
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.name}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )
        }
    }

    return (
        <div className="min-h-screen bg-olive-50">
            <Header />
            <BubbleBackground />
            <div className="pt-[73px]">
                <div className="relative">
                    {/* Botón para mostrar/ocultar menú */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`fixed z-20 top-[85px] p-2 bg-white/80 backdrop-blur-sm border border-olive-200 rounded-r-lg shadow-lg transition-all duration-300 ${
                            isMenuOpen ? 'left-64' : 'left-0'
                        }`}
                    >
                        {isMenuOpen ? (
                            <XMarkIcon className="w-6 h-6 text-olive-600" />
                        ) : (
                            <Bars3Icon className="w-6 h-6 text-olive-600" />
                        )}
                    </button>

                    <div className="flex">
                        {/* Menú lateral con animación */}
                        <aside 
                            className={`fixed left-0 top-[73px] h-[calc(100vh-73px)] w-64 backdrop-blur-sm bg-white/80 border-r border-olive-200 shadow-lg transition-transform duration-300 ${
                                isMenuOpen ? 'translate-x-0' : '-translate-x-full'
                            }`}
                        >
                            {renderNavigation()}
                        </aside>

                        {/* Contenido principal con animación */}
                        <main 
                            className={`flex-1 p-6 shadow-sm bg-white/50 backdrop-blur-sm rounded-lg transition-all duration-300 ${
                                isMenuOpen ? 'ml-64' : 'ml-0'
                            }`}
                        >
                            {children}
                        </main>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
