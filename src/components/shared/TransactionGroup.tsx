import { DetailedTransaction, EstadoTransferencia } from '@/types/transactions'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import TransactionDetails from './TransactionDetails'
import TransferQRModal from './TransferQRModal'

interface TransactionGroupProps {
  transactions: DetailedTransaction[]
  address?: string
}

interface TransferGroup {
  transferId: number
  transactions: DetailedTransaction[]
}

interface RemesaGroup {
  tokenId: number
  transferGroups: TransferGroup[]
}

export default function TransactionGroup({ transactions, address }: TransactionGroupProps) {
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  const [selectedTransferForQR, setSelectedTransferForQR] = useState<{ tokenId: number, transferId: number, timestamp: number } | null>(null);

  if (!transactions.length) return null

  // Agrupar por remesa -> transferencia
  const remesaGroups = transactions.reduce<RemesaGroup[]>((acc, transaction) => {
    // Buscar o crear grupo de remesa
    let remesa = acc.find(r => r.tokenId === transaction.tokenId)
    if (!remesa) {
      remesa = {
        tokenId: transaction.tokenId,
        transferGroups: []
      }
      acc.push(remesa)
    }

    // Buscar o crear grupo de transferencia
    let transferGroup = remesa.transferGroups.find(t => t.transferId === transaction.transferId)
    if (!transferGroup) {
      transferGroup = {
        transferId: transaction.transferId,
        transactions: []
      }
      remesa.transferGroups.push(transferGroup)
    }

    transferGroup.transactions.push(transaction)

    // Ordenar las transacciones dentro del grupo por timestamp (más recientes primero)
    transferGroup.transactions.sort((a, b) => b.timestamp - a.timestamp)

    return acc
  }, [])

  // Ordenar remesas por tokenId (más recientes primero)
  remesaGroups.sort((a, b) => b.tokenId - a.tokenId)
  // Para cada remesa, ordenar transferencias por ID (más recientes primero)
  remesaGroups.forEach(remesa => {
    remesa.transferGroups.sort((a, b) => b.transferId - a.transferId)
  })

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          {transactions[0].product}
        </h3>
      </div>

      <div className="divide-y">
        {remesaGroups.map((remesa) => {
          const remesaId = `remesa-${remesa.tokenId}`
          const isRemesaExpanded = expandedGroups[remesaId] || false

          return (
            <div key={remesaId} className="border-b last:border-b-0">
              <div 
                onClick={() => toggleGroup(remesaId)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <span className={`transform transition-transform ${isRemesaExpanded ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Remesa #{remesa.tokenId}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {remesa.transferGroups.length} transferencia{remesa.transferGroups.length !== 1 ? 's' : ''}
                </span>
              </div>

              {isRemesaExpanded && (
                <div className="pl-8 pr-4 pb-4">
                  <div className="space-y-4">
                    {remesa.transferGroups.map((group) => {
                      const transferId = `transfer-${group.transferId}`
                      const isTransferExpanded = expandedGroups[transferId] || false
                      const lastTransaction = group.transactions[group.transactions.length - 1]
                      const estado = lastTransaction.estado

                      return (
                        <div key={transferId} 
                             className={`border rounded-lg transition-all duration-200 ${
                               isTransferExpanded ? 'bg-gray-50' : 'bg-white'
                             }`}>
                          <div 
                            onClick={() => toggleGroup(transferId)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                          >
                            <div className="flex items-center space-x-4">
                              <span className={`transform transition-transform ${isTransferExpanded ? 'rotate-90' : ''}`}>
                                ▶
                              </span>
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  Transferencia #{group.transferId}
                                </span>
                                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                                  estado === EstadoTransferencia.EN_TRANSITO
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : estado === EstadoTransferencia.COMPLETADA
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {estado === EstadoTransferencia.EN_TRANSITO
                                    ? 'En Tránsito'
                                    : estado === EstadoTransferencia.COMPLETADA
                                    ? 'Completada'
                                    : 'Cancelada'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-500">
                                {format(new Date(lastTransaction.timestamp * 1000), "d 'de' MMMM, yyyy", { locale: es })}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedTransferForQR({
                                    tokenId: lastTransaction.tokenId,
                                    transferId: lastTransaction.transferId,
                                    timestamp: lastTransaction.timestamp
                                  })
                                }}
                                className="text-sm text-olive-600 hover:text-olive-800 flex items-center space-x-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                </svg>
                                <span>QR</span>
                              </button>
                            </div>
                          </div>

                          {isTransferExpanded && (
                            <div className="border-t px-4 py-3">
                              <div className="space-y-4">
                                {group.transactions.map((transaction, index) => (
                                  <div key={transaction.id} className="bg-white rounded-lg shadow-sm p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                          index === 0 ? 'bg-olive-100 text-olive-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                          {index === 0 ? 'Envío' : 'Recepción'}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                          {format(new Date(transaction.timestamp * 1000), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                        </span>
                                      </div>
                                    </div>
                                    <TransactionDetails 
                                      transaction={transaction}
                                      showTokenId={false}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedTransferForQR && (
        <TransferQRModal
          isOpen={selectedTransferForQR !== null}
          tokenId={selectedTransferForQR.tokenId}
          transferId={selectedTransferForQR.transferId}
          timestamp={selectedTransferForQR.timestamp}
          onClose={() => setSelectedTransferForQR(null)}
        />
      )}
    </div>
  )
}
