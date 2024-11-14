'use client'

import { useRouter } from 'next/navigation'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useWeb3 } from '@/context/Web3Context'

export default function Header() {
    const router = useRouter()
    const { role, address, name, disconnect } = useWeb3()
    console.log("Header values:", { role, address, name })

    const handleLogout = () => {
        disconnect()
        router.push('/')
    }

    return (
        <header className="fixed top-0 left-0 w-full shadow-lg z-50 header-container">
            <div className="header-content">
                <span className="custom-heading">
                    Trazabilidad de Aceite
                </span>
                <div className="header-info-container">
                    <div className="header-text-container">
                        <span className="header-role">
                            {name}:
                        </span>
                        <span className="header-account">
                            {address && `${address.slice(0, 6)}...${address.slice(-4)}`}
                        </span>
                    </div>
                    <button
                        className="header-icon-btn p-2 rounded-lg hover:bg-olive-dark/10 transition-colors"
                        onClick={handleLogout}
                    >
                        <ArrowRightOnRectangleIcon className="header-icon w-6 h-6" />
                    </button>
                </div>
            </div>
        </header>
    )
}
