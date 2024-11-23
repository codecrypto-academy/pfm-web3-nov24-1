'use client'

import { useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import BubbleBackground from '@/components/ui/BubbleBackground'
import Header from '@/components/ui/Header'
import Link from 'next/link'
import { useWeb3 } from '@/context/Web3Context'
import { useRouter } from 'next/navigation'
import { HomeIcon, ClockIcon, PlusIcon, TruckIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { CONTRACTS } from '@/constants/contracts'

interface LayoutProps {
    children: ReactNode
}

export default function DashboardLayout({ children }: LayoutProps) {
    const [account, setAccount] = useState('')
    const { role, isAuthenticated, isLoading, address } = useWeb3()
    const [pendingTransfers, setPendingTransfers] = useState(0)
    const [isMenuOpen, setIsMenuOpen] = useState(true)
    const router = useRouter()

    // Función para cargar las transferencias pendientes para la fábrica
    const loadPendingTransfers = async () => {
        if (!address || role !== 'fabrica') {
            console.log('No loading transfers:', { address, role })
            return
        }

        try {
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
        }
    }

    useEffect(() => {
        if (address && role === 'fabrica') {
            console.log('Setting up transfer monitoring for factory')
            loadPendingTransfers()
            
            // Actualizar cada 30 segundos
            const interval = setInterval(loadPendingTransfers, 30000)
            return () => clearInterval(interval)
        }
    }, [address, role])

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/')
        }
    }, [isLoading, isAuthenticated, router])

    // Mostrar un estado de carga mientras se verifica la autenticación
    if (isLoading) {
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
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-olive-800">Panel de Fábrica</h2>
                            <p className="text-sm text-olive-600">Procesamiento de Aceite</p>
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
                                    href="/dashboard/fabrica/transferencias"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2"
                                >
                                    <TruckIcon className="w-5 h-5" />
                                    <span className="font-medium">Transferencias</span>
                                    {pendingTransfers > 0 && (
                                        <span className="ml-auto bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-medium">
                                            {pendingTransfers}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        </ul>
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
        </div>
    )
}
