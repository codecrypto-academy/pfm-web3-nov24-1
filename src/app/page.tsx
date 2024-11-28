'use client'

import BubbleBackground from '@/components/ui/BubbleBackground'
import QRScanner from '@/components/ui/QRScanner'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { useRouter } from 'next/navigation'
import RegisterForm from '@/components/FormularioRegistro'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import Stats from '@/components/landing/Stats'
import Testimonials from '@/components/landing/Testimonials'
import FloatingNav from '@/components/landing/FloatingNav'

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
    <div className="relative min-h-screen w-full">
      <BubbleBackground />
      <FloatingNav />
      
      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <Features />

      {/* How it Works Section */}
      <HowItWorks />

      {/* Stats Section */}
      <Stats />

      {/* Testimonials Section */}
      <Testimonials />

      {/* Original Functionality */}
      <main id="action-section" className="relative z-20 w-full max-w-7xl mx-auto px-4 py-24 bg-gradient-to-b from-white to-green-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-green-900 mb-4">
            Comienza Ahora
          </h2>
          <p className="text-xl text-green-800">
            Escanea el código QR de tu producto o accede como empresa
          </p>
        </div>

        <div className="flex flex-col items-center gap-8 max-w-4xl mx-auto">
          {isUnregistered ? (
            <RegisterForm />
          ) : (
            <>
              <div className="w-full max-w-lg mx-auto flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-8 shadow-lg hover:shadow-xl transition-shadow">
                {showScanner ? (
                  <QRScanner onResult={handleQRResult} />
                ) : (
                  <div
                    className="qr-button-container cursor-pointer w-full max-w-xs aspect-square flex items-center justify-center group"
                    onClick={() => setShowScanner(true)}
                  >
                    <QrCodeIcon className="qr-button text-green-600 w-24 h-24 sm:w-32 sm:h-32 group-hover:scale-110 transition-transform" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center backdrop-blur-sm rounded-2xl p-8">
                <button
                  onClick={connect}
                  className="px-8 py-4 bg-green-600 text-white rounded-full text-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 group"
                  type="button"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isAuthenticated ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Acceso Empresas'}
                    {!isAuthenticated && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
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
