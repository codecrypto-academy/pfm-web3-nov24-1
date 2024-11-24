'use client'

import { useRouter } from 'next/navigation'
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { useWeb3 } from '@/context/Web3Context'

export default function Header() {
    const router = useRouter()
    const { role, address, name, disconnect } = useWeb3()

    const handleLogout = () => {
        disconnect()
        router.push('/')
    }

    return (
        <header className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-50 border-b border-olive-100">
            <div className="max-w-[2000px] mx-auto px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <h1 className="text-xl font-bold text-olive-800 tracking-tight">
                        Trazabilidad de Aceite
                    </h1>
                    <div className="h-6 w-px bg-olive-200 hidden sm:block" />
                    <span className="text-olive-600 hidden sm:block">
                        {role && role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-olive-50/50 rounded-full py-1.5 px-3 border border-olive-100">
                        <UserCircleIcon className="w-5 h-5 text-olive-500 mr-2" />
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-medium text-olive-800">
                                {name}
                            </span>
                            {address && (
                                <span className="text-xs text-olive-500 font-mono">
                                    {`${address.slice(0, 6)}...${address.slice(-4)}`}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-full hover:bg-olive-100/80 transition-colors duration-200 text-olive-600 hover:text-olive-800 relative group"
                        title="Cerrar sesión"
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        <span className="absolute hidden group-hover:block right-0 translate-x-2 top-full mt-1 text-xs font-medium bg-olive-800 text-white py-1 px-2 rounded shadow-lg whitespace-nowrap">
                            Cerrar sesión
                        </span>
                    </button>
                </div>
            </div>
        </header>
    )
}
