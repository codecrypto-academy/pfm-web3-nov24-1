'use client'

import { useState } from 'react'
import { Tab } from '@headlessui/react'
import { ethers } from 'ethers'
import TransactionMap from './TransactionMap'
import { DetailedTransaction } from '@/types/transactions'

interface TransactionDetailsProps {
  transaction: DetailedTransaction
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function TransactionDetails({ transaction }: TransactionDetailsProps) {
  const [selectedTab, setSelectedTab] = useState(0)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getEtherscanUrl = (hash: string) => {
    // Para red local, retornamos null ya que no hay explorador
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-olive-50 border-b border-olive-100">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-olive-800">
            {transaction.product}
          </h3>
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
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-olive-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-olive-700 shadow'
                    : 'text-olive-500 hover:bg-white/[0.12] hover:text-olive-600'
                )
              }
            >
              {category}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels>
          {/* Panel General */}
          <Tab.Panel className="p-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-olive-800">Resumen de la Transacción</h4>
                <div className="mt-2 space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Producto:</span> {transaction.product}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Cantidad:</span> {transaction.quantity} kg
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Fecha:</span> {formatDate(transaction.timestamp)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Token ID:</span> #{transaction.tokenId}
                  </p>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* Panel Detalles del Producto */}
          <Tab.Panel className="p-4">
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-olive-800 mb-2">Descripción</h4>
                <p className="text-sm text-gray-600">{transaction.description}</p>
              </div>

              <div>
                <h4 className="font-medium text-olive-800 mb-2">Atributos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {transaction.attributes.map((attr, index) => (
                    <div key={index} className="bg-olive-50 p-3 rounded-md">
                      <p className="text-sm font-medium text-olive-700">{attr.nombre}</p>
                      <p className="text-sm text-olive-600">{attr.valor}</p>
                      <p className="text-xs text-olive-400">{formatDate(attr.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-olive-800 mb-2">Materias Primas</h4>
                <div className="space-y-2">
                  {transaction.rawMaterials.map((material, index) => (
                    <div key={index} className="bg-olive-50 p-3 rounded-md">
                      <p className="text-sm">
                        <span className="font-medium">Token Hijo:</span> #{material.tokenHijo}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Token Padre:</span> #{material.tokenPadre}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Cantidad:</span> {material.cantidadUsada / 1000} kg
                      </p>
                      <p className="text-xs text-olive-400">{formatDate(material.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* Panel Participantes */}
          <Tab.Panel className="p-4">
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-olive-800 mb-2">Remitente</h4>
                <div className="bg-olive-50 p-4 rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">Nombre:</span> {transaction.from.name}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Dirección:</span>{' '}
                    {formatAddress(transaction.from.address)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Rol:</span> {transaction.from.role}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Estado:</span>{' '}
                    <span className={transaction.from.active ? 'text-green-600' : 'text-red-600'}>
                      {transaction.from.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-olive-800 mb-2">Destinatario</h4>
                <div className="bg-olive-50 p-4 rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">Nombre:</span> {transaction.to.name}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Dirección:</span>{' '}
                    {formatAddress(transaction.to.address)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Rol:</span> {transaction.to.role}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Estado:</span>{' '}
                    <span className={transaction.to.active ? 'text-green-600' : 'text-red-600'}>
                      {transaction.to.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* Panel Datos Técnicos */}
          <Tab.Panel className="p-4">
            <div className="space-y-4">
              <div className="bg-olive-50 p-4 rounded-md">
                <h4 className="font-medium text-olive-800 mb-2">Detalles de la Blockchain</h4>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Hash:</span>{' '}
                    {formatAddress(transaction.id)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Bloque:</span> #{transaction.blockNumber}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Gas Usado:</span> {transaction.gasUsed}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Precio del Gas:</span> {transaction.gasPrice} Wei
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Timestamp:</span> {formatDate(transaction.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* Panel Mapa */}
          <Tab.Panel className="p-4">
            <div className="h-[600px]">
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
