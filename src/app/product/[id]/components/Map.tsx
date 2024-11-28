'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Position {
  lat: number;
  lng: number;
  participant: {
    name: string;
    role: string;
    address: string;
  };
  isDestination?: boolean;
  connectedTo?: {
    lat: number;
    lng: number;
  };
}

interface MapProps {
  center: L.LatLngExpression;
  positions: Position[];
}

export default function Map({ center, positions }: MapProps) {
  useEffect(() => {
    // Crear el mapa
    const map = L.map('map').setView(center, 6);

    // Añadir el tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Crear los iconos
    const originIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const destinationIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Añadir marcadores y líneas
    const points: L.LatLng[] = [];
    positions.forEach((pos) => {
      const point = L.latLng(pos.lat, pos.lng);
      points.push(point);

      // Crear el marcador con el icono correspondiente
      const icon = pos.isDestination ? destinationIcon : originIcon;
      L.marker(point, { icon })
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-semibold text-lg">${pos.participant.name}</h3>
            <p class="text-gray-600">${pos.participant.role}</p>
          </div>
        `)
        .addTo(map);

      // Si es un punto de origen y tiene destino, dibujar la línea
      if (pos.connectedTo) {
        const destinationPoint = L.latLng(pos.connectedTo.lat, pos.connectedTo.lng);
        L.polyline([point, destinationPoint], {
          color: '#3B82F6',
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 10' // Línea punteada
        }).addTo(map);
      }
    });

    // Ajustar el zoom para mostrar todos los puntos
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points));
    }

    return () => {
      map.remove();
    };
  }, [center, positions]);

  return <div id="map" className="w-full h-full" />;
}
