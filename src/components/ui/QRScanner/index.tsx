import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useState } from 'react';

const QRScanner = () => {
    const [scanResult, setScanResult] = useState<string | null>(null);

    useEffect(() => {
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

        function success(result: string) {
            scanner.clear();
            setScanResult(result);
        }

        function error(err: string) {
            console.warn(err);
        }

        scanner.render(success, error);

        return () => {
            scanner.clear();
        };
    }, []);

    return (
        <div className="relative w-[512px] h-[512px] flex items-center justify-center">
            {scanResult ? (
                <div>Success: {scanResult}</div>
            ) : (
                <>
                    <div className="absolute border-4 border-olive-dark rounded-lg w-[400px] h-[400px] pointer-events-none z-10" />
                    <div id="reader" className="w-full h-full"></div>
                </>
            )}
        </div>
    );
};

export default QRScanner;
