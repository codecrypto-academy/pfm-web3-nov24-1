'use client';

import { ProductData } from '../types';

interface ProductDetailsProps {
  data: ProductData;
}

export default function ProductDetails({ data }: ProductDetailsProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Detalles del Producto</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Variedad</h3>
          <p>Picual</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Origen</h3>
          <p>Jaén, España</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Cosecha</h3>
          <p>2023</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Método de Extracción</h3>
          <p>Primera extracción en frío</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Certificaciones</h3>
          <div className="flex gap-2 mt-2">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Ecológico
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              D.O.P.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
