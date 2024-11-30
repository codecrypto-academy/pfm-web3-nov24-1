'use client';

import { TokenInfo, TimelineStep, ProductData } from '@/types/product';
import { FaTree, FaIndustry, FaStore, FaArrowRight, FaBoxOpen, FaMoneyBillWave } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatAttributeName } from '@/utils/attributeLabels';
import { useState } from 'react';

type TabId = 'materia-prima' | 'procesado' | 'distribucion';

interface StepsMap {
  'materia-prima': TimelineStep[];
  'procesado': TimelineStep[];
  'distribucion': TimelineStep[];
}

interface Tab {
  id: TabId;
  label: string;
  icon: JSX.Element;
}

interface ProductTimelineProps {
  data: ProductData;
}

const tokensToKg = (tokens: number) => {
  return (tokens / 1000).toFixed(3);
};

const getRoleIcon = (role: string) => {
  switch (role.toLowerCase()) {
    case 'productor':
      return <FaTree className="w-6 h-6 text-green-600" />;
    case 'fabrica':
      return <FaIndustry className="w-6 h-6 text-blue-600" />;
    case 'minorista':
      return <FaStore className="w-6 h-6 text-purple-600" />;
    case 'venta':
      return <FaMoneyBillWave className="w-6 h-6 text-yellow-600" />;
    default:
      return <FaBoxOpen className="w-6 h-6 text-gray-600" />;
  }
};

const StepContent = ({ step }: { step: TimelineStep }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 border-2 border-gray-200">
          {getRoleIcon(step.participant.role)}
        </div>
        <div>
          <h3 className="text-lg font-bold">
            {step.participant.role === 'VENTA' ? 'Venta de Tokens' : step.participant.name}
          </h3>
          <p className="text-sm text-gray-600">
            {step.participant.role === 'VENTA' ? 'Tokens Quemados' : step.participant.role}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {format(new Date(step.timestamp), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
          </p>
          {step.tokenInfo && (
            <p className="text-sm font-medium">
              {step.participant.role === 'VENTA' ? 'Vendido: ' : 'Cantidad: '}
              {tokensToKg(step.tokenInfo.cantidad)} KG
            </p>
          )}
        </div>

        {step.tokenInfo?.atributos && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            {Object.entries(step.tokenInfo.atributos)
              .filter(([key]) => !key.startsWith('Token_Origen_'))
              .map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="font-medium">{formatAttributeName(key)}: </span>
                  {value ? String(value) : 'Sin información'}
                </p>
              ))}
          </div>
        )}

        {step.details.Estado && (
          <div className="pt-4 border-t border-gray-200">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              step.details.Estado === 'COMPLETADA' ? 'bg-green-100 text-green-800' :
              step.details.Estado === 'EN_TRANSITO' ? 'bg-yellow-100 text-yellow-800' :
              step.details.Estado === 'VENDIDO' || step.details.Tipo === 'VENTA' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {step.details.Estado === 'VENDIDO' || step.details.Tipo === 'VENTA' ? 'VENDIDO' : `Estado: ${step.details.Estado}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ProductTimeline({ data }: ProductTimelineProps) {
  const [activeTab, setActiveTab] = useState<TabId>('materia-prima');
  
  if (!data || !data.steps || data.steps.length === 0) {
    return (
      <div className="text-center py-8">
        No hay información de trazabilidad disponible para este producto.
      </div>
    );
  }

  const steps: StepsMap = {
    'materia-prima': data.steps.filter(step => 
      step.participant.role.toUpperCase() === 'PRODUCTOR'
    ),
    'procesado': data.steps.filter(step => 
      step.participant.role.toUpperCase() === 'FABRICA'
    ),
    'distribucion': data.steps.filter(step => 
      ['MINORISTA', 'VENTA'].includes(step.participant.role.toUpperCase()) ||
      step.details.Estado === 'VENDIDO' ||
      (step.details.Tipo && step.details.Tipo === 'VENTA')
    )
  };

  const tabs: Tab[] = [
    { id: 'materia-prima', label: 'Materia Prima', icon: <FaTree className="w-5 h-5" /> },
    { id: 'procesado', label: 'Fábrica', icon: <FaIndustry className="w-5 h-5" /> },
    { id: 'distribucion', label: 'Minorista', icon: <FaStore className="w-5 h-5" /> }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="border-b border-gray-200">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {steps[tab.id].length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {steps[tab.id].length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {steps[activeTab].length > 0 ? (
          <div className="space-y-6">
            {steps[activeTab].map((step) => (
              <StepContent key={step.hash} step={step} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {activeTab === 'distribucion' ? (
              <>
                <p className="text-lg font-medium mb-2">No hay información de distribución</p>
                <p className="text-sm">Este producto aún no ha llegado a la etapa de distribución</p>
              </>
            ) : activeTab === 'procesado' ? (
              <>
                <p className="text-lg font-medium mb-2">No hay información de fábrica</p>
                <p className="text-sm">Este producto aún no ha sido procesado en fábrica</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">No hay información de materia prima</p>
                <p className="text-sm">No se encontró información sobre el origen de este producto</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
