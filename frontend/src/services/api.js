import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: BASE_URL })

// Adjunta JWT en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Si el token expiró, limpia y redirige al login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('client')
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
}

export const metaOAuthAPI = {
  exchangeToken: (shortToken) =>
    api.post(`/auth/meta/exchange-token?short_token=${encodeURIComponent(shortToken)}`).then((r) => r.data),
}

export const dashboardAPI = {
  overview: (days = 30, accountId = null) => {
    const p = new URLSearchParams({ days })
    if (accountId) p.set('account_id', accountId)
    return api.get(`/dashboard/overview?${p}`).then((r) => r.data)
  },
}

const buildParams = (days, since, until, accountId) => {
  const p = new URLSearchParams({ days })
  if (since)     p.set('since', since)
  if (until)     p.set('until', until)
  if (accountId) p.set('account_id', accountId)
  return p.toString()
}

export const adAccountsAPI = {
  list:          ()           => api.get('/ad-accounts').then((r) => r.data),
  fromMeta:      ()           => api.get('/ad-accounts/from-meta').then((r) => r.data),
  pagesFromMeta: ()           => api.get('/ad-accounts/pages-from-meta').then((r) => r.data),
  verifyMeta:    (accountId)  => api.get(`/ad-accounts/verify-meta?account_id=${accountId}`).then((r) => r.data),
  create:        (data)       => api.post('/ad-accounts', data).then((r) => r.data),
  update:        (id, data)   => api.put(`/ad-accounts/${id}`, data).then((r) => r.data),
  delete:        (id)         => api.delete(`/ad-accounts/${id}`).then((r) => r.data),
}

export const campaignsAPI = {
  list: (days = 30, since = null, until = null, accountId = null) =>
    api.get(`/campaigns?${buildParams(days, since, until, accountId)}`).then((r) => r.data),
  ads: (campaignId, days = 30, since = null, until = null, accountId = null) =>
    api.get(`/campaigns/${campaignId}/ads?${buildParams(days, since, until, accountId)}`).then((r) => r.data),
  pause: (campaignId) =>
    api.post(`/campaigns/${campaignId}/pause`).then((r) => r.data),
  pauseAd: (adId) =>
    api.post(`/campaigns/ads/${adId}/pause`).then((r) => r.data),
  createDraft: (data) =>
    api.post('/campaigns/draft', data).then((r) => r.data),
  createAdset: (data) =>
    api.post('/campaigns/adsets', data).then((r) => r.data),
  createAd: (data) =>
    api.post('/campaigns/ads', data).then((r) => r.data),
  getSavedAudiences: (accountId) =>
    api.get('/campaigns/saved-audiences', { params: accountId ? { account_id: String(accountId) } : {} }).then((r) => r.data),
  getAdImages: (accountId) =>
    api.get('/campaigns/ad-images', { params: accountId ? { account_id: String(accountId) } : {} }).then((r) => r.data),
  getWhatsappNumbers: (accountId) =>
    api.get('/campaigns/whatsapp-numbers', { params: accountId ? { account_id: String(accountId) } : {} }).then((r) => r.data),
  tree: (days = 30, accountId) => {
    const p = accountId ? `?days=${days}&account_id=${accountId}` : `?days=${days}`
    return api.get(`/campaigns/tree${p}`).then(r => r.data)
  },
}

export const creativesAPI = {
  ranking: (days = 30, since = null, until = null, accountId = null) =>
    api.get(`/creatives/ranking?${buildParams(days, since, until, accountId)}`).then((r) => r.data),
}

export const alertsAPI = {
  list: () => api.get('/alerts').then((r) => r.data),
  resolve: (id) => api.post(`/alerts/${id}/resolve`).then((r) => r.data),
  scanMe: (accountId = null) => {
    const p = new URLSearchParams()
    if (accountId) p.set('account_id', accountId)
    return api.post(`/alerts/scan-me?${p}`).then((r) => r.data)
  },
}

export const historyAPI = {
  get: (days = 30, since = null, until = null, accountId = null) => {
    const p = new URLSearchParams({ days })
    if (since)     p.set('since', since)
    if (until)     p.set('until', until)
    if (accountId) p.set('account_id', accountId)
    return api.get(`/history?${p}`).then((r) => r.data)
  },
}

export const organicAPI = {
  posts: (days = 30, since = null, until = null, accountId = null, formato = null, plataforma = null) => {
    const p = new URLSearchParams({ days })
    if (since)                          p.set('since', since)
    if (until)                          p.set('until', until)
    if (accountId)                      p.set('account_id', accountId)
    if (formato && formato !== 'todos') p.set('formato', formato)
    if (plataforma && plataforma !== 'todas') p.set('plataforma', plataforma)
    return api.get(`/organic/posts?${p}`).then((r) => r.data)
  },
  saveConfig: (pageId, igId, accountId) => {
    const p = new URLSearchParams()
    if (pageId)    p.set('page_id', pageId)
    if (igId)      p.set('ig_id', igId)
    if (accountId) p.set('account_id', accountId)
    return api.put(`/organic/config?${p}`).then((r) => r.data)
  },
}

export const brandAPI = {
  get: (accountId = null) => {
    const p = accountId ? `?account_id=${accountId}` : ''
    return api.get(`/clients/me/brand${p}`).then(r => r.data)
  },
  save: (data, accountId = null) => {
    const p = accountId ? `?account_id=${accountId}` : ''
    return api.put(`/clients/me/brand${p}`, data).then(r => r.data)
  },
}

export const recommendationsAPI = {
  list: () => api.get('/recommendations').then((r) => r.data),
  generate: (days = 30, accountId = null) => {
    const p = new URLSearchParams({ days })
    if (accountId) p.set('account_id', accountId)
    return api.post(`/recommendations/generate?${p}`).then((r) => r.data)
  },
  copy: (data) =>
    api.post('/recommendations/copy', data).then((r) => r.data),
  sendTelegram: () =>
    api.post('/recommendations/send-telegram').then((r) => r.data),
}

export const healthAPI = {
  score: (days = 30, accountId = null) => {
    const p = new URLSearchParams({ days })
    if (accountId) p.set('account_id', accountId)
    return api.get(`/health/score?${p}`).then((r) => r.data)
  },
}

export const analyticsAPI = {
  weekday: (days = 30, accountId = null) => {
    const p = new URLSearchParams({ days })
    if (accountId) p.set('account_id', accountId)
    return api.get(`/analytics/weekday?${p}`).then((r) => r.data)
  },
  fatigue: (accountId = null) => {
    const p = new URLSearchParams()
    if (accountId) p.set('account_id', accountId)
    return api.get(`/analytics/fatigue?${p}`).then((r) => r.data)
  },
  organicToPaid: (days = 30, accountId = null) => {
    const p = new URLSearchParams({ days })
    if (accountId) p.set('account_id', accountId)
    return api.get(`/analytics/organic-to-paid?${p}`).then((r) => r.data)
  },
}

export const actionLogAPI = {
  list: (limit = 50) => api.get(`/action-log?limit=${limit}`).then((r) => r.data),
}

export const creativeAnalyzeAPI = {
  analyze: (file, { producto = '', objetivo = 'OUTCOME_LEADS', tono = '', formato = 'imagen' } = {}) => {
    const form = new FormData()
    form.append('file', file)
    form.append('producto', producto)
    form.append('objetivo', objetivo)
    form.append('tono', tono)
    form.append('formato', formato)
    return api.post('/creative/analyze', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  analyzeTranscript: (transcripcion, { producto = '', objetivo = 'OUTCOME_LEADS', tono = '' } = {}) => {
    const form = new FormData()
    form.append('transcripcion', transcripcion)
    form.append('producto', producto)
    form.append('objetivo', objetivo)
    form.append('tono', tono)
    return api.post('/creative/analyze-transcript', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}

export default api
