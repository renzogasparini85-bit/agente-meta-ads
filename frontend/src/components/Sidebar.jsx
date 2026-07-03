import { LayoutDashboard, Megaphone, Image, TrendingUp, Bell, Sparkles, LogOut, Menu, X, Settings, Building2, ChevronDown, Plus, Leaf, BarChart2, Clock, Award, Globe, Target, BookOpen, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAccount } from '../context/AccountContext'
import Configuracion from '../pages/Configuracion'
import PerfilMarca from '../pages/PerfilMarca'
import GestionCuentas from '../pages/GestionCuentas'
import PixelMeta from '../pages/PixelMeta'

const nav = [
  { id: 'overview',        label: 'Overview',           icon: LayoutDashboard },
  { id: 'campanas',        label: 'Campañas',            icon: Megaphone },
  { id: 'creativos',       label: 'Creativos',           icon: Image },
  { id: 'estrategia',     label: 'Estrategia',          icon: Target },
  { id: 'historial',       label: 'Historial',           icon: TrendingUp },
  { id: 'analytics',       label: 'Análisis Avanzado',   icon: BarChart2 },
  { id: 'benchmarks',      label: 'Benchmarks',          icon: Award },
  { id: 'organico',        label: 'Orgánico',            icon: Leaf },
  { id: 'alertas',         label: 'Alertas',             icon: Bell },
  { id: 'recomendaciones', label: 'IA Recomendaciones',  icon: Sparkles },
  { id: 'timeline',        label: 'Acciones',            icon: Clock },
  { id: 'laboratorio',     label: 'Laboratorio',         icon: FlaskConical },
  { id: 'guia',            label: 'Guía del sistema',    icon: BookOpen },
]

const colorMap = {
  violet: 'bg-violet-DEFAULT',
  orange: 'bg-orange-DEFAULT',
  green:  'bg-green-400',
  blue:   'bg-blue-400',
  cyan:   'bg-cyan-400',
  red:    'bg-red-400',
}

function AccountSelector({ onManage }) {
  const { accounts, selected, setSelected } = useAccount()
  const [open, setOpen] = useState(false)

  if (!selected) {
    return (
      <div className="px-3 pb-2">
        <button
          onClick={onManage}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-bg border border-violet-DEFAULT/30 text-violet-glow hover:bg-violet-DEFAULT/10 transition-colors cursor-pointer text-xs font-medium"
        >
          <Plus size={12} />
          Gestionar cuentas
        </button>
      </div>
    )
  }

  return (
    <div className="px-3 pb-2">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-bg border border-border hover:border-slate-600 transition-colors cursor-pointer"
        >
          <div className={`w-2 h-2 rounded-full shrink-0 ${colorMap[selected.color] || 'bg-violet-DEFAULT'}`} />
          <span className="text-white text-xs font-medium flex-1 text-left truncate">{selected.nombre}</span>
          <ChevronDown size={12} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => { setSelected(acc); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                  selected.id === acc.id ? 'bg-violet-DEFAULT/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${colorMap[acc.color] || 'bg-violet-DEFAULT'}`} />
                <span className="flex-1 text-left truncate">{acc.nombre}</span>
                <span className="text-slate-400 font-mono">{acc.moneda}</span>
              </button>
            ))}
            <div className="border-t border-border">
              <button
                onClick={() => { setOpen(false); onManage() }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-500 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              >
                <Plus size={12} />
                Gestionar cuentas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NavLinks({ active, onNavigate, onAfterNavigate }) {
  return (
    <>
      {nav.map(({ id, label, icon: Icon, badge }) => (
        <button
          key={id}
          onClick={() => { onNavigate(id); onAfterNavigate?.() }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
            active === id
              ? 'bg-violet-DEFAULT/20 text-violet-glow border border-violet-DEFAULT/30 glow-violet'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Icon size={18} className={active === id ? 'text-violet-glow' : ''} />
          <span className="flex-1 text-left">{label}</span>
          {badge && (
            <span className="bg-orange-DEFAULT text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {badge}
            </span>
          )}
        </button>
      ))}
    </>
  )
}

export default function Sidebar({ active, onNavigate }) {
  const [open, setOpen]           = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showMarca, setShowMarca]   = useState(false)
  const [showCuentas, setShowCuentas] = useState(false)
  const [showPixel, setShowPixel]   = useState(false)
  const { client, logout }        = useAuth()

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-DEFAULT to-violet-light flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-white font-semibold text-sm">Meta Ads AI</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-white cursor-pointer">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col pt-16" onClick={e => e.stopPropagation()}>
            <div className="pt-3">
              <p className="text-slate-400 text-xs px-6 mb-1.5 font-medium uppercase tracking-wide">Cuenta activa</p>
              <AccountSelector onManage={() => { setShowCuentas(true); setOpen(false) }} />
            </div>
            <nav className="flex-1 flex flex-col gap-1 px-4 py-4 overflow-y-auto">
              <NavLinks active={active} onNavigate={onNavigate} onAfterNavigate={() => setOpen(false)} />
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-surface border-r border-border z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-DEFAULT to-violet-light flex items-center justify-center glow-violet">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Meta Ads AI</p>
            <p className="text-slate-500 text-xs mt-0.5">{client?.nombre || 'Dashboard'}</p>
          </div>
        </div>

        {/* Selector de cuenta */}
        <div className="pt-3">
          <p className="text-slate-400 text-xs px-6 mb-1.5 font-medium uppercase tracking-wide">Cuenta activa</p>
          <AccountSelector onManage={() => setShowCuentas(true)} />
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col px-3 py-2 overflow-y-auto min-h-0">
          <div className="flex flex-col gap-1">
            <NavLinks active={active} onNavigate={onNavigate} />
          </div>
          <div className="mt-auto pt-2 border-t border-border/50 shrink-0">
            <button
              onClick={() => setShowMarca(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <Building2 size={18} />
              <span className="flex-1 text-left">Perfil de Marca</span>
              <span className="text-slate-400 text-xs">IA</span>
            </button>
            <button
              onClick={() => setShowPixel(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <Globe size={18} />
              <span className="flex-1 text-left">Pixel de Meta</span>
            </button>
          </div>
        </nav>
        {/* User */}
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-DEFAULT to-orange-light flex items-center justify-center text-white text-xs font-bold">
              {client?.nombre?.slice(0, 2).toUpperCase() || 'CL'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{client?.nombre || 'Cliente'}</p>
              <p className="text-slate-500 text-xs truncate">Meta Ads</p>
            </div>
            <button onClick={() => setShowConfig(true)} className="text-slate-500 hover:text-white cursor-pointer transition-colors" title="Configuración">
              <Settings size={14} />
            </button>
            <button onClick={logout} className="text-slate-500 hover:text-red-400 cursor-pointer transition-colors" title="Cerrar sesión">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {showConfig  && <Configuracion   onClose={() => setShowConfig(false)} />}
      {showMarca   && <PerfilMarca     onClose={() => setShowMarca(false)} />}
      {showCuentas && <GestionCuentas  onClose={() => setShowCuentas(false)} />}
      {showPixel   && <PixelMeta       onClose={() => setShowPixel(false)} />}
    </>
  )
}
