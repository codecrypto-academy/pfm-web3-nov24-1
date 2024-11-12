'use client'

import { useRouter } from 'next/navigation'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

export interface HeaderProps {
    role: string
    account: string
}

export default function Header({ role, account }: HeaderProps) {
    const router = useRouter()

    return (
        <header className="fixed top-0 left-0 w-full shadow-lg z-50 header-container">
            <div className="header-content">
                <span className="custom-heading">
                    Trazabilidad de Aceite
                </span>
                <div className="header-info-container">
                    <div className="header-text-container">
                        <span className="header-role">
                            {role}:
                        </span>
                        <span className="header-account">
                            {account}
                        </span>
                    </div>
                    <button
                        className="header-icon-btn p-2 rounded-lg hover:bg-olive-dark/10 transition-colors"
                        onClick={() => router.push('/')}
                    >
                        <ArrowRightOnRectangleIcon className="header-icon w-6 h-6" />
                    </button>
                </div>
            </div>
        </header>
    )
}
