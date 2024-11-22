'use client'

import { useState } from 'react'
import { Tab } from '@headlessui/react'
import { ethers } from 'ethers'
import TransactionMap from './TransactionMap'
import { DetailedTransaction, EstadoTransferencia } from '@/types/transactions'

interface TransactionDetailsProps {
  transaction: DetailedTransaction
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function TransactionDetails({ 
  transaction
}: TransactionDetailsProps) {
  const [selectedTab, setSelectedTab] = useState(0)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getEstadoLabel = (estado: EstadoTransferencia) => {
    switch (estado) {
      case EstadoTransferencia.EN_TRANSITO:
        return 'En Tránsito'
      case EstadoTransferencia.COMPLETADA:
        return 'Completada'
      case EstadoTransferencia.CANCELADA:
        return 'Cancelada'
      default:
        return 'Desconocido'
    }
  }

  const getEstadoColor = (estado: EstadoTransferencia) => {
    switch (estado) {
      case EstadoTransferencia.EN_TRANSITO:
        return 'bg-yellow-100 text-yellow-800'
      case EstadoTransferencia.COMPLETADA:
        return 'bg-green-100 text-green-800'
      case EstadoTransferencia.CANCELADA:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-olive-50 border-b border-olive-100">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-olive-800">
            {transaction.product}
          </h3>
          <span className={`px-2 py-1 rounded-full text-sm ${getEstadoColor(transaction.estado)}`}>
            {getEstadoLabel(transaction.estado)}
          </span>
        </div>
        <p className="text-sm text-olive-600">
          {formatDate(transaction.timestamp)}
        </p>
      </div>

      <Tab.Group onChange={setSelectedTab}>
        <Tab.List className="flex space-x-1 bg-olive-50 p-1">
          {['General', 'Detalles del Producto', 'Participantes', 'Datos Técnicos', 'Mapa'].map((category) => (
            <Tab
              key={category}
              className={({ selected }) =>
                classNames(
                  'w-full py-2.5 text-sm font-medium leading-5 text-olive-700 rounded-lg',
                  'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-olive-400 ring-white ring-opacity-60',
                  selected
                    ? 'bg-white shadow'
                    : 'text-olive-500 hover:bg-white/[0.12] hover:text-olive-600'
                )
              }
            >
              {category}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-2">
          <Tab.Panel className="bg-white rounded-xl p-3">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">ID de Token</dt>
                <dd className="mt-1 text-sm text-gray-900">{transaction.tokenId}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Cantidad</dt>
                <dd className="mt-1 text-sm text-gray-900">{transaction.quantity}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Hash de Transacción</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatAddress(transaction.id)}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Bloque</dt>
                <dd className="mt-1 text-sm text-gray-900">{transaction.blockNumber}</dd>
              </div>
            </dl>
          </Tab.Panel>
          <Tab.Panel className="bg-white rounded-xl p-3">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Descripción</dt>
                <dd className="mt-1 text-sm text-gray-900">{transaction.description}</dd>
              </div>
              {transaction.attributes.map((attr, index) => (
                <div key={index} className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">{attr.nombre}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{attr.valor}</dd>
                </div>
              ))}
            </dl>
          </Tab.Panel>
          <Tab.Panel className="bg-white rounded-xl p-3">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Remitente</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {transaction.from.name} ({formatAddress(transaction.from.address)})
                </dd>
                <dd className="mt-1 text-sm text-gray-500">{transaction.from.role}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Destinatario</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {transaction.to.name} ({formatAddress(transaction.to.address)})
                </dd>
                <dd className="mt-1 text-sm text-gray-500">{transaction.to.role}</dd>
              </div>
            </dl>
          </Tab.Panel>
          <Tab.Panel className="bg-white rounded-xl p-3">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Gas Usado</dt>
                <dd className="mt-1 text-sm text-gray-900">{transaction.gasUsed}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Precio del Gas</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ethers.formatUnits(transaction.gasPrice, 'gwei')} gwei
                </dd>
              </div>
            </dl>
          </Tab.Panel>
          <Tab.Panel className="bg-white rounded-xl p-3">
            <div className="h-96">
              <TransactionMap
                fromLocation={transaction.fromLocation}
                toLocation={transaction.toLocation}
                transaction={{
                  from: transaction.from.name,
                  to: transaction.to.name,
                  product: transaction.product
                }}
              />
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
