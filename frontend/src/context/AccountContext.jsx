import { createContext, useContext, useState, useEffect } from 'react'
import { adAccountsAPI } from '../services/api'
import { useAuth } from './AuthContext'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const { client } = useAuth()
  const [accounts, setAccounts]       = useState([])
  const [selected, setSelectedState]  = useState(null) // { id, nombre, meta_ad_account_id, moneda, color }
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!client) { setAccounts([]); setSelectedState(null); setLoading(false); return }
    adAccountsAPI.list()
      .then(data => {
        setAccounts(data)
        // Restaurar última cuenta seleccionada desde localStorage
        const saved = localStorage.getItem('selectedAccountId')
        const found = data.find(a => String(a.id) === saved) || data[0]
        setSelectedState(found || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [client])

  const setSelected = (account) => {
    setSelectedState(account)
    if (account) localStorage.setItem('selectedAccountId', String(account.id))
  }

  const reload = () => {
    adAccountsAPI.list().then(data => {
      setAccounts(data)
      if (!selected || !data.find(a => a.id === selected.id)) {
        setSelectedState(data[0] || null)
      }
    })
  }

  return (
    <AccountContext.Provider value={{ accounts, selected, setSelected, loading, reload }}>
      {children}
    </AccountContext.Provider>
  )
}

export const useAccount = () => useContext(AccountContext)
