'use client';

import Image from 'next/image';
import { AiOutlineMail, AiOutlinePhone, AiOutlineEnvironment } from 'react-icons/ai';
import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';
import { FaTwitter } from 'react-icons/fa6';

export default function Footer() {
    return (
        <footer className="bg-gradient-to-b from-olive-700 to-olive-800 text-white py-16 border-t border-olive-600 mt-auto z-50 relative">
            <div className="max-w-[2000px] mx-auto px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Logo y copyright */}
                    <div className="flex flex-col items-center lg:items-start">
                        <div className="group relative">
                            <Image
                                src="/assets/logohd.png"
                                alt="Logo de la empresa"
                                width={200}
                                height={200}
                                className="object-contain mb-4 transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-olive-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-lg"></div>
                        </div>
                        <p className="text-sm text-center lg:text-left text-olive-300">
                            &copy; Trazabilidad de Aceite {new Date().getFullYear()}
                        </p>
                        <p className="text-sm text-center lg:text-left text-olive-300 mt-2">
                            Creado por Presen, Sergi, Javi, Joaquin
                        </p>
                    </div>

                    {/* Enlaces rápidos */}
                    <div className="text-center lg:text-left">
                        <h3 className="text-xl font-bold mb-6 text-olive-200">Enlaces Rápidos</h3>
                        <ul className="space-y-3">
                            <li>
                                <a href="/" className="hover:text-olive-300 transition-colors duration-300 flex items-center justify-center lg:justify-start">
                                    <span className="hover:translate-x-2 transition-transform duration-300">Inicio</span>
                                </a>
                            </li>
                            <li>
                                <a href="/about" className="hover:text-olive-300 transition-colors duration-300 flex items-center justify-center lg:justify-start">
                                    <span className="hover:translate-x-2 transition-transform duration-300">Acerca de</span>
                                </a>
                            </li>
                            <li>
                                <a href="/help" className="hover:text-olive-300 transition-colors duration-300 flex items-center justify-center lg:justify-start">
                                    <span className="hover:translate-x-2 transition-transform duration-300">Ayuda</span>
                                </a>
                            </li>
                            <li>
                                <a href="/terms" className="hover:text-olive-300 transition-colors duration-300 flex items-center justify-center lg:justify-start">
                                    <span className="hover:translate-x-2 transition-transform duration-300">Términos y Condiciones</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Información de contacto */}
                    <div className="text-center lg:text-left">
                        <h3 className="text-xl font-bold mb-6 text-olive-200">Contacto</h3>
                        <ul className="space-y-4">
                            <li className="flex items-center justify-center lg:justify-start group">
                                <AiOutlineMail className="w-5 h-5 mr-3 text-olive-400 group-hover:text-olive-300 transition-colors duration-300" />
                                <a
                                    href="mailto:soporte@empresa.com"
                                    className="hover:text-olive-300 transition-colors duration-300"
                                    aria-label="Correo electrónico"
                                >
                                    soporte@empresa.com
                                </a>
                            </li>
                            <li className="flex items-center justify-center lg:justify-start group">
                                <AiOutlinePhone className="w-5 h-5 mr-3 text-olive-400 group-hover:text-olive-300 transition-colors duration-300" />
                                <span className="hover:text-olive-300 transition-colors duration-300">+34 123 456 789</span>
                            </li>
                            <li className="flex items-center justify-center lg:justify-start group">
                                <AiOutlineEnvironment className="w-5 h-5 mr-3 text-olive-400 group-hover:text-olive-300 transition-colors duration-300" />
                                <span className="hover:text-olive-300 transition-colors duration-300">Calle Falsa 123, Madrid, España</span>
                            </li>
                        </ul>
                    </div>

                    {/* Redes sociales */}
                    <div className="text-center lg:text-left">
                        <h3 className="text-xl font-bold mb-6 text-olive-200">Síguenos</h3>
                        <div className="flex justify-center lg:justify-start space-x-6">
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                                className="group"
                            >
                                <FaFacebook className="w-6 h-6 text-olive-400 group-hover:text-olive-300 transform transition-all duration-300 group-hover:scale-110" />
                            </a>
                            <a
                                href="https://x.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="X (Twitter)"
                                className="group"
                            >
                                <FaTwitter className="w-6 h-6 text-olive-400 group-hover:text-olive-300 transform transition-all duration-300 group-hover:scale-110" />
                            </a>
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                                className="group"
                            >
                                <FaInstagram className="w-6 h-6 text-olive-400 group-hover:text-olive-300 transform transition-all duration-300 group-hover:scale-110" />
                            </a>
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="LinkedIn"
                                className="group"
                            >
                                <FaLinkedin className="w-6 h-6 text-olive-400 group-hover:text-olive-300 transform transition-all duration-300 group-hover:scale-110" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
