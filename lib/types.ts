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
  status: PostStatus;
  created_at: string; // ISO timestamp
}

/** Estado del formulario de publicación (server action). */
export interface FormState {
  error?: string;
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
}
