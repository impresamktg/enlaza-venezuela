import type { Post } from "./types";

/**
 * Una publicación es "urgente" si hay personas atrapadas o es rescate/maquinaria.
 * Las urgentes se ordenan primero y se muestran siempre (nunca quedan ocultas
 * tras "Ver más"), para que el triaje no dependa de cuánto haya cargado el usuario.
 */
export function isUrgent(post: Pick<Post, "trapped" | "category">): boolean {
  return (
    Boolean(post.trapped) ||
    post.category === "rescate" ||
    post.category === "maquinaria"
  );
}
