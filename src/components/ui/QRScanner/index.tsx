import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useState } from 'react';

interface QRScannerProps {
    onResult: (result: string) => Promise<void>
}

const QRScanner = ({ onResult }: QRScannerProps) => {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => {
                setHasPermission(true);
                initializeScanner();
            })
            .catch((err) => console.warn("Camera permission denied:", err));
    }, []);

    const initializeScanner = () => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                qrbox: {
                    width: 400,
                    height: 400,
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
        <div className="relative w-full max-w-md mx-auto">
            {!hasPermission ? (
                <div className="absolute inset-0 flex items-center justify-center bg-earth-100/80">
                    <p className="text-red-600 text-center mb-4">Please allow camera access to scan QR codes</p>
                </div>
            ) : scanResult ? (
                <div className="absolute inset-0 flex items-center justify-center bg-earth-100/80">
                    <p className="text-green-600 text-center mb-4">Success: {scanResult}</p>
                </div>
            ) : (
                <div className="aspect-square w-full relative overflow-hidden rounded-lg shadow-lg bg-earth-50">
                    <div id="reader" className="w-full h-full object-cover"></div>
                    <div className="absolute inset-0 border-2 border-olive-500 opacity-50"></div>
                    <div className="absolute inset-0">
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-olive-600"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-olive-600"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-olive-600"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-olive-600"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
