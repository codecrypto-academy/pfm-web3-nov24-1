'use client'

import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useState, useRef } from 'react';

interface QRScannerProps {
    onResult: (result: string) => Promise<void>
}

const QRScanner = ({ onResult }: QRScannerProps) => {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [qrSize, setQrSize] = useState({ width: 250, height: 250 });

    useEffect(() => {
        const updateQRSize = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const size = Math.min(containerWidth - 32, 400); // 32px for padding
                setQrSize({ width: size, height: size });
            }
        };

        updateQRSize();
        window.addEventListener('resize', updateQRSize);
        return () => window.removeEventListener('resize', updateQRSize);
    }, []);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => {
                setHasPermission(true);
                initializeScanner();
            })
            .catch((err) => console.warn("Camera permission denied:", err));
    }, [qrSize]);

    const initializeScanner = () => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                qrbox: {
                    width: qrSize.width,
                    height: qrSize.height,
                },
                fps: 5,
            },
            true
        );

        scanner.render(success, error);

        async function success(result: string) {
            scanner.clear();
            setScanResult(result);
            if (onResult) {
                await onResult(result);
            }
        }

        function error(err: string) {
            console.warn(err);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-md mx-auto">
            {!hasPermission ? (
                <div className="absolute inset-0 flex items-center justify-center bg-earth-100/80 rounded-lg">
                    <p className="text-red-600 text-center mb-4">Please allow camera access to scan QR codes</p>
                </div>
            ) : scanResult ? (
                <div className="absolute inset-0 flex items-center justify-center bg-earth-100/80 rounded-lg">
                    <p className="text-green-600 text-center mb-4">Success: {scanResult}</p>
                </div>
            ) : (
                <div className="qr-button-container">
                    <div id="reader" className="w-full h-full"></div>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
