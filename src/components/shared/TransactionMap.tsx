'use client'

import React from 'react'
import dynamic from 'next/dynamic'

interface TransactionMapProps {
  fromLocation: [number, number] | null
  toLocation: [number, number] | null
  transaction: {
    from: string
    to: string
    product: string
    id?: string | number
  }
}

const TransactionMapClient = dynamic(() => import('./TransactionMapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-pulse text-gray-500">Cargando mapa...</div>
    </div>
  )
})

export default function TransactionMap({ fromLocation, toLocation, transaction }: TransactionMapProps) {
  return <TransactionMapClient {...{ fromLocation, toLocation, transaction }} />
}

// Resto del código...
