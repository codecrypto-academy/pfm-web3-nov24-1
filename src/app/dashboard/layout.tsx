'use client'

import { useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import BubbleBackground from '@/components/ui/BubbleBackground'
import Header from '@/components/ui/Header'

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

    return (
        <div className="min-h-screen">
            <Header role={role} account={account} />
            <div className="pt-[73px]">
                <div className="relative">
                    <BubbleBackground />
                    <div className="flex">
                        <aside className="fixed left-0 top-[73px] h-[calc(100vh-73px)] w-64 backdrop-blur-sm bg-background">
                            <nav className="p-6">
                                {/* Navigation items */}
                            </nav>
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