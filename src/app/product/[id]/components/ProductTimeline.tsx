'use client';

import { FaTree, FaIndustry, FaStore } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TokenInfo {
  id: string;
  nombre: string;
  cantidad: number;
  atributos: { [key: string]: any };
}

interface TimelineStep {
  hash: string;
  timestamp: string;
  participant: {
    name: string;
    role: string;
    address: string;
  };
  details: {
    [key: string]: string | number;
  };
  tokenInfo?: TokenInfo;
  materiaPrima?: TokenInfo[];
}

interface ProductData {
  steps: TimelineStep[];
  batchId: string;
}

interface ProductTimelineProps {
  data: ProductData;
}

const getRoleIcon = (role: string) => {
  switch (role.toLowerCase()) {
    case 'productor':
      return <FaTree className="w-6 h-6 text-green-600" />;
    case 'procesador':
      return <FaIndustry className="w-6 h-6 text-blue-600" />;
    case 'distribuidor':
      return <FaStore className="w-6 h-6 text-purple-600" />;
    default:
      return null;
  }
};

const renderAttributes = (atributos: { [key: string]: any }) => {
  if (!atributos || Object.keys(atributos).length === 0) return null;

  return (
    <div className="mt-2">
      <h4 className="font-semibold text-gray-700">Atributos:</h4>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(atributos).map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className="font-medium">{key.replace(/_/g, ' ')}: </span>
            <span className="text-gray-600">{value.toString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderTokenInfo = (tokenInfo: TokenInfo) => {
  if (!tokenInfo) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mt-4">
      <h4 className="font-semibold text-lg text-gray-800">Información del Producto</h4>
      <div className="mt-2 space-y-2">
        <p><span className="font-medium">ID: </span>{tokenInfo.id}</p>
        <p><span className="font-medium">Nombre: </span>{tokenInfo.nombre}</p>
        <p><span className="font-medium">Cantidad: </span>{tokenInfo.cantidad}</p>
        {renderAttributes(tokenInfo.atributos)}
      </div>
    </div>
  );
};

const renderRawMaterials = (materiaPrima: TokenInfo[]) => {
  if (!materiaPrima || materiaPrima.length === 0) return null;

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm mt-4">
      <h4 className="font-semibold text-lg text-gray-800">Materias Primas Utilizadas</h4>
      <div className="space-y-4 mt-2">
        {materiaPrima.map((mp, index) => (
          <div key={index} className="border-l-4 border-blue-400 pl-4">
            <p><span className="font-medium">ID: </span>{mp.id}</p>
            <p><span className="font-medium">Nombre: </span>{mp.nombre}</p>
            <p><span className="font-medium">Cantidad: </span>{mp.cantidad}</p>
            {renderAttributes(mp.atributos)}
          </div>
        ))}
      </div>
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

  return (
    <div className="relative container mx-auto">
      <div className="border-l-2 border-gray-200 ml-6">
        {data.steps.map((step, index) => (
          <div key={step.hash} className="mb-8 ml-6">
            <div className="flex items-center mb-2">
              <div className="absolute -left-3 bg-white p-2 rounded-full border-2 border-gray-200">
                {getRoleIcon(step.participant.role)}
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">
                  {format(new Date(step.timestamp), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                </p>
                <h3 className="text-lg font-semibold text-gray-800">
                  {step.participant.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {step.participant.role}
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {step.participant.address}
                </p>
              </div>
            </div>

            {step.tokenInfo && renderTokenInfo(step.tokenInfo)}
            {step.materiaPrima && renderRawMaterials(step.materiaPrima)}

            <div className="mt-4 text-sm text-gray-500">
              <p className="font-mono">Hash de transacción: {step.hash}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
