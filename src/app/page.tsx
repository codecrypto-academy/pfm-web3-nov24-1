'use client';

import BubbleBackground from '@/components/ui/BubbleBackground'
import QRScanner from '@/components/ui/QRScanner'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function Home() {
  const [showScanner, setShowScanner] = useState(false)

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <BubbleBackground />
      <main className="z-10">
        <div className="text-center mb-12">
          <h1 className="custom-heading mb-4">
            Trazabilidad de Aceite
          </h1>
          <p className="custom-subtitle">
            Escanea el código QR de tu producto
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-8 max-w-4xl">
          <div className="bg-oil-light/30 backdrop-blur-sm rounded-2xl p-8 flex flex-col items-center gap-4">
            {showScanner ? (
              <QRScanner />
            ) : (
              <div
                className="custom-button rounded-drop border border-solid border-transparent transition-colors flex items-center justify-center bg-oil hover:bg-oil-dark gap-2 h-32 w-32 shadow-oil cursor-pointer"
                onClick={() => setShowScanner(true)}
              >
                <QrCodeIcon className="qr-button" />
              </div>
            )}
          </div>

          <div className="bg-olive-light/30 backdrop-blur-sm rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="custom-button rounded-drop border border-solid border-transparent transition-colors flex items-center justify-center bg-oil hover:bg-oil-dark gap-2 h-12 px-8 shadow-oil cursor-pointer">
              Acceso Empresas
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
