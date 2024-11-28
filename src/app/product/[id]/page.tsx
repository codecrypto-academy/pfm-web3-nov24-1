'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/constants/contracts';
import ProductTraceabilityTree from './components/ProductTraceabilityTree';
import ProductDetails from './components/ProductDetails';
import QualityInfo from './components/QualityInfo';
import LocationMap from './components/LocationMap';
import { TokenInfo, TimelineStep, ProductData, User } from '@/types/product';

async function getTokenTransfers(tokenId: string, tokensContract: ethers.Contract, usuariosContract: ethers.Contract, provider: ethers.Provider) {
  const steps: TimelineStep[] = [];
  const processedTransfers = new Set<string>();

  // Obtener eventos de transferencia
  const latestBlock = await provider.getBlockNumber();
  const transferFilter = tokensContract.filters.TokenTransferido();
  const transferEvents = await tokensContract.queryFilter(transferFilter, 0, latestBlock);

  // Obtener información del token
  const token = await tokensContract.tokens(tokenId);
  const nombresAtributos = await tokensContract.getNombresAtributos(tokenId);
  const atributos: Record<string, string | number> = {};
  
  for (const nombre of nombresAtributos) {
    const attr = await tokensContract.getAtributo(tokenId, nombre);
    if (attr && attr[1] !== undefined) {
      atributos[nombre] = attr[1];
    }
  }

  // Procesar eventos de transferencia para este token
  for (const event of transferEvents) {
    if (!(event instanceof ethers.EventLog)) continue;
    
    const args = event.args || {};
    const currentTokenId = args.tokenId;
    const from = args.from;
    const to = args.to;
    const cantidad = args.cantidad;

    if (!currentTokenId || currentTokenId.toString() !== tokenId) continue;
    
    // Evitar duplicados
    const transferKey = `${event.transactionHash}-${currentTokenId}`;
    if (processedTransfers.has(transferKey)) continue;
    processedTransfers.add(transferKey);

    // Obtener información de los usuarios
    const usuarios = await usuariosContract.getUsuarios();
    const fromUser = usuarios.find((user: User) => user.direccion.toLowerCase() === from.toLowerCase());
    const toUser = usuarios.find((user: User) => user.direccion.toLowerCase() === to.toLowerCase());
    
    if (!fromUser || !toUser) {
      console.error('Usuario no encontrado:', !fromUser ? from : to);
      continue;
    }

    steps.push({
      hash: event.transactionHash,
      timestamp: new Date(Number(token[5]) * 1000).toISOString(),
      participant: {
        name: fromUser.nombre,
        role: fromUser.rol,
        address: from
      },
      details: {
        Cantidad: cantidad.toString(),
        Estado: "Completado",
        coordenadas: fromUser.gps,
        destinatario: {
          name: toUser.nombre,
          role: toUser.rol,
          address: to,
          coordenadas: toUser.gps
        }
      },
      tokenInfo: {
        id: currentTokenId.toString(),
        nombre: token[1],
        cantidad: Number(cantidad),
        atributos: { ...atributos }
      }
    });
  }

  return steps;
}

export default function ProductTrackingPage() {
  const params = useParams();
  const productId = params && typeof params.id === 'string' ? params.id : '';
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId || typeof window === 'undefined' || !window.ethereum) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Extraer el número de lote del QR
        const [batchNumber] = productId.split('-');
        console.log('Número de Lote:', batchNumber);
        
        const tokensContract = new ethers.Contract(
          CONTRACTS.Tokens.address,
          CONTRACTS.Tokens.abi,
          signer
        );

        const usuariosContract = new ethers.Contract(
          CONTRACTS.Usuarios.address,
          CONTRACTS.Usuarios.abi,
          signer
        );

        // Obtener todos los eventos de transferencia del producto principal
        let allSteps = await getTokenTransfers(batchNumber, tokensContract, usuariosContract, provider);

        // Buscar materias primas en los atributos del token principal
        const token = await tokensContract.tokens(batchNumber);
        const nombresAtributos = await tokensContract.getNombresAtributos(batchNumber);
        const atributos: Record<string, string | number> = {};
        
        for (const nombre of nombresAtributos) {
          const attr = await tokensContract.getAtributo(batchNumber, nombre);
          if (attr && attr[1] !== undefined) {
            atributos[nombre] = attr[1];
          }
        }

        // Si es un producto procesado, obtener el historial de las materias primas
        if (atributos['Tipo_Producto'] === 'Procesado') {
          const materiasPrimasPromises = [];
          
          // Buscar tokens de origen en los atributos
          for (const [key, valor] of Object.entries(atributos)) {
            if (key.startsWith('Token_Origen_')) {
              const valorStr = String(valor);
              const match = valorStr.match(/ID:(\d+) Cantidad:(\d+)/);
              if (match) {
                const [, mpTokenId, cantidad] = match;
                // Obtener información del token de materia prima
                const mpToken = await tokensContract.tokens(mpTokenId);
                const mpNombresAtributos = await tokensContract.getNombresAtributos(mpTokenId);
                const mpAtributos: Record<string, string | number> = {};
                
                for (const nombre of mpNombresAtributos) {
                  const attr = await tokensContract.getAtributo(mpTokenId, nombre);
                  if (attr && attr[1] !== undefined) {
                    mpAtributos[nombre] = attr[1];
                  }
                }

                // Obtener transferencias de la materia prima
                const mpSteps = await getTokenTransfers(mpTokenId, tokensContract, usuariosContract, provider);
                
                // Agregar información adicional a cada paso de la materia prima
                const enhancedMpSteps = mpSteps.map(step => ({
                  ...step,
                  tokenInfo: {
                    id: mpTokenId,
                    nombre: mpToken.nombre,
                    cantidad: Number(cantidad),
                    atributos: mpAtributos
                  }
                }));
                
                materiasPrimasPromises.push(Promise.resolve(enhancedMpSteps));
              }
            }
          }

          // Esperar a que se resuelvan todas las promesas de materias primas
          const materiasPrimasSteps = await Promise.all(materiasPrimasPromises);
          
          // Agregar los pasos de las materias primas al historial
          allSteps = [...allSteps, ...materiasPrimasSteps.flat()];
        }

        // Ordenar todos los pasos por timestamp
        allSteps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setProductData({
          steps: allSteps,
          batchId: batchNumber
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product data:', error);
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Información del Producto</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : productData ? (
        <div className="space-y-8">
          {/* Primera fila: Detalles del producto y mapa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProductDetails data={productData} />
            <LocationMap steps={productData.steps} />
          </div>

          {/* Segunda fila: Información de calidad */}
          <div className="mt-6">
            <QualityInfo data={productData} />
          </div>

          {/* Tercera fila: Árbol de trazabilidad */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Trazabilidad del Producto</h2>
            <ProductTraceabilityTree data={productData} />
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-600">
          No se encontró información del producto
        </div>
      )}
    </div>
  );
}
