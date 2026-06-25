export type PostType = "need" | "offer";

export type PostStatus = "active" | "resolved";

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
}
