import BubbleBackground from '@/components/ui/BubbleBackground/index.tsd'

//import { ConnectButton } from '@/components/ui/ConnectButton'
export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <BubbleBackground />
      <main className="flex flex-col gap-8 row-start-2 items-center z-10">
        <div className="text-center">
          <h1 className="custom-heading">
            Trazabilidad de Aceite
          </h1>
          <p className="custom-subtitle">
            Escanea el código QR de tu producto
          </p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <div className="custom-button rounded-drop border border-solid border-transparent transition-colors flex items-center justify-center bg-oil hover:bg-oil-dark gap-2 h-10 sm:h-12 px-4 sm:px-5 shadow-oil">
            Escanear QR
          </div>
        </div>
      </main>
    </div>
  )
}
