import { useState, createContext, useContext, useCallback, useMemo } from 'react';

// oxlint-disable-next-line react/only-export-components
export const ApiContext = createContext();

export function ApiProvider({ children }) {
  const [urlBase, setUrlBase] = useState(
    process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.11:3000/api'
  );
  const [authorization, setAuthorization] = useState('');

  const request = useCallback(async (url, options) => {
    const { json, ...fetchOptions } = options || {};
    fetchOptions.headers = { ...fetchOptions.headers };

    const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
    if (fetchOptions.body && typeof fetchOptions.body !== 'string' && !isFormData) {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    if (json) {
      fetchOptions.headers['Accept'] = 'application/json';
    }

    if (authorization) {
      fetchOptions.headers['Authorization'] = authorization;
    }

    const res = await fetch(urlBase.replace(/\/$/, '') + url, fetchOptions);
    const responseText = await res.text();
    const contentType = res.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json') && responseText
      ? JSON.parse(responseText)
      : responseText;

    if (!res.ok) {
      const message = typeof responseBody === 'object' && responseBody !== null
        ? responseBody.error
        : null;
      throw new Error(message || `Error en la petición: ${res.status} ${res.statusText}`);
    }

    if (json)
      return responseText ? responseBody : null;

    return responseText;
  }, [authorization, urlBase]);

  const post = useCallback(async (url, body) => {
    return await request(url, {
      method: 'POST',
      body,
    });
  }, [request]);

  const postJson = useCallback(async (url, body) => {
    return await request(url, {
      method: 'POST',
      body,
      json: true,
    });
  }, [request]);

  const getJson = useCallback(async (url, options = {}) => {
    return await request(url, {
      method: 'GET',
      json: true,
      ...options,
    });
  }, [request]);

  const deleteJson = useCallback(async (url, options = {}) => {
    return await request(url, {
      method: 'DELETE',
      json: true,
      ...options,
    });
  }, [request]);

  const patchJson = useCallback(async (url, body, options = {}) => {
    return await request(url, {
      method: 'PATCH',
      body,
      json: true,
      ...options,
    });
  }, [request]);

  const postForm = useCallback(async (url, body) => {
    return await request(url, {
      method: 'POST',
      body,
      json: true,
    });
  }, [request]);

  const patchForm = useCallback(async (url, body) => {
    return await request(url, {
      method: 'PATCH',
      body,
      json: true,
    });
  }, [request]);

  const mediaUrl = useCallback((path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return `${urlBase.replace(/\/api\/?$/, '').replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }, [urlBase]);

  const value = useMemo(() => ({
    urlBase,
    setUrlBase,
    authorization,
    setAuthorization,
    post,
    postJson,
    getJson,
    deleteJson,
    patchJson,
    postForm,
    patchForm,
    mediaUrl,
  }), [
    urlBase,
    authorization,
    post,
    postJson,
    getJson,
    deleteJson,
    patchJson,
    postForm,
    patchForm,
    mediaUrl,
  ]);

  return <ApiContext.Provider
    value={value}
  >
    {children}
  </ApiContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export default function useApi() {
  return useContext(ApiContext);
}