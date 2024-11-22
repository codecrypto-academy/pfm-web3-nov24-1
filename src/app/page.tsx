'use client'

import BubbleBackground from '@/components/ui/BubbleBackground'
import QRScanner from '@/components/ui/QRScanner'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { useRouter } from 'next/navigation'
import RegisterForm from '@/components/RegisterForm'

export default function Home() {
  const [showScanner, setShowScanner] = useState(false)
  const { address, isAuthenticated, isUnregistered, connect, role } = useWeb3()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && role) {
      router.push(`/dashboard/${role.toLowerCase()}`)
    }
  }, [isAuthenticated, role, router])

  const handleQRResult = async (result: string) => {
    // Handle the QR code result here
    console.log(result)
      setShowScanner(false)
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center">
      <BubbleBackground />
      <main className="relative z-20 w-full max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="custom-heading mb-4">
            Trazabilidad de Aceite
          </h1>
          <p className="custom-subtitle">
            Escanea el código QR de tu producto
          </p>
        </div>

        <div className="flex flex-col items-center gap-8 max-w-4xl mx-auto">
          {isUnregistered ? (
            <RegisterForm />
          ) : (
            <>
              <div className="w-full max-w-lg mx-auto flex items-center justify-center bg-oil-light/30 backdrop-blur-sm rounded-2xl p-4 sm:p-8">
                {showScanner ? (
                  <QRScanner onResult={handleQRResult} />
                ) : (
                  <div
                    className="qr-button-container cursor-pointer w-full max-w-xs aspect-square flex items-center justify-center"
                    onClick={() => setShowScanner(true)}
                  >
                    <QrCodeIcon className="qr-button text-blue-900 w-24 h-24 sm:w-32 sm:h-32" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center backdrop-blur-sm rounded-2xl p-8">
                <button
                  onClick={connect}
                  className="company-access-btn"
                  type="button"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isAuthenticated ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Acceso Empresas'}
                    {!isAuthenticated && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    )}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
