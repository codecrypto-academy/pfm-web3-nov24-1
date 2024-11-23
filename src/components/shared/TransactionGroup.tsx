import { DetailedTransaction, EstadoTransferencia } from '@/types/transactions'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TransactionDetails = dynamic(
  () => import('./TransactionDetails'),
  { ssr: false }
)

interface TransactionGroupProps {
  transactions: DetailedTransaction[]
}

interface TransferGroup {
  transferId: number
  transactions: DetailedTransaction[]
}

export default function TransactionGroup({ transactions }: TransactionGroupProps) {
  if (!transactions.length) return null

  const tokenId = transactions[0].tokenId
  const product = transactions[0].product

  // Agrupar transacciones por transferId
  const transferGroups: TransferGroup[] = transactions.reduce((groups: TransferGroup[], transaction) => {
    const existingGroup = groups.find(group => group.transferId === transaction.transferId)
    if (existingGroup) {
      existingGroup.transactions.push(transaction)
    } else {
      groups.push({
        transferId: transaction.transferId,
        transactions: [transaction]
      })
    }
    return groups
  }, [])

  // Ordenar los grupos por la fecha de la primera transacción
  transferGroups.sort((a, b) => {
    const aFirstTimestamp = Math.min(...a.transactions.map(t => t.timestamp))
    const bFirstTimestamp = Math.min(...b.transactions.map(t => t.timestamp))
    return aFirstTimestamp - bFirstTimestamp
  })

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
        {transferGroups.map((group, groupIndex) => (
          <div key={`transfer-${group.transferId}`} className="relative">
            {/* Título de la transferencia */}
            <div key={`header-${group.transferId}`} className="mb-3 flex items-center">
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                Transferencia #{groupIndex + 1}
              </span>
            </div>

            {/* Línea de tiempo de la transferencia */}
            <div key={`timeline-${group.transferId}`} className="relative pl-8 border-l-2 border-olive-200">
              {group.transactions.map((transaction) => (
                <div key={`transaction-${transaction.id}`} className="mb-6 relative">
                  {/* Círculo indicador en la línea de tiempo */}
                  <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 ${
                    transaction.from.role.toLowerCase() === 'productor'
                      ? 'bg-olive-100 border-olive-500' 
                      : 'bg-blue-100 border-blue-500'
                  }`} />
                  
                  {/* Fecha */}
                  <div className="text-sm text-gray-500 mb-2">
                    {format(new Date(transaction.timestamp * 1000), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                  </div>
                  
                  {/* Tipo de transacción y estado */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-medium ${
                      transaction.from.role.toLowerCase() === 'productor' ? 'text-olive-600' : 'text-blue-600'
                    }`}>
                      {transaction.from.role.toLowerCase() === 'productor' ? 'Envío' : 'Recepción'}
                    </div>
                    <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                      transaction.estado === EstadoTransferencia.COMPLETADA
                        ? 'bg-green-100 text-green-800'
                        : transaction.estado === EstadoTransferencia.EN_TRANSITO
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.estado === EstadoTransferencia.COMPLETADA
                        ? 'Completada'
                        : transaction.estado === EstadoTransferencia.EN_TRANSITO
                        ? 'En Tránsito'
                        : 'Cancelada'}
                    </div>
                  </div>
                  
                  {/* Detalles de la transacción */}
                  <div className="bg-gray-50 rounded-lg">
                    <TransactionDetails 
                      transaction={transaction}
                      showTokenId={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
