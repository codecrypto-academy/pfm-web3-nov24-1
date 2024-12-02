'use client';

import { ProductData, TokenInfo } from '../types';
import { attributeLabels } from '@/utils/attributeLabels';

interface ProductDetailsProps {
  data: ProductData;
}

// Orden específico de los atributos que queremos mostrar
const attributeOrder = [
  'descripcion',
  'Esreceta',
  'TipoProducto',
  'Estado',
  'Tipo',
  'RolVendedor',
];

// Función para determinar las unidades según el nombre del producto
const getUnitsByProductName = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('aceite')) return 'ml';
  if (lowerName.includes('aceituna') || lowerName.includes('oliva')) return 'kg';
  return 'unidades';
};

// Función para formatear la cantidad según las unidades
const formatQuantity = (quantity: number, units: string): string => {
  if (!quantity) return '0 ' + units;
  
  try {
    if (units === 'kg') {
      return `${(quantity / 1000).toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} ${units}`;
    }
    return `${quantity.toLocaleString()} ${units}`;
  } catch (error) {
    console.error('Error formateando cantidad:', quantity, units, error);
    return `${quantity} ${units}`;
  }
};

// Función para extraer información del token
const parseTokenInfo = (tokenValue: string) => {
  const [name, ...rest] = tokenValue.split(' ID:');
  const restString = rest.join(' ID:'); // Por si hay más de un "ID:" en el string
  
  // Extraer ID y cantidad
  const idMatch = restString.match(/^(\d+)/);
  const cantidadMatch = restString.match(/Cantidad:(\d+)/);
  
  return {
    name: name.trim(),
    id: idMatch ? idMatch[1] : '',
    cantidad: cantidadMatch ? parseInt(cantidadMatch[1]) : 0
  };
};

const AttributesList = ({ attributes, productName }: { attributes: Record<string, string | number>, productName: string }) => {
  const tokenOrigins: Record<string, string> = {};
  const regularAttributes: [string, string | number][] = [];

  Object.entries(attributes).forEach(([key, value]) => {
    if (key.startsWith('Token_Origen_')) {
      tokenOrigins[key] = String(value);
    } else if (attributeOrder.includes(key)) {
      regularAttributes.push([key, value]);
    }
  });

  const sortedRegularAttributes = regularAttributes.sort(([keyA], [keyB]) => {
    return attributeOrder.indexOf(keyA) - attributeOrder.indexOf(keyB);
  });

  return (
    <div className="space-y-6">
      {/* Atributos regulares */}
      <div className="space-y-3">
        {sortedRegularAttributes.map(([key, value]) => (
          <div key={key} className="grid grid-cols-2 gap-4">
            <h3 className="font-semibold text-gray-700">{attributeLabels[key] || key}:</h3>
            <p className="text-gray-600">
              {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Tokens de origen e ingredientes */}
      {Object.keys(tokenOrigins).length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-800 mb-4">Composición del Producto</h3>
          <div className="space-y-4">
            {Object.entries(tokenOrigins).map(([key, tokenValue]) => {
              const tokenInfo = parseTokenInfo(tokenValue);
              const units = getUnitsByProductName(tokenInfo.name);

              return (
                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    {attributeLabels[key] || key}
                  </h4>
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      {tokenInfo.name} (ID: {tokenInfo.id})
                    </p>
                    <p className="text-gray-500">
                      Cantidad utilizada: {formatQuantity(tokenInfo.cantidad, units)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const TokenDetails = ({ token, step }: { token: TokenInfo, step?: { hash: string, timestamp: string } }) => {
  const units = getUnitsByProductName(token.nombre);
  
  return (
    <div className="space-y-6">
      {/* Información principal */}
      <div className="border-b pb-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <h3 className="font-semibold text-gray-700">Nombre:</h3>
            <p className="text-gray-600">{token.nombre}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <h3 className="font-semibold text-gray-700">Cantidad:</h3>
            <p className="text-gray-600">{formatQuantity(token.cantidad, units)}</p>
          </div>
          {step && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <h3 className="font-semibold text-gray-700">Fecha de Creación:</h3>
                <p className="text-gray-600">
                  {new Date(step.timestamp).toLocaleString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="pt-2">
                <h3 className="font-semibold text-gray-700 mb-1">Hash de Blockchain:</h3>
                <p className="text-xs text-gray-500 font-mono break-all">
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${step.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                  >
                    {step.hash}
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Atributos */}
      <AttributesList attributes={token.atributos} productName={token.nombre} />
    </div>
  );
};

export default function ProductDetails({ data }: ProductDetailsProps) {
  // Obtener el último paso que tenga tokenInfo (producto procesado)
  const lastStep = [...data.steps]
    .reverse()
    .find(step => step.tokenInfo);

  const processedProduct = lastStep?.tokenInfo;

  const rawMaterials = [...data.steps]
    .reverse()
    .find(step => step.materiaPrima)?.materiaPrima;

  if (!processedProduct) {
    return <div>No hay información disponible del producto</div>;
  }

  return (
    <div className="space-y-8">
      {/* Producto Procesado */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Producto Final</h2>
        <TokenDetails token={processedProduct} step={lastStep} />
      </div>

      {/* Materia Prima */}
      {rawMaterials && rawMaterials.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Materia Prima</h2>
          <div className="space-y-6">
            {rawMaterials.map((material, index) => (
              <div key={material.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">
                  Material #{index + 1}
                </h3>
                <TokenDetails token={material} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
