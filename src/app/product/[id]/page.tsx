'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ethers, Interface } from 'ethers';
import { CONTRACTS } from '@/constants/contracts';
import ProductTimeline from './components/ProductTimeline';
import ProductDetails from './components/ProductDetails';
import QualityInfo from './components/QualityInfo';
import LocationMap from './components/LocationMap';

interface ProductData {
  steps: Array<{
    hash: string;
    timestamp: string;
    participant: {
      name: string;
      role: string;
      address: string;
    };
    details: {
      [key: string]: string | number;
    };
  }>;
  batchId: string;
}

interface Transferencia {
  hash: string;
  timestamp: string;
  participant: {
    name: string;
    role: string;
    address: string;
  };
  details: {
    "Cantidad": string;
    "Condiciones": string;
  };
}

export default function ProductTrackingPage() {
  const params = useParams();
  const productId = params?.id as string;
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId || !window.ethereum) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Extraer el número de lote del QR (primer número antes del primer guión)
        const [batchNumber] = productId.split('-');
        console.log('Número de Lote:', batchNumber);
        
        // Obtener las transferencias asociadas al token usando eventos
        const transferencias: Transferencia[] = [];

        try {
          const tokensContract = new ethers.Contract(
            CONTRACTS.Tokens.address,
            CONTRACTS.Tokens.abi,
            provider
          );

          // Obtener el último bloque
          const latestBlock = await provider.getBlockNumber();
          const fromBlock = 0;
          
          console.log('Buscando eventos desde el bloque', fromBlock, 'hasta', latestBlock);
          
          // Obtener eventos de transferencia
          const transferFilter = tokensContract.filters.TokenTransferido();
          const transferEvents = await tokensContract.queryFilter(transferFilter, fromBlock, latestBlock);
          console.log('Eventos de transferencia encontrados:', transferEvents.length);
          
          // Obtener la interfaz del contrato para analizar los eventos
          const tokenInterface = new Interface(CONTRACTS.Tokens.abi);

          // Filtrar eventos para el token específico
          transferEvents.forEach(event => {
            console.log('Evento:', event);
            const parsedEvent = tokenInterface.parseLog(event);
            console.log('Evento parseado:', parsedEvent);
            
            if (parsedEvent && parsedEvent.args) {
              console.log('Argumentos del evento:', parsedEvent.args);
              const { tokenId, from, cantidad, condiciones, timestamp } = parsedEvent.args;
              console.log('TokenId:', tokenId?.toString());
              console.log('BatchNumber:', batchNumber);
              
              if (tokenId?.toString() === batchNumber) {
                console.log('Match encontrado para el token');
                
                // Determinar el rol basado en la dirección o alguna otra lógica
                let role = "Transportista";
                if (from === "0x90F79bf6EB2c4f870365E785982E1f101E93b906") {
                  role = "Productor";
                }
                // Aquí puedes agregar más condiciones para otros roles
                
                const date = new Date();  // Por ahora usamos la fecha actual
                transferencias.push({
                  hash: event.transactionHash,
                  timestamp: date.toISOString(),
                  participant: {
                    name: `${from?.substring(0, 6)}...${from?.substring(38)}`,
                    role: role,
                    address: from || 'Desconocido'
                  },
                  details: {
                    "Cantidad": cantidad?.toString() || '0',
                    "Condiciones": condiciones ? JSON.stringify(condiciones) : 'No especificadas'
                  }
                });
              }
            }
          });

        } catch (error) {
          console.error('Error al obtener eventos de transferencia:', error);
        }

        console.log('Transferencias:', transferencias);

        // Formatear las transferencias para el timeline
        const formattedData: ProductData = {
          steps: transferencias,
          batchId: batchNumber
        };

        setProductData(formattedData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product data:', error);
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId]);

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Cargando información del producto...</div>;
  }

  if (!productData) {
    return <div className="container mx-auto px-4 py-8">No se encontró información del producto</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductTimeline data={productData} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <ProductDetails />
        <div className="space-y-8">
          <QualityInfo />
          <LocationMap />
        </div>
      </div>
    </div>
  );
}
