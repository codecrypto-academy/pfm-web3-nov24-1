'use client'

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapComponentProps {
  initialCoordinates: [number, number];
  onConfirm?: (coordinates: { lat: number; lng: number }) => void;
  readOnly?: boolean;
}

const MapComponent = ({ initialCoordinates, onConfirm, readOnly = false }: MapComponentProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Configurar el icono por defecto para los marcadores
      if (!L.Icon.Default.imagePath) {
        L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.7.1/dist/images/';
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: L.Icon.Default.imagePath + 'marker-icon-2x.png',
        iconUrl: L.Icon.Default.imagePath + 'marker-icon.png',
        shadowUrl: L.Icon.Default.imagePath + 'marker-shadow.png',
      });

      if (!mapContainerRef.current || mapRef.current) return;

      // Crear el mapa con un estilo más claro
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: !L.Browser.mobile
      }).setView(initialCoordinates, 13);

      // Usar un proveedor de mapas alternativo con un estilo más claro
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker(initialCoordinates, {
        draggable: !readOnly
      }).addTo(map);

      if (!readOnly) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          if (onConfirm) {
            onConfirm({ lat, lng });
          }
        });

        marker.on('dragend', () => {
          const position = marker.getLatLng();
          if (onConfirm) {
            onConfirm({ lat: position.lat, lng: position.lng });
          }
        });
      }

      mapRef.current = map;
      markerRef.current = marker;

      // Asegurarse de que el mapa se ajuste al contenedor
      const resizeMap = () => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      };

      // Esperar a que el DOM se actualice completamente
      setTimeout(resizeMap, 300);

      // Agregar listener para redimensionar
      window.addEventListener('resize', resizeMap);

      return () => {
        window.removeEventListener('resize', resizeMap);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Error al cargar el mapa. Por favor, intente de nuevo.');
    }
  }, [initialCoordinates, onConfirm, readOnly]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
};

export default MapComponent;
