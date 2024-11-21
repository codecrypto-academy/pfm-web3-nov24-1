'use client'

import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Configurar el icono por defecto para los marcadores
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });

    if (!mapContainerRef.current || mapRef.current) return;

    // Crear el mapa con un estilo más claro
    const map = L.map(mapContainerRef.current).setView(initialCoordinates, 13);

    // Usar un proveedor de mapas alternativo con un estilo más claro
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap, ©CartoDB',
      subdomains: 'abcd',
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
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialCoordinates, onConfirm, readOnly]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
};

export default MapComponent;
