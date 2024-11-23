import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Participante } from '@/types/types';

interface ParticipantsMapProps {
  participants: Participante[];
}

const MapaParticipantes: React.FC<ParticipantsMapProps> = ({ participants }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerId = useRef(`map-${Math.random().toString(36).substr(2, 9)}`);
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

      if (!mapRef.current) {
        // Inicializar el mapa
        const map = L.map(mapContainerId.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          dragging: !L.Browser.mobile
        }).setView([40.4168, -3.7038], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: ' OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        mapRef.current = map;
      }

      // Limpiar marcadores existentes
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          mapRef.current?.removeLayer(layer);
        }
      });

      // Grupo de marcadores para ajustar el zoom automáticamente
      const markerGroup = L.featureGroup();

      // Añadir marcadores para cada participante
      participants.forEach(participant => {
        if (participant.gps) {
          try {
            console.log('GPS original:', participant.gps);
            // Las coordenadas GPS vienen en formato "latitud,longitud"
            const [lat, lng] = participant.gps.split(',').map(coord => parseFloat(coord.trim()));
            console.log('Coordenadas procesadas:', { lat, lng });
            
            if (!isNaN(lat) && !isNaN(lng)) {
              const marker = L.marker([lat, lng])
                .bindPopup(`
                  <div class="text-sm">
                    <strong>${participant.nombre}</strong><br/>
                    <strong>Rol:</strong> ${participant.rol}<br/>
                    <strong>Coordenadas:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}
                  </div>
                `);
              markerGroup.addLayer(marker);
            }
          } catch (error) {
            console.error(`Error al procesar coordenadas para ${participant.nombre}:`, error);
          }
        }
      });

      // Añadir el grupo de marcadores al mapa
      markerGroup.addTo(mapRef.current);

      // Ajustar el zoom para mostrar todos los marcadores
      if (markerGroup.getLayers().length > 0) {
        mapRef.current.fitBounds(markerGroup.getBounds(), { padding: [50, 50] });
      }

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
      };
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Error al cargar el mapa. Por favor, intente de nuevo.');
    }
  }, [participants]);

  if (error) {
    return (
      <div className="mt-8 rounded-lg overflow-hidden shadow-lg border border-gray-200">
        <div className="bg-white p-4 border-b">
          <h2 className="text-xl font-semibold">Mapa de Participantes</h2>
        </div>
        <div className="h-[500px] flex items-center justify-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg overflow-hidden shadow-lg border border-gray-200">
      <div className="bg-white p-4 border-b">
        <h2 className="text-xl font-semibold">Mapa de Participantes</h2>
      </div>
      <div 
        id={mapContainerId.current} 
        style={{ height: '500px', width: '100%' }}
      />
    </div>
  );
};

export default MapaParticipantes;
