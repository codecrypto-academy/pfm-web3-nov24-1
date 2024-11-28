'use client';

import { FaChevronRight } from 'react-icons/fa';
import { TokenInfo, TimelineStep, ProductData } from '@/types/product';
import { useState, useMemo } from 'react';

interface ProductTraceabilityTreeProps {
  data: ProductData;
}

const ProductTraceabilityTree: React.FC<ProductTraceabilityTreeProps> = ({ data }) => {
  const [selectedTransfer, setSelectedTransfer] = useState<TimelineStep | null>(null);

  // Organizar los pasos por tipo de token y transferencias
  const organizedData = useMemo(() => {
    // Ordenar pasos por timestamp
    const sortedSteps = data.steps.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    console.log('Todos los pasos:', sortedSteps.map(step => ({
      timestamp: step.timestamp,
      participant: step.participant,
      details: step.details,
      tokenInfo: step.tokenInfo
    })));

    // Encontrar el token procesado (el actual)
    const procesadoStep = sortedSteps.find(step => 
      step.tokenInfo?.atributos?.['Tipo_Producto'] === 'Procesado'
    );

    // Encontrar las materias primas (usando Token_Origen_X)
    const materiasPrimas = procesadoStep ? 
      Object.entries(procesadoStep.tokenInfo?.atributos || {})
        .filter(([key]) => key.startsWith('Token_Origen_'))
        .map(([_, valor]) => {
          if (typeof valor === 'string') {
            const match = valor.match(/ID:(\d+)/);
            return match ? match[1] : null;
          }
          return null;
        })
        .filter(id => id !== null) : [];

    // Filtrar pasos por tipo
    const materiasPrimasSteps = sortedSteps.filter(step => 
      step.tokenInfo?.id && materiasPrimas.includes(step.tokenInfo.id)
    );

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
      transferencias: Array.from(transferenciasMap.values())
    };
  }, [data.steps]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Token Procesado (Actual) */}
      {organizedData.procesado && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Producto Final</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{organizedData.procesado.tokenInfo?.nombre}</h3>
                <p className="text-sm text-gray-600">Fabricado por: {organizedData.procesado.participant.name}</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                Procesado
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Cantidad</p>
                <p>{organizedData.procesado.details.Cantidad}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha</p>
                <p>{new Date(organizedData.procesado.timestamp).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Materias Primas */}
      {organizedData.materiasPrimas.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Materias Primas Utilizadas</h2>
          <div className="space-y-4">
            {organizedData.materiasPrimas.map((step) => (
              <div key={step.hash} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{step.tokenInfo?.nombre}</h3>
                    <p className="text-sm text-gray-600">Producido por: {step.participant.name}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Materia Prima
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cantidad</p>
                    <p>{step.details.Cantidad}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fecha</p>
                    <p>{new Date(step.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transferencias */}
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
                  <div className="relative px-1">
                    <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center ring-8 ring-white">
                      <FaChevronRight className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-medium">
                          De: {step.participant.name} ({step.participant.role})
                        </h3>
                        <p className="text-sm text-gray-500">
                          A: {step.details.destinatario?.name} ({step.details.destinatario?.role})
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        step.details.Estado === 'COMPLETADA' ? 'bg-green-100 text-green-800' :
                        step.details.Estado === 'EN_TRANSITO' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {step.details.Estado}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Cantidad: {step.details.Cantidad}</p>
                      <p>Fecha: {new Date(step.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Detalles */}
      {selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Detalles de la Transferencia</h3>
            <div className="space-y-3">
              <p><span className="font-medium">De:</span> {selectedTransfer.participant.name} ({selectedTransfer.participant.role})</p>
              <p><span className="font-medium">A:</span> {selectedTransfer.details.destinatario?.name} ({selectedTransfer.details.destinatario?.role})</p>
              <p><span className="font-medium">Estado:</span> {selectedTransfer.details.Estado}</p>
              <p><span className="font-medium">Cantidad:</span> {selectedTransfer.details.Cantidad}</p>
              <p><span className="font-medium">Fecha:</span> {new Date(selectedTransfer.timestamp).toLocaleString()}</p>
            </div>
            <button
              onClick={() => setSelectedTransfer(null)}
              className="mt-4 w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTraceabilityTree;
