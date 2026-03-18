import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/').replace(
  /\/+$/,
  '',
)
const REFRESH_TOKEN_KEY = 'refresh_token'

interface RefreshTokenResponse {
  access: string
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const forceLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  window.location.replace('/login')
}

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined
    const status = error.response?.status
    const requestUrl = originalRequest?.url ?? ''

    const isRefreshRequest = requestUrl.includes('/auth/login/refresh/')

    if (status === 401 && originalRequest && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

      if (refreshToken) {
        try {
          const { data } = await axios.post<RefreshTokenResponse>(
            `${apiBaseUrl}/auth/login/refresh/`,
            { refresh: refreshToken },
          )

          localStorage.setItem('token', data.access)

          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${data.access}`

          return axiosInstance(originalRequest)
        } catch {
          forceLogout()
        }
      } else {
        forceLogout()
      }
    }

    if (status === 401 && isRefreshRequest) {
      forceLogout()
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
