export default function LoadingSpinner({ text = "Chargement..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="flex gap-2">
        <div className="loading-dot w-2 h-2 rounded-full bg-noir-gold" />
        <div className="loading-dot w-2 h-2 rounded-full bg-noir-gold" />
        <div className="loading-dot w-2 h-2 rounded-full bg-noir-gold" />
      </div>
      <p className="text-noir-mist font-typewriter text-sm italic">{text}</p>
    </div>
  )
}
