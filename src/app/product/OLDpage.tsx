'use client'

import { useState } from 'react'
import QRScanner from '@/components/ui/QRScanner'
import ProductTimeline from '@/components/LineaTiempoProducto'

export default function ProductPage() {
    const [productData, setProductData] = useState<any>(null)
    const [isScanning, setIsScanning] = useState(true)

    const handleQRResult = async (result: string) => {
        // Here we'll handle the QR scan result and fetch product data
        setIsScanning(false)
        // Fetch product data using the scanned hash
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {isScanning ? (
                <div className="max-w-lg mx-auto">
                    <h1 className="text-2xl font-bold text-center mb-8">
                        Escanea el código QR del producto
                    </h1>
                    <QRScanner onResult={handleQRResult} />
                </div>
            ) : (
                productData && <ProductTimeline data={productData} />
            )}
        </div>
    )
}