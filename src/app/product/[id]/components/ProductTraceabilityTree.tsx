'use client';

import { FaChevronRight, FaCheckCircle, FaTimesCircle, FaClock, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { TokenInfo, TimelineStep, ProductData } from '@/types/product';
import { formatAttributeName } from '@/utils/attributeLabels';
import { useState, useMemo } from 'react';

interface ProductTraceabilityTreeProps {
  data: ProductData;
}

export const ProductTraceabilityTree: React.FC<ProductTraceabilityTreeProps> = ({ data }) => {
  const [expandedTransfer, setExpandedTransfer] = useState<string | null>(null);

  // Organizar los pasos por tipo de token y transferencias
  const organizedData = useMemo(() => {
    // Ordenar pasos por timestamp y eliminar duplicados basados en hash
    const uniqueSteps = new Map<string, TimelineStep>();
    data.steps.forEach(step => {
      if (!uniqueSteps.has(step.hash)) {
        uniqueSteps.set(step.hash, step);
      }
    });

    const sortedSteps = Array.from(uniqueSteps.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Encontrar el token procesado (el actual)
    const procesadoStep = sortedSteps.find(step => 
      step.tokenInfo?.atributos?.['Tipo_Producto'] === 'Procesado'
    );

    // Obtener materias primas usando la nueva función getTokensOrigen
    const materiasPrimas = procesadoStep?.tokenInfo?.tokensOrigen || [];

    // Filtrar pasos por tipo usando los nuevos IDs de tokens origen
    const materiasPrimasSteps = sortedSteps.filter(step => 
      step.tokenInfo?.id && materiasPrimas.includes(step.tokenInfo.id)
    );

    // Obtener las cantidades usadas de cada materia prima
    const cantidadesMP = new Map<string, number>();
    if (procesadoStep?.tokenInfo?.tokenOrigenACantidad && materiasPrimas.length > 0) {
      materiasPrimas.forEach(tokenId => {
        const cantidad = procesadoStep.tokenInfo?.tokenOrigenACantidad?.[tokenId];
        if (cantidad !== undefined) {
          cantidadesMP.set(tokenId, cantidad);
        }
      });
    }

    // Agrupar transferencias por ID de token y eliminar duplicados
    const transferenciasMap = new Map();
    
    sortedSteps.forEach(step => {
      if (step.details?.Estado && step.tokenInfo?.id) {
        const key = `${step.tokenInfo.id}-${step.participant.role}-${step.details?.destinatario?.role}`;
        if (!transferenciasMap.has(key) || 
            new Date(step.timestamp) > new Date(transferenciasMap.get(key).timestamp)) {
          transferenciasMap.set(key, step);
        }
      }
    });

    return {
      procesado: procesadoStep,
      materiasPrimas: materiasPrimasSteps,
      cantidadesMP: cantidadesMP,
      transferencias: Array.from(transferenciasMap.values())
    };
  }, [data.steps]);

  const formatDuration = (start: string, end: string) => {
    const diffInMinutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60));
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutos`;
    }
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETADA':
        return <FaCheckCircle className="h-5 w-5 text-green-500" />;
      case 'CANCELADA':
        return <FaTimesCircle className="h-5 w-5 text-red-500" />;
      case 'EN_TRANSITO':
        return <FaClock className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  // Función para convertir tokens a KG
  const tokensToKg = (tokens: number) => {
    return (tokens / 1000).toFixed(3);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div>
        <h2 className="text-xl font-bold mb-4">Historial de Transferencias</h2>
        <div className="space-y-4">
          {organizedData.transferencias.map((step, index) => (
            <div key={step.hash} className="relative">
              {index > 0 && (
                <div className="absolute top-0 left-8 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
              )}
              <div className="relative flex items-start space-x-3">
                <div>
                  <button
                    onClick={() => setExpandedTransfer(expandedTransfer === step.hash ? null : step.hash)}
                    className="relative px-1 group focus:outline-none"
                  >
                    <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center ring-8 ring-white transition-colors duration-200 group-hover:bg-blue-600">
                      {expandedTransfer === step.hash ? (
                        <FaChevronUp className="h-5 w-5 text-white" aria-hidden="true" />
                      ) : (
                        <FaChevronDown className="h-5 w-5 text-white" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(step.details.Estado)}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            step.details.Estado === 'COMPLETADA' ? 'bg-green-100 text-green-800' :
                            step.details.Estado === 'EN_TRANSITO' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {step.details.Estado}
                          </span>
                        </div>
                        <div className="mt-2">
                          <h3 className="text-lg font-medium flex items-center">
                            <span className="text-gray-900">{step.participant.name}</span>
                            {step.tokenInfo && (
                              <span className="mx-2 text-gray-600">({step.tokenInfo.nombre})</span>
                            )}
                            <span className="mx-2 text-gray-400">→</span>
                            <span className="text-gray-900">{step.details.destinatario?.name}</span>
                          </h3>
                          <p className="text-sm text-gray-500">
                            {step.participant.role} → {step.details.destinatario?.role}
                          </p>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Cantidad</p>
                              <p className="text-lg font-semibold">
                                {step.details.Cantidad} tokens
                                <span className="text-sm text-gray-500 ml-2">
                                  ({tokensToKg(step.details.Cantidad)} KG)
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Enviado</p>
                              <p>{new Date(step.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalles expandibles */}
                    {expandedTransfer === step.hash && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="space-y-4">
                          {/* Detalles del Envío */}
                          <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Detalles del Envío</h4>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Remitente</p>
                                <p className="text-sm text-gray-900">{step.participant.name}</p>
                                <p className="text-xs text-gray-600">{step.participant.role}</p>
                              </div>
                              {step.tokenInfo && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Producto</p>
                                  <p className="text-sm text-gray-900">{step.tokenInfo.nombre}</p>
                                  <p className="text-xs text-gray-600">ID: {step.tokenInfo.id}</p>
                                  {step.tokenInfo.atributos && Object.entries(step.tokenInfo.atributos).map(([key, value]) => (
                                    <p key={key} className="text-xs text-gray-600">
                                      {formatAttributeName(key)}: {value ? String(value) : 'Sin información'}
                                    </p>
                                  ))}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-700">Cantidad</p>
                                <p className="text-sm text-gray-900">
                                  {step.details.Cantidad} tokens
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({tokensToKg(step.details.Cantidad)} KG)
                                  </span>
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Dirección Wallet</p>
                                <a
                                  href={`https://sepolia.etherscan.io/address/${step.participant.address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 font-mono"
                                >
                                  {step.participant.address.substring(0, 6)}...{step.participant.address.substring(38)}
                                </a>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Fecha y Hora de Envío</p>
                                <p className="text-sm text-gray-900">{new Date(step.timestamp).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Hash de Transacción</p>
                                <a
                                  href={`https://sepolia.etherscan.io/tx/${step.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 font-mono"
                                >
                                  0x{step.hash.substring(2, 6)}...{step.hash.substring(62)}
                                </a>
                              </div>
                              {step.details.coordenadas && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700">Ubicación de Origen</p>
                                  <p className="text-sm text-gray-900">{step.details.coordenadas}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Detalles de Recepción */}
                          {(step.details.destinatario || step.hashCompletado) && (
                            <div className={`p-4 rounded-lg ${
                              step.details.Estado === 'COMPLETADA' ? 'bg-green-50' : 
                              step.details.Estado === 'CANCELADA' ? 'bg-red-50' : 'bg-yellow-50'
                            }`}>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">Detalles de Recepción</h4>
                              <div className="space-y-3">
                                {step.tokenInfo && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Producto</p>
                                    <p className="text-sm text-gray-900">{step.tokenInfo.nombre}</p>
                                    <p className="text-xs text-gray-600">ID: {step.tokenInfo.id}</p>
                                    {step.tokenInfo.atributos && Object.entries(step.tokenInfo.atributos).map(([key, value]) => (
                                      <p key={key} className="text-xs text-gray-600">
                                        {formatAttributeName(key)}: {value ? String(value) : 'Sin información'}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                {step.details.destinatario && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Destinatario</p>
                                    <p className="text-sm text-gray-900">{step.details.destinatario.name}</p>
                                    <p className="text-xs text-gray-600">{step.details.destinatario.role}</p>
                                  </div>
                                )}
                                {step.details.destinatario && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Dirección Wallet</p>
                                    <a
                                      href={`https://sepolia.etherscan.io/address/${step.details.destinatario.address}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 font-mono"
                                    >
                                      {step.details.destinatario.address.substring(0, 6)}...{step.details.destinatario.address.substring(38)}
                                    </a>
                                  </div>
                                )}
                                {step.details.destinatario && step.details.destinatario.coordenadas && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">Ubicación de Destino</p>
                                    <p className="text-sm text-gray-900">{step.details.destinatario.coordenadas}</p>
                                  </div>
                                )}
                                {step.timestampCompletado && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">
                                      Fecha y Hora de {step.details.Estado === 'COMPLETADA' ? 'Recepción' : 'Cancelación'}
                                    </p>
                                    <p className="text-sm text-gray-900">{new Date(step.timestampCompletado).toLocaleString()}</p>
                                  </div>
                                )}
                                {step.hashCompletado && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">
                                      Hash de {step.details.Estado === 'COMPLETADA' ? 'Confirmación' : 'Cancelación'}
                                    </p>
                                    <a
                                      href={`https://sepolia.etherscan.io/tx/${step.hashCompletado}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 font-mono"
                                    >
                                      0x{step.hashCompletado.substring(2, 6)}...{step.hashCompletado.substring(62)}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductTraceabilityTree;
