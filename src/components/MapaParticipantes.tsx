'use client'

import React, { useEffect, useRef, useState } from 'react';
import { Participante } from '@/types/types';

interface ParticipantsMapProps {
  participants: Participante[];
}

const MapaParticipantes: React.FC<ParticipantsMapProps> = ({ participants }) => {
  const mapRef = useRef<any>(null);
  const mapContainerId = useRef(`map-${Math.random().toString(36).substr(2, 9)}`);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        require('leaflet/dist/leaflet.css');

        // Configure default icon for markers
        L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.7.1/dist/images/';

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: L.Icon.Default.imagePath + 'marker-icon-2x.png',
          iconUrl: L.Icon.Default.imagePath + 'marker-icon.png',
          shadowUrl: L.Icon.Default.imagePath + 'marker-shadow.png',
        });

        // Initialize map if not already initialized
        if (!mapRef.current) {
          const map = L.map(mapContainerId.current).setView([40.4168, -3.7038], 5);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ' OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          mapRef.current = map;
        }

        // Clear existing markers
        mapRef.current.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            mapRef.current.removeLayer(layer);
          }
        });

        // Create marker group for auto-zoom
        const markerGroup = L.featureGroup().addTo(mapRef.current);

        // Add markers for each participant
        participants.forEach(participant => {
          if (participant.gps) {
            try {
              const [lat, lng] = participant.gps.split(',').map(coord => parseFloat(coord.trim()));
              
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
              console.error(`Error processing coordinates for ${participant.nombre}:`, error);
            }
          }
        });

        // Fit bounds to show all markers
        if (markerGroup.getLayers().length > 0) {
          mapRef.current.fitBounds(markerGroup.getBounds());
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Error loading map');
      }
    };

    initMap();

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isClient, participants]);

  return (
    <div className="relative w-full h-[500px] mt-8 rounded-lg overflow-hidden">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-600">
          {error}
        </div>
      )}
      <div id={mapContainerId.current} className="w-full h-full" />
    </div>
  );
};

export default MapaParticipantes;
