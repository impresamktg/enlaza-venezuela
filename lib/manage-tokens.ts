"use client";

// Guarda los tokens de gestión de las publicaciones creadas en ESTE navegador,
// para que el autor vea los botones de gestionar en sus propias tarjetas.

const KEY = "ayuda_manage_tokens";

type TokenMap = Record<string, string>;

function read(): TokenMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "{}") as TokenMap;
  } catch {
    return {};
  }
}

export function getTokens(): TokenMap {
  return read();
}

export function saveToken(postId: string, token: string): void {
  if (typeof window === "undefined") return;
  const map = read();
  map[postId] = token;
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

export function removeToken(postId: string): void {
  if (typeof window === "undefined") return;
  const map = read();
  delete map[postId];
  window.localStorage.setItem(KEY, JSON.stringify(map));
}
