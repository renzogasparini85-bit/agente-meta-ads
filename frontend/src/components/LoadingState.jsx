export function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin text-violet-glow"
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size={32} />
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
      <p className="text-slate-500 text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-violet-DEFAULT/20 text-violet-glow border border-violet-DEFAULT/30 rounded-lg text-sm cursor-pointer hover:opacity-80 transition-opacity"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
