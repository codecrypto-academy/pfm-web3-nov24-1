'use client'

import { useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import BubbleBackground from '@/components/ui/BubbleBackground'
import Header from '@/components/ui/Header'
import Link from 'next/link'

interface LayoutProps {
    children: ReactNode
}

export default function DashboardLayout({ children }: LayoutProps) {
    const [account, setAccount] = useState('')
    const [role, setRole] = useState('Admin')

    useEffect(() => {
        const getAccount = async () => {
            if (window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum)
                const accounts = await provider.send("eth_requestAccounts", [])
                setAccount(accounts[0])
            }
        }
        getAccount()
    }, [])

    const renderNavigation = () => {
        switch (role) {
            case 'Admin':
                return (
                    <nav className="p-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-olive-800">Panel de Control</h2>
                            <p className="text-sm text-olive-600">Administración</p>
                        </div>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="/dashboard/admin"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2"
                                >
                                    <span className="font-medium">Panel Principal</span>
                                </Link>
                            </li>
                            <div className="border-t border-olive-200 my-4" />
                            <li>
                                <Link
                                    href="/dashboard/admin/adduser"
                                    className="flex items-center text-olive-700 hover:bg-olive-100 rounded-lg p-3 transition-colors duration-200 gap-2"
                                >
                                    <span className="font-medium">Añadir Usuario</span>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                )
            case 'Productor':
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
                                    Mi Panel
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
            <Header role={role} account={account} />
            <div className="pt-[73px]">
                <div className="relative">
                    <BubbleBackground />
                    <div className="flex">
                        <aside className="fixed left-0 top-[73px] h-[calc(100vh-73px)] w-64 backdrop-blur-sm bg-white/80 border-r border-olive-200 shadow-lg">
                            {renderNavigation()}
                        </aside>
                        <main className="flex-1 ml-64 p-6">
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        </div>
    )
}
