import React, { useEffect, useRef } from 'react';
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
  const containerRef = useRef<string>(`map-${Math.random().toString(36).substr(2, 9)}`);

  const calculateAndDrawRoute = async (start: [number, number], end: [number, number]) => {
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

        // Eliminar ruta anterior si existe
        if (routeLayerRef.current && mapRef.current) {
          mapRef.current.removeLayer(routeLayerRef.current);
        }

        // Dibujar nueva ruta
        if (mapRef.current) {
          routeLayerRef.current = L.polyline(coordinates, {
            color: 'blue',
            weight: 3,
            opacity: 0.7,
          }).addTo(mapRef.current);

          // Ajustar el mapa para mostrar toda la ruta
          mapRef.current.fitBounds(routeLayerRef.current.getBounds(), {
            padding: [50, 50],
          });
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  useEffect(() => {
    // Crear el mapa
    const map = L.map(containerRef.current).setView([40.4168, -3.7038], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ' OpenStreetMap contributors',
    }).addTo(map);

    // Guardar referencia al mapa
    mapRef.current = map;

    // Añadir marcadores de origen y destino con popups informativos
    const originMarker = L.marker(originPoint.coordinates)
      .bindPopup(`<b>${originPoint.type === 'producer' ? 'Productor' : 'Fábrica'}</b><br>${originPoint.name}`)
      .addTo(map);
    
    const destinationMarker = L.marker(destinationPoint.coordinates)
      .bindPopup(`<b>${destinationPoint.type === 'producer' ? 'Productor' : 'Fábrica'}</b><br>${destinationPoint.name}`)
      .addTo(map);

    markersRef.current = [originMarker, destinationMarker];

    // Calcular y dibujar la ruta
    calculateAndDrawRoute(originPoint.coordinates, destinationPoint.coordinates);

    return () => {
      map.remove();
    };
  }, [originPoint, destinationPoint]);

  return (
    <div className="modal modal-open">
      <div className="modal-content">
        <h2>Trazar Ruta</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ruta entre {originPoint.name} y {destinationPoint.name}
        </p>
        <div id={containerRef.current} style={{ width: '100%', height: '400px' }}></div>
        <div className="flex justify-between mt-4">
          <button 
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;
