import BubbleBackground from '@/components/ui/BubbleBackground'

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <BubbleBackground />
      <main className="z-10">
        <div className="text-center mb-12">
          <h1 className="custom-heading mb-4">
            Trazabilidad de Aceite
          </h1>
          <p className="custom-subtitle">
            Escanea el código QR de tu producto
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-8 max-w-4xl">
          <div className="bg-oil-light/30 backdrop-blur-sm rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="custom-button rounded-drop border border-solid border-transparent transition-colors flex items-center justify-center bg-oil hover:bg-oil-dark gap-2 h-48 w-48 shadow-oil cursor-pointer">
              {/* Add QR icon/image here */}
            </div>
          </div>

          <div className="bg-olive-light/30 backdrop-blur-sm rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="custom-button rounded-drop border border-solid border-transparent transition-colors flex items-center justify-center bg-oil hover:bg-oil-dark gap-2 h-12 px-8 shadow-oil cursor-pointer">
              Acceso Empresas
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
