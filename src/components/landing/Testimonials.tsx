import { motion } from 'framer-motion'
import Image from 'next/image'

const testimonials = [
  {
    content: "La trazabilidad que ofrece esta plataforma ha revolucionado nuestra forma de gestionar el aceite de oliva. Nuestros clientes valoran la transparencia.",
    author: "María González",
    role: "Productora de Aceite",
    image: "/images/testimonial-1.jpg"
  },
  {
    content: "Como minorista, poder verificar el origen y la calidad del aceite de forma instantánea me da una ventaja competitiva única.",
    author: "Carlos Rodríguez",
    role: "Propietario de Tienda Gourmet",
    image: "/images/testimonial-2.jpg"
  },
  {
    content: "La integración con blockchain garantiza la autenticidad de nuestros productos. Es justo lo que necesitábamos.",
    author: "Ana Martínez",
    role: "Directora de Cooperativa",
    image: "/images/testimonial-3.jpg"
  }
]

export default function Testimonials() {
  return (
    <section className="py-24 bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-green-900 mb-16">
          Lo que dicen nuestros usuarios
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              {/* Comillas decorativas */}
              <div className="absolute top-4 left-4 text-6xl text-green-200 opacity-50">"</div>
              
              <div className="relative z-10">
                <p className="text-green-800 mb-6 italic">
                  {testimonial.content}
                </p>
                
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.author}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">
                      {testimonial.author}
                    </h4>
                    <p className="text-sm text-green-600">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
