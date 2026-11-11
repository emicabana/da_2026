import useApi from './useApi';
import { useCallback } from 'react';

export default function useUser() {
  const api = useApi();

  return {
    getUsers: useCallback((options) => api.getJson('/users', options), [api.getJson]),
    getUser: useCallback((username, options) => api.getJson(`/users/${encodeURIComponent(username)}`, options), [api.getJson]),
    deleteUser: useCallback((username, options) => api.deleteJson(`/users/${encodeURIComponent(username)}`, options), [api.deleteJson]),
    updateUser: useCallback((username, data, options) => api.patchJson(`/users/${encodeURIComponent(username)}`, data, options), [api.patchJson]),
    addUser: useCallback((data, options) => api.postJson('/users', data, options), [api.postJson]),
  }
}