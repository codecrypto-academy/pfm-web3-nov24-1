'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { TimelineStep } from '../types';
import type { LatLngExpression } from 'leaflet';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-gray-100 animate-pulse" />
});

interface LocationMapProps {
  steps: TimelineStep[];
}

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

export default function LocationMap({ steps }: LocationMapProps) {
  const positions = useMemo(() => {
    const allPositions: Position[] = [];

    steps.forEach(step => {
      // Si es una venta o no hay coordenadas, omitir
      if (step.participant.role === 'VENTA' || !step.details.coordenadas) return;
      
      // Si no hay destinatario o es una venta, omitir
      if (!step.details.destinatario || 
          (step.details.destinatario as any).role === 'VENTA') return;

      // Validar que las coordenadas sean números válidos
      const fromCoords = step.details.coordenadas.split(',').map(Number);
      const destinatario = step.details.destinatario as {
        name: string;
        role: string;
        address: string;
        coordenadas: string;
      };

      // Si no hay coordenadas del destinatario o son inválidas, omitir
      if (!destinatario.coordenadas) return;
      const toCoords = destinatario.coordenadas.split(',').map(Number);

      // Validar que todas las coordenadas sean números válidos
      if (fromCoords.length !== 2 || toCoords.length !== 2 ||
          fromCoords.some(isNaN) || toCoords.some(isNaN)) return;

      const [fromLat, fromLng] = fromCoords;
      const [toLat, toLng] = toCoords;

      // Añadir posición del origen
      allPositions.push({
        lat: fromLat,
        lng: fromLng,
        participant: {
          name: step.participant.name,
          role: step.participant.role,
          address: step.participant.address
        },
        connectedTo: {
          lat: toLat,
          lng: toLng
        }
      });

      // Añadir posición del destino
      allPositions.push({
        lat: toLat,
        lng: toLng,
        participant: {
          name: destinatario.name,
          role: destinatario.role,
          address: destinatario.address
        },
        isDestination: true
      });
    });

    return allPositions;
  }, [steps]);

  if (positions.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">No hay datos de ubicación disponibles</p>
      </div>
    );
  }

  // Usar la primera posición como centro del mapa
  const center: LatLngExpression = [positions[0].lat, positions[0].lng];

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
    <div className="w-full h-[400px] rounded-lg overflow-hidden ">
      <h2 className="text-2xl font-bold mb-6">Ruta del Producto</h2>
      <Map center={center} positions={positions} />
    </div>
    </div>
  );
}