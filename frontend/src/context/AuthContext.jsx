import { createContext, useContext, useState } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [client, setClient] = useState(() => {
    const stored = localStorage.getItem('client')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (email, password) => {
    const data = await authAPI.login(email, password)
    const clientData = {
      id: data.client_id,
      nombre: data.client_nombre,
      moneda: data.moneda || 'ARS',
      cpa_escalar: data.cpa_escalar,
      cpa_replicar: data.cpa_replicar,
      cpa_pausar: data.cpa_pausar,
      gasto_minimo_juzgar: data.gasto_minimo_juzgar,
      ticket_promedio: data.ticket_promedio,
      tasa_cierre: data.tasa_cierre,
      roas_meta: data.roas_meta,
      cpmr_verde: data.cpmr_verde,
      cpmr_rojo: data.cpmr_rojo,
      hook_verde: data.hook_verde,
      hook_rojo: data.hook_rojo,
      freq_amarillo: data.freq_amarillo,
      freq_rojo: data.freq_rojo,
      ctr_bueno: data.ctr_bueno,
      ctr_malo: data.ctr_malo,
      conv_semana_rojo: data.conv_semana_rojo,
      conv_semana_verde: data.conv_semana_verde,
      diversidad_amarillo: data.diversidad_amarillo,
      diversidad_rojo: data.diversidad_rojo,
    }
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('client', JSON.stringify(clientData))
    setClient(clientData)
    return data
  }

  const updateClient = (patch) => {
    setClient(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem('client', JSON.stringify(next))
      return next
    })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('client')
    setClient(null)
  }

  return (
    <AuthContext.Provider value={{ client, login, logout, updateClient }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
