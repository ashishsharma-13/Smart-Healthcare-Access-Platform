import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shap_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const storedRefreshToken = localStorage.getItem('shap_refresh_token');
      if (storedRefreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh-token', {
            refreshToken: storedRefreshToken,
          });
          if (res.data?.success && res.data?.token) {
            const newAccessToken = res.data.token;
            localStorage.setItem('shap_token', newAccessToken);
            if (res.data.refreshToken) {
              localStorage.setItem('shap_refresh_token', res.data.refreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          // Token refresh failed - clean local session
          localStorage.removeItem('shap_token');
          localStorage.removeItem('shap_refresh_token');
          localStorage.removeItem('shap_user');
          const isAuthPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
          if (!isAuthPage) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshErr);
        }
      }
    }

    if (error.response && error.response.status === 401) {
      const isAuthRoute = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
      if (!isAuthRoute) {
        localStorage.removeItem('shap_token');
        localStorage.removeItem('shap_refresh_token');
        localStorage.removeItem('shap_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

