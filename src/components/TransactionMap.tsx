'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'

// Añadir estilos globales para ocultar el panel de instrucciones por defecto
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .leaflet-routing-container {
      display: none !important;
    }
  `
  document.head.appendChild(style)
}

interface TransactionMapProps {
  fromLocation: [number, number]
  toLocation: [number, number]
  transaction: {
    from: string
    to: string
    product: string
  }
}

// Corregir los íconos de Leaflet para Next.js
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  })
}

const TransactionMap: React.FC<TransactionMapProps> = ({ fromLocation, toLocation, transaction }) => {
  const mapRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<any>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const mapContainerId = useRef(`map-${Math.random().toString(36).substr(2, 9)}`);
  const [showInstructions, setShowInstructions] = useState(false);
  const [routeInstructions, setRouteInstructions] = useState<any[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // Función para limpiar el mapa
  const cleanupMap = useCallback(() => {
    if (routingControlRef.current && mapRef.current) {
      try {
        mapRef.current.removeControl(routingControlRef.current);
      } catch (error) {
        console.warn('Error al eliminar el control de ruta:', error);
      }
      routingControlRef.current = null;
    }

    if (mapRef.current) {
      markersRef.current.forEach(marker => {
        if (marker) {
          marker.remove();
        }
      });
      markersRef.current = [];

      mapRef.current.remove();
      mapRef.current = null;
      setIsMapReady(false);
    }
  }, []);

  // Efecto para inicializar el mapa
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map(mapContainerId.current, {
        zoomControl: true,
        attributionControl: true
      }).setView(fromLocation, 8);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
      }).addTo(map);
      
      mapRef.current = map;
      setIsMapReady(true);
    }

    return () => {
      cleanupMap();
    };
  }, [cleanupMap]);

  // Efecto para añadir marcadores y ruta
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    // Verificar que las coordenadas son válidas
    if (fromLocation && toLocation && 
        fromLocation[0] !== 0 && fromLocation[1] !== 0 && 
        toLocation[0] !== 0 && toLocation[1] !== 0) {
      try {
        // Limpiar marcadores y ruta anteriores
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        
        if (routingControlRef.current && mapRef.current) {
          mapRef.current.removeControl(routingControlRef.current);
          routingControlRef.current = null;
        }

        // Crear marcadores personalizados
        const fromIcon = L.divIcon({
          className: 'custom-marker-icon',
          html: `<div class="px-3 py-2 bg-white border-2 border-olive-600 rounded-lg shadow-md">
                  <span class="text-olive-600 font-bold text-sm whitespace-nowrap">${transaction.from}</span>
                </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        });

        const toIcon = L.divIcon({
          className: 'custom-marker-icon',
          html: `<div class="px-3 py-2 bg-white border-2 border-olive-800 rounded-lg shadow-md">
                  <span class="text-olive-800 font-bold text-sm whitespace-nowrap">${transaction.to}</span>
                </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        });

        // Añadir marcadores
        const fromMarker = L.marker(fromLocation, { icon: fromIcon })
          .bindPopup(`<div class="p-2">
            <p class="font-bold text-olive-600 mb-1">${transaction.from}</p>
            <p class="text-gray-600"><span class="font-semibold">Producto:</span> ${transaction.product}</p>
          </div>`)
          .addTo(mapRef.current);
        
        const toMarker = L.marker(toLocation, { icon: toIcon })
          .bindPopup(`<div class="p-2">
            <p class="font-bold text-olive-800">${transaction.to}</p>
          </div>`)
          .addTo(mapRef.current);

        markersRef.current = [fromMarker, toMarker];

        // Crear el control de ruta
        const routingControl = L.Routing.control({
          waypoints: [
            L.latLng(fromLocation[0], fromLocation[1]),
            L.latLng(toLocation[0], toLocation[1])
          ],
          routeWhileDragging: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: true,
          showAlternatives: false,
          createMarker: () => null,
          lineOptions: {
            styles: [{ color: '#4F772D', opacity: 0.8, weight: 4 }]
          },
          router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'driving',
            language: 'es'
          })
        });

        routingControl.on('routesfound', function(e) {
          if (!mapRef.current) return;
          
          const routes = e.routes;
          if (routes && routes.length > 0) {
            setRouteInstructions(routes[0].instructions || []);
            
            if (routes[0].coordinates.length > 0) {
              const bounds = L.latLngBounds(routes[0].coordinates);
              mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }
          }
        });

        if (mapRef.current) {
          routingControl.addTo(mapRef.current);
          routingControlRef.current = routingControl;

          // Ajustar el zoom para mostrar toda la ruta
          const bounds = L.latLngBounds([fromLocation, toLocation]);
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.error('Error al crear la ruta:', error);
      }
    }
  }, [isMapReady, fromLocation, toLocation, transaction]);

  return (
    <div className="relative h-full">
      <div id={mapContainerId.current} className="h-full w-full"></div>
      
      {/* Botón para mostrar/ocultar instrucciones */}
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="absolute top-4 right-4 bg-olive-600 hover:bg-olive-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200 z-[1001]"
      >
        {showInstructions ? 'Ocultar Ruta' : 'Mostrar Ruta'}
      </button>

      {/* Panel de instrucciones personalizado */}
      {showInstructions && routeInstructions.length > 0 && (
        <div className="absolute right-4 top-16 w-80 max-h-[calc(100%-5rem)] bg-white rounded-md shadow-lg overflow-y-auto z-[1002]">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-olive-800 mb-2">Instrucciones de Ruta</h3>
            <div className="space-y-2">
              {routeInstructions.map((instruction, index) => (
                <div key={index} className="text-sm border-b border-gray-100 pb-2">
                  <span className="text-olive-600">{index + 1}.</span> {instruction.text}
                  {instruction.distance > 0 && (
                    <span className="text-gray-500 text-xs block">
                      {(instruction.distance / 1000).toFixed(1)} km
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionMap
