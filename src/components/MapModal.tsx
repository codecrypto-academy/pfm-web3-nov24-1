import React, { useState, useEffect, useCallback, useRef } from 'react';
import L, { Map, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/MapModalStyles.css';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleConfirm = useCallback(() => {
    if (markerRef.current && onConfirm) {
      const position = markerRef.current.getLatLng();
      onConfirm({ lat: position.lat, lng: position.lng });
      onClose();
    }
  }, [onConfirm, onClose]);

  useEffect(() => {
    let isMounted = true;

    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: initialCoordinates,
        zoom: 13
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker(initialCoordinates).addTo(map);
      
      if (!readOnly) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
        });
      }

      mapRef.current = map;
      markerRef.current = marker;

      // Forzar actualización del tamaño del mapa
      setTimeout(() => {
        if (isMounted && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    };

    // Inicializar con un pequeño retraso
    const timer = setTimeout(initializeMap, 100);

    // Cleanup
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialCoordinates, readOnly]);

  // Manejar la tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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

        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
          <div 
            ref={mapContainerRef}
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#f0f0f0'
            }}
          />
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          {!readOnly && (
            <button
              onClick={handleConfirm}
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
