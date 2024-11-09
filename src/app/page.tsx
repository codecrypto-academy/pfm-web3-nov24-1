'use client';

import BubbleBackground from '@/components/ui/BubbleBackground'
import QRScanner from '@/components/ui/QRScanner'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Home() {
  const [showScanner, setShowScanner] = useState(false)
  const [account, setAccount] = useState('')

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })

        setAccount(accounts[0])

        window.ethereum.on('accountsChanged', function (newAccounts: string[]) {
          setAccount(newAccounts[0])
        })

        window.ethereum.on('chainChanged', () => {
          window.location.reload()
        })

      } catch (error) {
        console.log('Error connecting to MetaMask:', error)
      }
    } else {
      window.open('https://metamask.io/download/', '_blank')
    }
  }
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
                className="qr-button-container custom-button rounded-drop transition-colors flex items-center justify-center bg-oil hover:bg-oil-dark gap-2 shadow-oil cursor-pointer"
                onClick={() => setShowScanner(true)}
              >
                <QrCodeIcon className="qr-button w-12 h-12 text-blue-900" />


              </div>
            )}
          </div>

          <div className="bg-olive-light/30 backdrop-blur-sm rounded-2xl p-8 flex flex-col items-center gap-4">
            <div
              onClick={connectWallet}
              className="company-access-btn"
            >
              <span className="flex items-center justify-center gap-2">
                {account ? 'Connected' : 'Acceso Empresas'}
                {!account && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>}
              </span>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}