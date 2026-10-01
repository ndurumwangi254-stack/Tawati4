const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });
// Attach the JWT to every request once the user is logged in.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tawati_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token expires or is rejected, bounce back to /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("tawati_token");
      localStorage.removeItem("tawati_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
