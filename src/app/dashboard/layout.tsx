'use client'

import { useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import BubbleBackground from '@/components/ui/BubbleBackground'
import Header from '@/components/ui/Header'
import Link from 'next/link'
import { useWeb3 } from '@/context/Web3Context'

interface LayoutProps {
    children: ReactNode
}

export default function DashboardLayout({ children }: LayoutProps) {
    const [account, setAccount] = useState('')
    const { role } = useWeb3()


    const renderNavigation = () => {
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
                            <li>
                                <Link href="/dashboard/admin" className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2">
                                    <span className="font-medium">Panel Principal</span>
                                </Link>
                            </li>
                            <div className="border-t border-olive-200 my-4 opacity-50" />
                            <li>
                                <Link href="/dashboard/admin/adduser" className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2">
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
                            <li>
                                <Link
                                    href="/dashboard/productor"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200"
                                >
                                    <span className="font-medium">Panel Principal</span>
                                </Link>
                            </li>
                            <div className="border-t border-olive-200 my-4 opacity-50" />
                            <li>
                                <Link
                                    href="/dashboard/productor/crear-producto"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200"
                                >
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
                            <li>
                                <Link
                                    href="/dashboard/fabrica"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200"
                                >
                                    <span className="font-medium">Panel Principal</span>
                                </Link>
                            </li>
                            <div className="border-t border-olive-200 my-4 opacity-50" />
                            <li>
                                <Link
                                    href="/dashboard/fabrica/procesar"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200"
                                >
                                    <span className="font-medium">Procesar Aceite</span>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                )
            case 'distribuidor':
                return (
                    <nav className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-olive-800">Panel de Distribuidor</h2>
                            <p className="text-sm text-olive-600">Distribución de Aceite</p>
                        </div>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="/dashboard/distribuidor"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200"
                                >
                                    <span className="font-medium">Panel Principal</span>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                )
            case 'mayorista':
                return (
                    <nav className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-olive-800">Panel de Mayorista</h2>
                            <p className="text-sm text-olive-600">Gestión de Ventas al Mayor</p>
                        </div>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="/dashboard/mayorista"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200"
                                >
                                    <span className="font-medium">Panel Principal</span>
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
                            <li>
                                <Link
                                    href="/dashboard/minorista"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200"
                                >
                                    <span className="font-medium">Panel Principal</span>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                )
            // Add similar sections for other roles
        }
    }

    return (
        <div className="min-h-screen bg-olive-50">
            <Header />
            <BubbleBackground />
            <div className="pt-[73px]">
                <div className="relative">
                    <div className="flex">
                        <aside className="fixed left-0 top-[73px] h-[calc(100vh-73px)] w-64 backdrop-blur-sm bg-white/80 border-r border-olive-200 shadow-lg">
                            {renderNavigation()}
                        </aside>
                        <main className="flex-1 ml-64 p-6 shadow-sm bg-white/50 backdrop-blur-sm rounded-lg">
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </div>
    )
}
