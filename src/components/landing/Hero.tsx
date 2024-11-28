import Image from 'next/image'
import { motion } from 'framer-motion'

export default function Hero() {
  const scrollToAction = () => {
    const actionSection = document.getElementById('action-section')
    actionSection?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Fondo con parallax */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2 }}
      >
        <Image
          src="/images/olive-oil-hero.jpg"
          alt="Aceite de oliva"
          fill
          className="object-cover opacity-20"
          priority
        />
      </motion.div>
      
      {/* Elementos decorativos */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/10 to-green-900/30" />
      <div className="absolute inset-0 bg-[url('/images/grain.png')] opacity-20" />
      
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
        <motion.h1 
          className="text-5xl md:text-7xl font-bold text-green-900 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Trazabilidad del
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-400 block mt-2">
            Aceite de Oliva
          </span>
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl text-green-800 mb-12 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Descubre el viaje de tu aceite desde el olivar hasta tu mesa con tecnología blockchain
        </motion.p>
        
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <button 
            onClick={scrollToAction}
            className="px-8 py-4 bg-green-600 text-white rounded-full text-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 group"
          >
            Comenzar Ahora
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 transform group-hover:translate-y-1 transition-transform" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          className="mt-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <div className="w-6 h-10 border-2 border-green-600 rounded-full p-1">
            <motion.div
              className="w-1.5 h-1.5 bg-green-600 rounded-full"
              animate={{ 
                y: [0, 24, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
