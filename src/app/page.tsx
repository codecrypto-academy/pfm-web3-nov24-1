'use client';

import BubbleBackground from '@/components/ui/BubbleBackground'
import QRScanner from '@/components/ui/QRScanner'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/constants/contracts'

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Home() {
  const [showScanner, setShowScanner] = useState(false)
  const [account, setAccount] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const router = useRouter()

  const checkParticipantRole = async (address: string) => {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const participantesContract = new ethers.Contract(
      CONTRACTS.PARTICIPANTES.ADDRESS,
      CONTRACTS.PARTICIPANTES.ABI,
      signer
    )

    try {
      const participants = await participantesContract.getParticipantes()
      console.log("Raw participants:", participants)

      // The contract returns an array of Participante structs
      for (const participant of participants) {
        if (participant[0].toLowerCase() === address.toLowerCase()) {
          return {
            direccion: participant[0],
            nombre: participant[1],
            rol: participant[2]
          }
        }
      }
      return undefined
    } catch (error) {
      console.log("Contract call error:", error)
      return undefined
    }
  }


  const handleAccountsChanged = (accounts: string[]) => {
    console.log("Cambio detectado en cuentas:", accounts)
    if (accounts.length === 0) {
      setAccount('')
      setIsConnected(false)
    } else if (accounts[0] !== account) {
      setAccount(accounts[0])
      setIsConnected(true)
      console.log("Cuenta actualizada a:", accounts[0])
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [account])

  //THIS WORKS FINE
  /*
    const connectWallet = async () => {
      if (window.ethereum) {
        try {
          console.log("Solicitando conexión a MetaMask...")
          const accounts = await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
          })
  
          if (accounts.length > 0) {
            console.log("Cuentas conectadas:", accounts)
            handleAccountsChanged(accounts) // Asegurarnos de actualizar con la nueva cuenta
          } else {
            console.log("No se encontraron cuentas.")
          }
        } catch (error) {
          console.error("Error al conectar MetaMask:", error)
        }
      } else {
        console.log("MetaMask no está disponible.")
      }
    }*/
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        console.log("Solicitando conexión a MetaMask...")
        const permissions = await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        })

        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        })

        if (accounts.length > 0) {
          console.log("Cuentas conectadas:", accounts)
          handleAccountsChanged(accounts)

          const participant = await checkParticipantRole(accounts[0])
          if (participant && participant.rol === "Admin") {
            router.push('/dashboard/admin')
          }
        } else {
          console.log("No se encontraron cuentas.")
        }
      } catch (error) {
        console.error("Error al conectar MetaMask:", error)
      }
    } else {
      console.log("MetaMask no está disponible.")
    }
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
          <div className="flex items-center justify-center bg-oil-light/30 backdrop-blur-sm rounded-2xl p-8">
            {showScanner ? (
              <QRScanner />
            ) : (
              <div
                className="qr-button-container cursor-pointer"
                onClick={() => setShowScanner(true)}
              >
                <QrCodeIcon className="qr-button  text-blue-900" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-center backdrop-blur-sm rounded-2xl p-8">

            <div
              onClick={connectWallet}
              className="company-access-btn"
            >
              <span className="flex items-center justify-center gap-2">
                {isConnected && typeof account === 'string' ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Acceso Empresas'}
                {!isConnected && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                )}
              </span>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
