import BubbleBackground from '@/components/ui/BubbleBackground/index.tsd'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-white">
      <BubbleBackground />
      <div className="relative z-10 grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen backdrop-blur-sm">
        <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start bg-white/80 p-8 rounded-xl shadow-oil">
          <div className="bg-olive rounded-drop p-8 shadow-oil">
            <h1 className="text-4xl text-olive-dark font-bold">Olive Oil Tracker</h1>
            <p className="text-earth-dark mt-2">Trazabilidad del aceite en blockchain</p>
          </div>
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <a
              className="rounded-drop border-2 border-olive transition-colors flex items-center justify-center bg-oil hover:bg-oil-dark text-earth-dark gap-2 text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8"
              href="/dashboard"
            >
              Iniciar Seguimiento
            </a>
            <a
              className="rounded-drop border-2 border-olive transition-colors flex items-center justify-center hover:bg-olive-light text-olive-dark hover:text-olive-dark text-sm sm:text-base h-10 sm:h-12 px-6 sm:px-8"
              href="/about"
            >
              Sobre el Proyecto
            </a>
          </div>
        </main>

        <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center bg-olive-dark text-oil-light w-full p-4">
          <a className="hover:text-oil transition-colors" href="/producers">
            Productores
          </a>
          <a className="hover:text-oil transition-colors" href="/tracking">
            Seguimiento
          </a>
          <a className="hover:text-oil transition-colors" href="/contact">
            Contacto
          </a>
        </footer>
      </div>
    </div>
  );
}