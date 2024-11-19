import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Participante } from '@/types/types';

// Configurar el icono por defecto para los marcadores
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ParticipantsMapProps {
  participants: Participante[];
}

const ParticipantsMap: React.FC<ParticipantsMapProps> = ({ participants }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerId = useRef(`map-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!mapRef.current) {
      // Inicializar el mapa
      const map = L.map(mapContainerId.current).setView([40.4168, -3.7038], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      mapRef.current = map;
    }

    // Grupo de marcadores para ajustar el zoom automáticamente
    const markerGroup = L.featureGroup();

    // Añadir marcadores para cada participante
    participants.forEach(participant => {
      if (participant.gps) {
        try {
          const [lat, lng] = participant.gps.split(',').map(coord => parseFloat(coord.trim()));
          if (!isNaN(lat) && !isNaN(lng)) {
            const marker = L.marker([lat, lng])
              .bindPopup(`
                <div class="text-sm">
                  <strong>${participant.nombre}</strong><br/>
                  ${participant.email}<br/>
                  Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}
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

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [participants]);

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

export default ParticipantsMap;
