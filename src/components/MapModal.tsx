import React, { useState, useEffect, useCallback, useRef } from 'react';
import L, { Map, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/MapModalStyles.css';

// Configurar el icono por defecto para los marcadores
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/** Props Interface */
interface MapModalProps {
  onConfirm: (coordinates: { lat: number; lng: number }) => void;
  onClose: () => void;
}

/** Component: MapModal */
const MapModal: React.FC<MapModalProps> = ({ onConfirm, onClose }) => {
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const containerRef = useRef<string>(`map-${Math.random().toString(36).substr(2, 9)}`);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Map
  useEffect(() => {
    // Crear el mapa
    const map = L.map(containerRef.current).setView([40.4168, -3.7038], 6);
    
    // Añadir el tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ' OpenStreetMap contributors',
    }).addTo(map);

    // Guardar referencia al mapa
    mapRef.current = map;

    // Añadir el evento click
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Validar coordenadas
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert('Coordenadas inválidas. Por favor, seleccione otra ubicación.');
        return;
      }

      // Actualizar coordenadas seleccionadas
      setSelectedCoordinates({ lat, lng });

      // Eliminar marcador anterior si existe
      if (markerRef.current && map) {
        map.removeLayer(markerRef.current);
      }

      // Crear nuevo marcador
      const marker = L.marker([lat, lng]).addTo(map);
      markerRef.current = marker;
    });

    // Cleanup al desmontar
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Manejar confirmación
  const handleConfirm = () => {
    if (!selectedCoordinates) {
      alert('Por favor, seleccione una ubicación en el mapa.');
      return;
    }
    onConfirm(selectedCoordinates);
  };

  return (
    <div className="modal modal-open">
      <div className="modal-content">
        <h2>Seleccionar Ubicación</h2>
        <div id={containerRef.current} style={{ width: '100%', height: '300px' }}></div>
        <div className="flex justify-between mt-4">
          <button className="confirm-btn" onClick={handleConfirm}>
            Confirmar
          </button>
          <button className="close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapModal;
