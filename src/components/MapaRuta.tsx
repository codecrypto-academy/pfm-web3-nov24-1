import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/MapModalStyles.css';

// Configurar el icono por defecto para los marcadores
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteMapProps {
  onClose: () => void;
  originPoint: {
    coordinates: [number, number];
    name: string;
    type: 'producer' | 'factory';
  };
  destinationPoint: {
    coordinates: [number, number];
    name: string;
    type: 'producer' | 'factory';
  };
}

const RouteMap: React.FC<RouteMapProps> = ({ onClose, originPoint, destinationPoint }) => {
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const calculateAndDrawRoute = useCallback(async (start: [number, number], end: [number, number]) => {
    if (!mapRef.current) return;

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.code === 'Ok' && data.routes[0]) {
        const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => [
          coord[1],
          coord[0],
        ]);

        if (routeLayerRef.current) {
          routeLayerRef.current.remove();
        }

        routeLayerRef.current = L.polyline(coordinates, {
          color: 'blue',
          weight: 3,
          opacity: 0.7,
        }).addTo(mapRef.current);

        const bounds = L.latLngBounds([originPoint.coordinates, destinationPoint.coordinates]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  }, [originPoint.coordinates, destinationPoint.coordinates]);

  // Inicializar mapa
  useEffect(() => {
    let isMounted = true;

    const initializeMap = () => {
      if (!mapContainerRef.current || mapRef.current) return;

      // Crear el mapa con una vista inicial que incluya ambos puntos
      const bounds = L.latLngBounds([originPoint.coordinates, destinationPoint.coordinates]);
      const map = L.map(mapContainerRef.current, {
        center: bounds.getCenter(),
        zoom: 6
      });

      // Añadir capa de tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
      }).addTo(map);

      // Añadir marcadores
      const originMarker = L.marker(originPoint.coordinates, {
        title: originPoint.name
      }).addTo(map);
      
      const destinationMarker = L.marker(destinationPoint.coordinates, {
        title: destinationPoint.name
      }).addTo(map);

      markersRef.current = [originMarker, destinationMarker];
      mapRef.current = map;

      // Ajustar vista y calcular ruta
      map.fitBounds(bounds, { padding: [50, 50] });
      calculateAndDrawRoute(originPoint.coordinates, destinationPoint.coordinates);

      // Forzar actualización del tamaño del mapa
      setTimeout(() => {
        if (isMounted && mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    };

    // Inicializar con un pequeño retraso
    const timer = setTimeout(initializeMap, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [originPoint, destinationPoint, calculateAndDrawRoute]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Ruta del Producto</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div style={{ height: '600px', width: '100%', position: 'relative' }}>
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

        <div className="p-4 border-t">
          <div className="text-sm text-gray-600">
            Origen: {originPoint.name}<br/>
            Destino: {destinationPoint.name}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
