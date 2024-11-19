import React, { useState, useEffect, useCallback, useRef } from 'react';
import L, { Map, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/MapModalStyles.css';
import Portal from './Portal';

// Configurar el icono por defecto para los marcadores
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const containerRef = useRef<string>(`map-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);

    // Crear el mapa después de que el contenedor esté disponible
    setTimeout(() => {
      if (!mapRef.current) {
        const map = L.map(containerRef.current).setView(initialCoordinates, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: ' OpenStreetMap contributors',
        }).addTo(map);

        mapRef.current = map;
        markerRef.current = L.marker(initialCoordinates).addTo(map);

        if (!readOnly) {
          map.on('click', (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            }
          });
        }
      }
    }, 0);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
      window.removeEventListener('keydown', handleEscape);
    };
  }, [initialCoordinates, readOnly, onClose]);

  const handleConfirm = useCallback(() => {
    if (markerRef.current && onConfirm) {
      const { lat, lng } = markerRef.current.getLatLng();
      onConfirm({ lat, lng });
    }
    onClose();
  }, [onConfirm, onClose]);

  return (
    <Portal>
      <div 
        className="fixed inset-0 z-[9999]"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      >
        <div 
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />
        <div 
          className="absolute inset-8 bg-white rounded-lg shadow-2xl flex flex-col"
          style={{ maxWidth: '90vw', maxHeight: '90vh', margin: 'auto' }}
        >
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 relative">
            <div id={containerRef.current} style={{ position: 'absolute', inset: 0 }} />
            
            <div className="absolute top-4 right-4 z-[10000] bg-white p-3 rounded-lg shadow-lg">
              <div className="text-sm font-medium">
                Coordenadas: {initialCoordinates[0].toFixed(4)}, {initialCoordinates[1].toFixed(4)}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${initialCoordinates[0]},${initialCoordinates[1]}`);
                  }}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                  title="Copiar coordenadas"
                >
                  <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default MapModal;
