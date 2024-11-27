'use client'

import React from 'react';
import dynamic from 'next/dynamic';
import '../styles/MapModalStyles.css';

// Importar MapComponent dinámicamente para evitar errores de SSR
const MapComponent = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center">Cargando mapa...</div>
  }
);

interface MapModalProps {
  onConfirm?: (coordinates: { lat: number; lng: number }) => void;
  onClose: () => void;
  initialCoordinates?: [number, number];
  title?: string;
  readOnly?: boolean;
}

const MapModal: React.FC<MapModalProps> = ({ 
  onConfirm, 
  onClose, 
  initialCoordinates = [40.4168, -3.7038],
  title = "Seleccionar Ubicación",
  readOnly = false 
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="h-[500px] w-full">
          <MapComponent
            initialCoordinates={initialCoordinates}
            onConfirm={onConfirm}
            readOnly={readOnly}
          />
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          {!readOnly && onConfirm && (
            <button
              onClick={() => onConfirm({ lat: initialCoordinates[0], lng: initialCoordinates[1] })}
              className="px-4 py-2 bg-olive-600 text-white rounded hover:bg-olive-700 transition-colors"
            >
              Confirmar Ubicación
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapModal;
