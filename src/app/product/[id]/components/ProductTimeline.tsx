'use client';

import { TokenInfo, TimelineStep, ProductData } from '@/types/product';
import { FaTree, FaIndustry, FaStore, FaArrowRight, FaBoxOpen } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatAttributeName } from '@/utils/attributeLabels';

interface ProductTimelineProps {
  data: ProductData;
}

const tokensToKg = (tokens: number) => {
  return (tokens / 1000).toFixed(3);
};

const getRoleIcon = (role: string) => {
  switch (role.toLowerCase()) {
    case 'productor':
      return <FaTree className="w-8 h-8 text-green-600" />;
    case 'procesador':
      return <FaIndustry className="w-8 h-8 text-blue-600" />;
    case 'distribuidor':
      return <FaStore className="w-8 h-8 text-purple-600" />;
    default:
      return <FaBoxOpen className="w-8 h-8 text-gray-600" />;
  }
};

const renderMateriaPrima = (mp: TokenInfo) => {
  return (
    <div key={mp.id} className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-lg">{mp.nombre}</h4>
          <p className="text-sm text-gray-600">ID: {mp.id}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{mp.cantidad} tokens</p>
          <p className="text-sm text-gray-500">({tokensToKg(mp.cantidad)} KG)</p>
        </div>
      </div>
      {mp.atributos && Object.entries(mp.atributos).map(([key, value]) => (
        <p key={key} className="text-sm text-gray-600 mt-1">
          {formatAttributeName(key)}: {value ? String(value) : 'Sin información'}
        </p>
      ))}
    </div>
  );
};

export default function ProductTimeline({ data }: ProductTimelineProps) {
  if (!data || !data.steps || data.steps.length === 0) {
    return (
      <div className="text-center py-8">
        No hay información de trazabilidad disponible para este producto.
      </div>
    );
  }

  // Encontrar el paso de procesamiento (si existe)
  const procesamientoStep = data.steps.find(step => 
    step.tokenInfo?.atributos?.['Tipo_Producto'] === 'Procesado'
  );

  return (
    <div className="space-y-8">
      {/* Línea de tiempo del ciclo de vida */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-6">Ciclo de Vida del Producto</h3>
        <div className="flex justify-between items-center">
          {data.steps.map((step, index) => (
            <div key={step.hash} className="flex items-center">
              <div className="text-center">
                <div className="mb-2">{getRoleIcon(step.participant.role)}</div>
                <p className="font-medium">{step.participant.name}</p>
                <p className="text-sm text-gray-600">{step.participant.role}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(step.timestamp), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              {index < data.steps.length - 1 && (
                <FaArrowRight className="mx-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Panel de Materias Primas (solo para productos procesados) */}
      {procesamientoStep?.materiaPrima && procesamientoStep.materiaPrima.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Materias Primas Utilizadas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {procesamientoStep.materiaPrima.map(mp => renderMateriaPrima(mp))}
          </div>
        </div>
      )}

      {/* Información del Procesamiento */}
      {procesamientoStep && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Detalles del Procesamiento</h3>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Procesador: </span>
              {procesamientoStep.participant.name}
            </p>
            <p>
              <span className="font-medium">Fecha: </span>
              {format(new Date(procesamientoStep.timestamp), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </p>
            {procesamientoStep.tokenInfo?.atributos && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {Object.entries(procesamientoStep.tokenInfo.atributos)
                  .filter(([key]) => !key.startsWith('Token_Origen_'))
                  .map(([key, value]) => (
                    <p key={key} className="text-sm">
                      <span className="font-medium">{formatAttributeName(key)}: </span>
                      {value ? String(value) : 'Sin información'}
                    </p>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
