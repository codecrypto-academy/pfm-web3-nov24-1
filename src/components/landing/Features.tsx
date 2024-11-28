import { QrCodeIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

const features = [
  {
    title: 'Trazabilidad Completa',
    description: 'Sigue el recorrido de tu aceite desde su origen hasta el punto de venta con total transparencia.',
    icon: ChartBarIcon,
  },
  {
    title: 'Verificación Simple',
    description: 'Escanea el código QR de tu producto para acceder a toda su información de manera instantánea.',
    icon: QrCodeIcon,
  },
  {
    title: 'Garantía de Autenticidad',
    description: 'Tecnología blockchain que asegura la autenticidad y calidad de cada lote de aceite.',
    icon: ShieldCheckIcon,
  },
]

export default function Features() {
  return (
    <motion.section 
      id="features" 
      className="py-24 bg-green-50"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-green-900 mb-16">
          ¿Por qué elegir nuestra plataforma?
        </h2>
        
        {/* Problemas que resolvemos */}
        <div className="mb-16">
          <h3 className="text-3xl font-semibold text-center text-green-800 mb-8">
            Problemas que resolvemos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              className="flex flex-col items-center text-center p-6 bg-red-50/70 backdrop-blur-md rounded-2xl shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              >
                <ExclamationCircleIcon className="w-12 h-12 text-red-600 mb-4" />
              </motion.div>
              <p className="text-red-700">Falta de transparencia en la cadena de suministro del aceite de oliva.</p>
            </motion.div>
            <motion.div 
              className="flex flex-col items-center text-center p-6 bg-red-50/70 backdrop-blur-md rounded-2xl shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              >
                <ExclamationCircleIcon className="w-12 h-12 text-red-600 mb-4" />
              </motion.div>
              <p className="text-red-700">Dificultad para verificar la autenticidad y calidad del producto.</p>
            </motion.div>
            <motion.div 
              className="flex flex-col items-center text-center p-6 bg-red-50/70 backdrop-blur-md rounded-2xl shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              >
                <ExclamationCircleIcon className="w-12 h-12 text-red-600 mb-4" />
              </motion.div>
              <p className="text-red-700">Desconfianza de los consumidores hacia los productos no trazados.</p>
            </motion.div>
          </div>
        </div>

        {/* Beneficios que ofrecemos */}
        <div className="mb-16">
          <h3 className="text-3xl font-semibold text-center text-green-800 mb-8">
            Beneficios que ofrecemos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              className="flex flex-col items-center text-center p-6 bg-green-50/70 backdrop-blur-md rounded-2xl shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              >
                <CheckCircleIcon className="w-12 h-12 text-green-600 mb-4" />
              </motion.div>
              <p className="text-green-700">Transparencia total desde el origen hasta el consumidor final.</p>
            </motion.div>
            <motion.div 
              className="flex flex-col items-center text-center p-6 bg-green-50/70 backdrop-blur-md rounded-2xl shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              >
                <CheckCircleIcon className="w-12 h-12 text-green-600 mb-4" />
              </motion.div>
              <p className="text-green-700">Verificación instantánea de la autenticidad mediante blockchain.</p>
            </motion.div>
            <motion.div 
              className="flex flex-col items-center text-center p-6 bg-green-50/70 backdrop-blur-md rounded-2xl shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              >
                <CheckCircleIcon className="w-12 h-12 text-green-600 mb-4" />
              </motion.div>
              <p className="text-green-700">Confianza y lealtad del consumidor gracias a la trazabilidad.</p>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <feature.icon className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-green-700">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
