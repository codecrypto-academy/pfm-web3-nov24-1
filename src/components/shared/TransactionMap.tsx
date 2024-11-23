'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface TransactionMapProps {
  fromLocation: [number, number]
  toLocation: [number, number]
  transaction: {
    from: string
    to: string
    product: string
    id?: string | number
  }
}

export default function TransactionMap({ fromLocation, toLocation, transaction }: TransactionMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapId = `map-${transaction.id || Math.random().toString(36).substr(2, 9)}`

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Validar coordenadas
    if (!Array.isArray(fromLocation) || !Array.isArray(toLocation) ||
        fromLocation.length !== 2 || toLocation.length !== 2 ||
        !fromLocation.every(coord => typeof coord === 'number') ||
        !toLocation.every(coord => typeof coord === 'number')) {
      console.error('Coordenadas inválidas:', { fromLocation, toLocation })
      return
    }

    // Limpiar el mapa anterior si existe
    if (mapRef.current) {
      mapRef.current.remove()
    }

    try {
      // Inicializar el mapa
      const map = L.map(mapId)
      mapRef.current = map

      // Añadir capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)

      // Crear iconos personalizados
      const createCustomIcon = (color: string) => {
        return L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="
              background-color: ${color}; 
              width: 24px; 
              height: 24px; 
              border-radius: 50%; 
              border: 3px solid white; 
              box-shadow: 0 0 10px rgba(0,0,0,0.3);
              position: relative;
            ">
              <div style="
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 2px;
                height: 8px;
                background-color: ${color};
              "></div>
            </div>
          `,
          iconSize: [24, 32],
          iconAnchor: [12, 32],
          popupAnchor: [0, -32]
        })
      }

      const fromIcon = createCustomIcon('#34D399') // Verde para origen
      const toIcon = createCustomIcon('#F87171') // Rojo para destino

      // Añadir marcadores
      const fromMarker = L.marker(fromLocation, { icon: fromIcon })
        .bindPopup(`<b>Origen:</b> ${transaction.from}<br><b>Producto:</b> ${transaction.product}`)
        .addTo(map)

      const toMarker = L.marker(toLocation, { icon: toIcon })
        .bindPopup(`<b>Destino:</b> ${transaction.to}`)
        .addTo(map)

      // Crear una línea entre los puntos
      const path = L.polyline([fromLocation, toLocation], {
        color: '#6366F1',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 10',
        lineJoin: 'round'
      }).addTo(map)

      // Calcular el punto medio y la distancia
      const midLat = (fromLocation[0] + toLocation[0]) / 2
      const midLng = (fromLocation[1] + toLocation[1]) / 2
      const distance = map.distance(fromLocation, toLocation) / 1000 // convertir a km

      // Añadir etiqueta de distancia
      L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'distance-label',
          html: `<div style="
            background: white;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #6366F1;
            font-size: 12px;
            color: #4F46E5;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          ">${Math.round(distance)} km</div>`,
          iconSize: [80, 30],
          iconAnchor: [40, 15]
        })
      }).addTo(map)

      // Ajustar el mapa para mostrar todos los puntos
      const bounds = L.latLngBounds([fromLocation, toLocation])
      map.fitBounds(bounds, { padding: [50, 50] })
    } catch (error) {
      console.error('Error al inicializar el mapa:', error)
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [fromLocation, toLocation, transaction, mapId])

  return <div id={mapId} className="w-full h-full rounded-lg" />
}
