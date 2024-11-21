'use client'

import BubbleBackground from '@/components/ui/BubbleBackground'
import QRScanner from '@/components/ui/QRScanner'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useWeb3 } from '@/context/Web3Context'
import { useRouter } from 'next/navigation'
import RegisterForm from '@/components/RegisterForm'
import { fetchProductCount, fetchProductData } from '@/utils/blockchain'

export default function Home() {
  const [showScanner, setShowScanner] = useState(false)
  const [manualCode, setManualCode] = useState('') // State for manual code input
  const [productCount, setProductCount] = useState(0) // Total products in blockchain
  const { address, isAuthenticated, isUnregistered, connect, role } = useWeb3()
  const router = useRouter()

  useEffect(() => {
    const loadProductCount = async () => {
      try {
        const count = await fetchProductCount()
        setProductCount(count)
      } catch (error) {
        console.error('Error fetching product count:', error)
        alert('Hubo un error al obtener la cantidad de productos. Por favor, inténtelo más tarde.')
      }
    }
    loadProductCount()

    if (isAuthenticated && role) {
      router.push(`/dashboard/${role.toLowerCase()}`)
    }
  }, [isAuthenticated, role])

  const handleQRResult = async (result: string) => {
    try {
      console.log('QR Result:', result)
      setShowScanner(false)
      await fetchProductData(result) // Fetch data using QR result
    } catch (error) {
      alert('Hubo un error al procesar el código QR.')
      console.error(error)
    }
  }

  const handleManualSubmit = async () => {
    try {
      if (manualCode.trim()) {
        const productId = parseInt(manualCode, 10)

        if (isNaN(productId) || productId < 0) {
          alert('El ID introducido no es válido. Por favor, introduce un número positivo.')
          return
        }

        if (productId >= productCount) {
          alert(
            `Actualmente tenemos ${productCount} registro${productCount > 1 ? 's' : ''}. El número que has indicado sobrepasa los límites.`
          )
          return
        }

        await fetchProductData(productId.toString()) // Fetch data using manual code
      } else {
        alert('Por favor, introduce un código válido.')
      }
    } catch (error) {
      alert('Hubo un error al procesar el código manual.')
      console.error(error)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center">
      <BubbleBackground />
      <main className="relative z-20 w-full max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="custom-heading mb-4">Trazabilidad de Aceite</h1>
          <p className="custom-subtitle">Escanea el código QR de tu producto o ingresa el código manualmente</p>
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

              {/* Manual Code Input */}
              <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4 bg-oil-light/30 backdrop-blur-sm rounded-2xl p-4 sm:p-8">
                <p className="text-center text-sm text-gray-700">Si no puedes escanear el código QR, introduce el código manualmente:</p>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Introduce el código aquí"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleManualSubmit}
                  className="company-access-btn"
                  type="button"
                >
                  Consultar Código
                </button>
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
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
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
