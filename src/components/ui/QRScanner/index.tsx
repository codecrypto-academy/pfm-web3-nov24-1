'use client'

import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { useEffect, useState, useRef } from 'react';

interface QRScannerProps {
    onResult: (result: string) => Promise<void>
}

const QRScanner = ({ onResult }: QRScannerProps) => {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Solo inicializar si no existe ya un scanner
        if (!scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                "qr-reader",
                { 
                    fps: 10,
                    qrbox: 250
                },
                false
            );

            scannerRef.current.render(
                async (result) => {
                    console.log('Scanned:', result);
                    setScanResult(result);
                    if (onResult) {
                        await onResult(result);
                    }
                    if (scannerRef.current) {
                        scannerRef.current.clear();
                    }
                },
                (error) => {
                    console.log('Error:', error);
                }
            );
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        };
    }, [onResult]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const html5QrCode = new Html5Qrcode("file-reader");
            const result = await html5QrCode.scanFile(file, true);
            setScanResult(result);
            if (onResult) {
                await onResult(result);
            }
            await html5QrCode.clear();
        } catch (err) {
            console.error("Error scanning file:", err);
            alert("No se pudo leer el código QR de la imagen. Intenta con otra imagen o usa la cámara.");
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="relative w-full max-w-md mx-auto">
            {scanResult ? (
                <div className="absolute inset-0 flex items-center justify-center bg-earth-100/80 rounded-lg">
                    <p className="text-green-600 text-center mb-4">Éxito: {scanResult}</p>
                </div>
            ) : (
                <div className="qr-button-container relative">
                    <div id="qr-reader" className="w-full min-h-[300px]"></div>
                    <div id="file-reader" style={{ display: 'none' }}></div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                        <button
                            onClick={triggerFileInput}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
                        >
                            Subir imagen QR
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
