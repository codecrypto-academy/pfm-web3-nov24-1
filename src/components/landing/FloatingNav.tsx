import { motion, useScroll, useTransform } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function FloatingNav() {
  const [isVisible, setIsVisible] = useState(false)
  const { scrollY } = useScroll()
  
  const opacity = useTransform(scrollY, [0, 100], [0, 1])
  const translateY = useTransform(scrollY, [0, 100], [-20, 0])

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <motion.nav 
      style={{ opacity, y: translateY }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white/80 backdrop-blur-lg rounded-full shadow-lg px-4 py-2"
    >
      <ul className="flex items-center gap-6">
        <li>
          <button 
            onClick={() => scrollToSection('features')}
            className="text-green-800 hover:text-green-600 transition-colors px-2 py-1"
          >
            Características
          </button>
        </li>
        <li>
          <button 
            onClick={() => scrollToSection('how-it-works')}
            className="text-green-800 hover:text-green-600 transition-colors px-2 py-1"
          >
            Cómo Funciona
          </button>
        </li>
        <li>
          <button 
            onClick={() => scrollToSection('action-section')}
            className="bg-green-600 text-white px-4 py-1 rounded-full hover:bg-green-700 transition-colors"
          >
            Comenzar
          </button>
        </li>
      </ul>
    </motion.nav>
  )
}
