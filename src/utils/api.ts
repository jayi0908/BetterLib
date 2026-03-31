import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：自动塞入 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['authorization'] = token;
  }
  return config;
});

// 响应拦截器：处理 401 无感静默登录
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果接口返回 401 (Token失效)，且这个请求还没有被重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // 标记为已重试，防止死循环

      // 尝试获取本地保存的账号和密码
      const username = localStorage.getItem('zju_username');
      const password = localStorage.getItem('zju_password');

      if (username && password) {
        try {
          console.log("Token失效，正在尝试静默重新登录...");
          
          // 注意：这里使用全局 axios 发送登录请求，避免再次触发 api 实例的拦截器
          const res = await axios.post(`${BASE_URL}/login`, { username, password });
          
          if (res.data && res.data.token) {
            const newToken = res.data.token;
            // 1. 更新本地 Token
            localStorage.setItem('token', newToken); 
            
            // 2. 替换刚才失败请求的 Header 中的 Token
            originalRequest.headers['authorization'] = newToken;
            
            // 3. 带着新的 Token，重新发送刚才那条失败的请求！
            return api(originalRequest);
          }
        } catch (reLoginError) {
          console.error("静默登录失败（可能是密码已修改），退回登录页", reLoginError);
          // 静默登录也失败了，清空所有凭证并退回登录页
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(reLoginError);
        }
      } else {
        // 如果本地根本没存账号密码（比如刚装软件），乖乖去登录页
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;