import React, { useState, useEffect, useCallback } from 'react';
import L, { Map, Marker } from 'leaflet';
import '../styles/MapModalStyles.css'; // Import CSS

/** Props Interface */
interface MapModalProps {
  onConfirm: (coordinates: { lat: number; lng: number }) => void;
  onClose: () => void;
}

/** Component: MapModal */
const MapModal: React.FC<MapModalProps> = ({ onConfirm, onClose }) => {
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [markerInstance, setMarkerInstance] = useState<Marker | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapInstance) {
      const map = L.map('map').setView([0, 0], 2);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      map.on('click', handleMapClick);
      setMapInstance(map);
    }

    return () => {
      mapInstance?.remove(); // Clean up on unmount
    };
  }, [mapInstance]);

  // Handle Map Click
  const handleMapClick = useCallback((event: L.LeafletMouseEvent) => {
    const { lat, lng } = event.latlng;

    if (!isValidCoordinate(lat, lng)) {
      alert('Invalid coordinates. Please select a valid location.');
      return;
    }

    setSelectedCoordinates({ lat, lng });

    if (markerInstance) {
      markerInstance.setLatLng(event.latlng);
    } else {
      const marker = L.marker(event.latlng).addTo(mapInstance!);
      setMarkerInstance(marker);
    }
  }, [markerInstance, mapInstance]);

  // Validate Coordinates
  const isValidCoordinate = (lat: number, lng: number): boolean =>
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  // Confirm Selection
  const handleConfirm = () => {
    if (!selectedCoordinates) {
      alert('Please select a location before confirming.');
      return;
    }

    onConfirm(selectedCoordinates);
  };

  return (
    <div className={`modal ${mapInstance ? 'modal-open' : ''}`}>
      <div className="modal-content">
        <h2>Select a Location</h2>
        <div id="map"></div>
        <button className="confirm-btn" onClick={handleConfirm}>
          Confirm
        </button>
        <button className="close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default MapModal;
