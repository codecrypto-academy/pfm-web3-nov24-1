'use client'

import { useState } from 'react'
import { Tab } from '@headlessui/react'
import { ethers } from 'ethers'
import dynamic from 'next/dynamic'
import { DetailedTransaction, EstadoTransferencia } from '@/types/transactions'

const TransactionMap = dynamic(
  () => import('./TransactionMap'),
  { ssr: false }
)

interface TransactionDetailsProps {
  transaction: DetailedTransaction
  showTokenId?: boolean
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function TransactionDetails({ 
  transaction,
  showTokenId = true
}: TransactionDetailsProps) {
  const [selectedTab, setSelectedTab] = useState(0)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatAttributeName = (name: string) => {
    // Convertir de snake_case a Title Case
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
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
          <div className="flex flex-col items-end">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(transaction.estado)}`}>
              {getEstadoLabel(transaction.estado)}
            </span>
          </div>
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
                  'w-full py-2.5 text-sm font-medium leading-5',
                  'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-olive-400 ring-white ring-opacity-60',
                  selected
                    ? 'bg-white text-olive-700 shadow'
                    : 'text-olive-500 hover:bg-olive-100 hover:text-olive-700'
                )
              }
            >
              {category}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels>
          <Tab.Panel className="bg-white rounded-xl p-3">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              {showTokenId && (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">ID de Token</dt>
                  <dd className="mt-1 text-sm text-gray-900">{transaction.tokenId}</dd>
                </div>
              )}
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Cantidad</dt>
                <dd className="mt-1 text-sm text-gray-900">{transaction.quantity}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Descripción</dt>
                <dd className="mt-1 text-sm text-gray-900">{transaction.description || 'Sin descripción'}</dd>
              </div>
            </dl>
          </Tab.Panel>
          <Tab.Panel className="bg-white rounded-xl p-3">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4">
              <div className="col-span-1">
                <dt className="text-sm font-medium text-gray-500 mb-3">Atributos</dt>
                <dd className="mt-1">
                  {transaction.attributes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {transaction.attributes.map((attr) => (
                        <div
                          key={`${attr.nombre}-${attr.timestamp}`}
                          className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-olive-100 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-olive-200"
                        >
                          <h4 className="text-sm font-semibold text-olive-700 mb-2 border-b border-olive-100 pb-2">
                            {formatAttributeName(attr.nombre)}
                          </h4>
                          <p className="text-lg text-gray-800 mb-2 font-medium">
                            {attr.valor}
                          </p>
                          <p className="text-xs text-olive-500">
                            {formatDate(attr.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay atributos</p>
                  )}
                </dd>
              </div>
              {transaction.rawMaterials.length > 0 && (
                <div className="col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Materias Primas</dt>
                  <dd className="mt-1">
                    <ul className="divide-y divide-gray-200">
                      {transaction.rawMaterials.map((material) => (
                        <li key={`${material.tokenHijo}-${material.tokenPadre}-${material.timestamp}`} className="py-2">
                          <div key={`material-value-${material.tokenHijo}-${material.timestamp}`} className="flex justify-between">
                            <span className="text-sm text-gray-900">Token #{material.tokenHijo}</span>
                            <span className="text-sm text-gray-500">
                              {material.cantidadUsada} unidades
                            </span>
                          </div>
                          <div key={`material-date-${material.tokenHijo}-${material.timestamp}`} className="text-xs text-gray-500">
                            Usado en Token #{material.tokenPadre} - {formatDate(material.timestamp)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
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
              {transaction.fromLocation && transaction.toLocation ? (
                <TransactionMap
                  fromLocation={transaction.fromLocation}
                  toLocation={transaction.toLocation}
                  transaction={{
                    from: transaction.from.name,
                    to: transaction.to.name,
                    product: transaction.product,
                    id: transaction.id
                  }}
                />
              ) : (
                <div className="text-gray-500 text-sm">
                  No hay coordenadas disponibles para mostrar el mapa
                </div>
              )}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}
