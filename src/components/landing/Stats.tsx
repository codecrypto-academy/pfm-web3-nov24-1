import { motion } from 'framer-motion'
import CountUp from 'react-countup'

const stats = [
  { id: 1, name: 'Litros Trazados', value: '500K+' },
  { id: 2, name: 'Productores', value: '100+' },
  { id: 3, name: 'Minoristas', value: '250+' },
  { id: 4, name: 'Transacciones', value: '10K+' },
]

export default function Stats() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Fondo con patrón de aceitunas */}
      <div className="absolute inset-0 bg-[url('/images/olive-pattern.png')] opacity-5" />
      
      <div className="relative max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: stat.id * 0.1 }}
              className="flex flex-col items-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"
            >
              <dt className="text-base text-green-800">{stat.name}</dt>
              <dd className="text-4xl font-bold text-green-600 mt-2">
                <CountUp
                  end={parseInt(stat.value) || 0}
                  suffix={stat.value.includes('+') ? '+' : ''}
                  duration={2.5}
                  separator=","
                />
              </dd>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
