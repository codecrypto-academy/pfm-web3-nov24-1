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

export default function TransactionGroup({ transactions, address }: TransactionGroupProps) {
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  const [selectedTransferForQR, setSelectedTransferForQR] = useState<{ tokenId: number, transferId: number, timestamp: number } | null>(null);

  if (!transactions.length) return null

  const tokenId = transactions[0].tokenId
  const product = transactions[0].product

  // Agrupar transacciones por transferId
  const transferGroups = transactions.reduce((groups: TransferGroup[], transaction) => {
    const existingGroup = groups.find(group => group.transferId === transaction.transferId)
    if (existingGroup) {
      existingGroup.transactions.push(transaction)
    } else {
      groups.push({
        transferId: transaction.transferId,
        transactions: [transaction]
      })
    }
    // Ordenar las transacciones dentro del grupo por timestamp
    groups.forEach(group => {
      group.transactions.sort((a, b) => a.timestamp - b.timestamp)
    })
    return groups
  }, [])

  const toggleGroup = (transferId: number) => {
    setExpandedGroups(prev => ({
      ...prev,
      [transferId]: !prev[transferId]
    }))
  }

  return (
    <div className="border rounded-lg p-6 mb-6 bg-white shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {product}
        </h3>
        <p className="text-sm text-gray-500">
          Token ID: {tokenId}
        </p>
      </div>
      
      <div className="space-y-8">
        {transferGroups.map((group) => {
          const isExpanded = expandedGroups[group.transferId] || false
          
          return (
            <div key={`transfer-${group.transferId}`} className="relative">
              <div 
                onClick={() => toggleGroup(group.transferId)}
                className="mb-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                    Transferencia #{group.transferId}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="relative pl-8 border-l-2 border-olive-200">
                  {group.transactions.map((transaction, index) => {
                    const userAddress = address?.toLowerCase() || '';
                    const fromAddress = transaction.from.address.toLowerCase();
                    const toAddress = transaction.to.address.toLowerCase();
                    
                    // Determinar si es la transacción de envío o de recepción
                    // La primera transacción del grupo es siempre el envío
                    const isFirstTransaction = index === 0;
                    
                    let action = '';
                    let colorClass = '';
                    let datePrefix = '';
                    
                    if (isFirstTransaction) {
                      // Primera transacción - siempre es envío
                      action = 'Envío';
                      colorClass = 'bg-olive-100 text-olive-800';
                      datePrefix = 'Envío';
                    } else {
                      // Segunda transacción - siempre es recepción
                      action = 'Recibido';
                      colorClass = 'bg-blue-100 text-blue-800';
                      datePrefix = 'Recibido';
                    }

                    return (
                      <div key={`transaction-${transaction.id}`} className="mb-6 relative">
                        <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 ${
                          transaction.estado === EstadoTransferencia.EN_TRANSITO
                            ? 'bg-yellow-100 border-yellow-500' 
                            : transaction.estado === EstadoTransferencia.COMPLETADA
                            ? 'bg-green-100 border-green-500'
                            : 'bg-red-100 border-red-500'
                        }`} />
                        
                        <div className="text-sm text-gray-500 mb-2">
                          {`${datePrefix} el ${format(new Date(transaction.timestamp * 1000), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}`}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Estado:</span>
                                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                                  transaction.estado === EstadoTransferencia.EN_TRANSITO
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : transaction.estado === EstadoTransferencia.COMPLETADA
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {EstadoTransferencia[transaction.estado]}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Acción:</span>
                                <span className={`text-sm font-medium px-2 py-1 rounded-full ${colorClass}`}>
                                  {action}
                                </span>
                              </div>

                              <div className="col-span-2 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTransferForQR({
                                      tokenId: transaction.tokenId,
                                      transferId: transaction.transferId,
                                      timestamp: transaction.timestamp
                                    });
                                  }}
                                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  Ver QR
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Detalles de la transacción con tabs */}
                          <TransactionDetails transaction={transaction} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <TransferQRModal
        isOpen={selectedTransferForQR !== null}
        onClose={() => setSelectedTransferForQR(null)}
        tokenId={selectedTransferForQR?.tokenId || 0}
        transferId={selectedTransferForQR?.transferId || 0}
        timestamp={selectedTransferForQR?.timestamp || 0}
      />
    </div>
  )
}
