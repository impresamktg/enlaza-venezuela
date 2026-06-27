export type PostType = "need" | "offer";

export type PostStatus = "active" | "resolved";

/**
 * Estado en vivo de un rescate. null = reportado (aún sin atender).
 * Estados terminales (salen del tablón activo): "rescatados" = personas
 * rescatadas (cuenta en el registro); "resuelto" = solicitud atendida sin
 * rescate de personas (no cuenta).
 */
export type RescueState = "en_camino" | "rescatados" | "resuelto" | null;

/** Estados terminales de un rescate: salen del tablón activo. */
export function isRescueClosed(state: RescueState): boolean {
  return state === "rescatados" || state === "resuelto";
}

export interface Post {
  id: string;
  type: PostType;
  category: string; // category id, see lib/data.ts
  title: string;
  description: string | null;
  city: string;
  zone: string | null; // municipio / parroquia / urbanización
  contact_name: string;
  contact_phone: string; // WhatsApp-capable
  people_count: number | null; // personas afectadas o capacidad ofrecida
  lat: number | null; // ubicación aproximada opcional (~110 m)
  lng: number | null;
  status: PostStatus;
  created_at: string; // ISO timestamp
  address: string | null; // dirección/edificio exacto (rescate) para "Cómo llegar"
  trapped: boolean; // hay personas atrapadas
  rescue_state: RescueState; // progreso en vivo del rescate
  rescued_at: string | null; // ISO: cuándo se marcó "rescatados"
  duplicate_of: string | null; // si está set, es una corroboración (oculta de los tablones)
  corroboration_count: number; // nº de corroboraciones sobre la canónica
  photos: string[]; // URLs públicas en Storage (máx 2)
}

/** Coincidencia para el aviso anti-duplicados al publicar un rescate. */
export interface SimilarRescue {
  id: string;
  title: string;
  address: string | null;
  zone: string | null;
  corroboration_count: number;
  sim: number;
}

/** Contacto de una corroboración, para listarlo en el detalle de la canónica. */
export interface Corroboration {
  contact_name: string;
  contact_phone: string;
  description: string | null;
}

/** Resultado de crear una publicación: la publicación y su token de gestión. */
export interface CreateResult {
  post: Post;
  manageToken: string | null;
}

/** Estado del formulario de publicación (server action). */
export interface FormState {
  error?: string;
  /** En éxito: datos para que el autor gestione su publicación. */
  success?: {
    id: string;
    type: PostType;
    token: string | null;
  };
}

export interface NewPost {
  type: PostType;
  category: string;
  title: string;
  description?: string | null;
  city: string;
  zone?: string | null;
  contact_name: string;
  contact_phone: string;
  people_count?: number | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  trapped?: boolean;
  photos?: string[];
}
