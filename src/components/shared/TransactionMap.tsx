'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

interface TransactionMapProps {
  fromLocation: [number, number]
  toLocation: [number, number]
  transaction: {
    from: string
    to: string
    product: string
  }
}

export default function TransactionMap({ fromLocation, toLocation, transaction }: TransactionMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const routingControlRef = useRef<L.Routing.Control | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!mapRef.current) {
        // Inicializar el mapa
        mapRef.current = L.map('map').setView([40.4168, -3.7038], 6)

        // Añadir capa de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current)
      }

      // Crear iconos personalizados
      const createCustomIcon = (color: string) => {
        return L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })
      }

      const fromIcon = createCustomIcon('#34D399') // Verde para origen
      const toIcon = createCustomIcon('#F87171') // Rojo para destino

      // Limpiar marcadores y ruta anteriores
      if (routingControlRef.current && mapRef.current) {
        routingControlRef.current.remove()
      }

      // Añadir marcadores
      if (mapRef.current) {
        // Marcador de origen
        L.marker(fromLocation, { icon: fromIcon })
          .addTo(mapRef.current)
          .bindPopup(
            `<b>Origen:</b> ${transaction.from}<br><b>Producto:</b> ${transaction.product}`
          )

        // Marcador de destino
        L.marker(toLocation, { icon: toIcon })
          .addTo(mapRef.current)
          .bindPopup(`<b>Destino:</b> ${transaction.to}`)

        // Configurar la ruta
        routingControlRef.current = L.Routing.control({
          waypoints: [L.latLng(fromLocation), L.latLng(toLocation)],
          routeWhileDragging: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: true,
          showAlternatives: false,
          lineOptions: {
            styles: [{ color: '#4F46E5', weight: 4, opacity: 0.7 }],
          },
        }).addTo(mapRef.current)

        // Ocultar la barra lateral de instrucciones
        const container = routingControlRef.current.getContainer()
        container.style.display = 'none'
      }
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [fromLocation, toLocation, transaction])

  return <div id="map" className="w-full h-full rounded-lg" />
}
