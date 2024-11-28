import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

const steps = [
  {
    title: 'Producción',
    description: 'Los productores registran cada lote de aceite en la blockchain con información detallada del origen.',
  },
  {
    title: 'Distribución',
    description: 'Se registran todos los movimientos y transferencias del producto en tiempo real.',
  },
  {
    title: 'Punto de Venta',
    description: 'Los minoristas verifican la autenticidad y mantienen el registro de la cadena de custodia.',
  },
  {
    title: 'Consumidor',
    description: 'Accede a toda la información escaneando el código QR del producto.',
  },
]

export default function HowItWorks() {
  return (
    <motion.section 
      id="how-it-works" 
      className="py-24"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-green-900 mb-16">
          ¿Cómo Funciona?
        </h2>

        <div className="relative">
          {/* Línea conectora */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-green-200 -translate-y-1/2 hidden md:block" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-6 relative z-10">
                    <span className="text-white text-xl font-bold">{index + 1}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-green-900 mb-4 text-center">
                    {step.title}
                  </h3>
                  <p className="text-green-700 text-center">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowPathIcon className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-green-600 transform rotate-90" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
