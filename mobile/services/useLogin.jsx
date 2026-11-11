import useApi from './useApi';

export default function useLogin() {
  const api = useApi();

  async function login(data) {
    return await api.postJson('/login', data);
  }

  async function register(data) {
    return await api.postJson('/register', data);
  }

  return {
    login,
    register,
  }
}