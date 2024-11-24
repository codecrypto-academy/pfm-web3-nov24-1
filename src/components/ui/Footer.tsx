'use client';

import Image from 'next/image';
import { AiOutlineMail, AiOutlinePhone, AiOutlineEnvironment } from 'react-icons/ai'; // Iconos de contacto
import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa'; // Iconos de redes sociales
import { FaTwitter } from 'react-icons/fa6'; // X (Twitter) icon

export default function Footer() {
    return (
        <footer className="bg-olive-800 text-white py-12 border-t border-olive-600 mt-auto">
            <div className="max-w-[2000px] mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Logo y copyright */}
                <div className="flex flex-col items-center lg:items-start">
                    <Image
                        src="/assets/logohd.png"
                        alt="Logo de la empresa"
                        width={150} // Ajusta para un tamaño ideal
                        height={150}
                        className="object-contain mb-4"
                    />
                    <p className="text-sm text-center lg:text-left text-olive-400">
                        Trazabilidad de Aceite {new Date().getFullYear()}
                    </p>
                </div>

                {/* Enlaces rápidos */}
                <div>
                    <h3 className="text-lg font-bold mb-4">Enlaces Rápidos</h3>
                    <ul className="space-y-2">
                        <li><a href="/" className="hover:underline">Inicio</a></li>
                        <li><a href="/about" className="hover:underline">Acerca de</a></li>
                        <li><a href="/help" className="hover:underline">Ayuda</a></li>
                        <li><a href="/terms" className="hover:underline">Términos y Condiciones</a></li>
                    </ul>
                </div>

                {/* Información de contacto */}
                <div>
                    <h3 className="text-lg font-bold mb-4">Contacto</h3>
                    <ul className="space-y-2">
                        <li className="flex items-center">
                            <AiOutlineMail className="w-5 h-5 mr-2" />
                            <a
                                href="mailto:soporte@empresa.com"
                                className="hover:underline"
                                aria-label="Correo electrónico"
                            >
                                soporte@empresa.com
                            </a>
                        </li>
                        <li className="flex items-center">
                            <AiOutlinePhone className="w-5 h-5 mr-2" />
                            <span>+34 123 456 789</span>
                        </li>
                        <li className="flex items-center">
                            <AiOutlineEnvironment className="w-5 h-5 mr-2" />
                            <span>Calle Falsa 123, Madrid, España</span>
                        </li>
                    </ul>
                </div>

                {/* Redes sociales */}
                <div>
                    <h3 className="text-lg font-bold mb-4">Síguenos</h3>
                    <div className="flex space-x-4">
                        <a
                            href="https://facebook.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            className="hover:scale-110 transition-transform"
                        >
                            <FaFacebook className="w-6 h-6" />
                        </a>
                        <a
                            href="https://x.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="X (Twitter)"
                            className="hover:scale-110 transition-transform"
                        >
                            <FaTwitter className="w-6 h-6" />
                        </a>
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            className="hover:scale-110 transition-transform"
                        >
                            <FaInstagram className="w-6 h-6" />
                        </a>
                        <a
                            href="https://linkedin.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                            className="hover:scale-110 transition-transform"
                        >
                            <FaLinkedin className="w-6 h-6" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
