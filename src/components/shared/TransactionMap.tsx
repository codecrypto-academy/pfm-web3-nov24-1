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
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Limpiar el mapa anterior si existe
      if (mapRef.current) {
        mapRef.current.remove()
      }

      // Limpiar los marcadores anteriores
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Limpiar el control de ruta anterior si existe
      if (routingControlRef.current) {
        routingControlRef.current.remove()
        routingControlRef.current = null
      }

      // Inicializar el mapa
      mapRef.current = L.map('map').setView([40.4168, -3.7038], 6)

      // Añadir capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current)

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
          popupAnchor: [0, -32],
        })
      }

      const fromIcon = createCustomIcon('#34D399') // Verde para origen
      const toIcon = createCustomIcon('#F87171') // Rojo para destino

      if (mapRef.current) {
        try {
          // Marcador de origen
          const fromMarker = L.marker(fromLocation, { icon: fromIcon })
            .addTo(mapRef.current)
            .bindPopup(
              `<b>Origen:</b> ${transaction.from}<br><b>Producto:</b> ${transaction.product}`
            )
          markersRef.current.push(fromMarker)

          // Marcador de destino
          const toMarker = L.marker(toLocation, { icon: toIcon })
            .addTo(mapRef.current)
            .bindPopup(`<b>Destino:</b> ${transaction.to}`)
          markersRef.current.push(toMarker)

          // Configurar la ruta usando GraphHopper
          const routingControl = L.Routing.control({
            waypoints: [L.latLng(fromLocation), L.latLng(toLocation)],
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
            router: L.Routing.osrmv1({
              serviceUrl: 'https://router.project-osrm.org/route/v1',
              profile: 'driving'
            }),
            lineOptions: {
              styles: [{ color: '#4F46E5', weight: 4, opacity: 0.7 }],
            },
          })

          routingControl.addTo(mapRef.current)
          routingControlRef.current = routingControl

          // Ocultar la barra lateral de instrucciones
          const container = routingControl.getContainer()
          if (container) {
            container.style.display = 'none'
          }

          // Ajustar el mapa para mostrar todos los puntos
          const bounds = L.latLngBounds([fromLocation, toLocation])
          mapRef.current.fitBounds(bounds, { padding: [50, 50] })

        } catch (error) {
          console.error('Error al configurar el mapa:', error)
        }
      }
    }

    // Cleanup
    return () => {
      // Limpiar los marcadores
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Limpiar el control de ruta
      if (routingControlRef.current) {
        routingControlRef.current.remove()
        routingControlRef.current = null
      }

      // Limpiar el mapa
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [fromLocation, toLocation, transaction])

  return <div id="map" className="w-full h-full rounded-lg" />
}
