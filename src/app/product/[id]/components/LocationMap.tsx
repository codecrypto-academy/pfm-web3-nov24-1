'use client';

export default function LocationMap() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Ubicación</h2>
      
      <div className="aspect-w-16 aspect-h-9 mb-4">
        {/* Aquí integraremos el mapa */}
        <div className="w-full h-64 bg-gray-200 rounded flex items-center justify-center">
          Mapa de ubicación
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Región</h3>
          <p>Sierra de Cazorla, Jaén</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Altitud</h3>
          <p>800m sobre el nivel del mar</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Clima</h3>
          <p>Mediterráneo continental</p>
        </div>
      </div>
    </div>
  );
}
