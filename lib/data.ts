import type { Post } from "./types";

export interface Category {
  id: string;
  label: string;
  icon: string;
  hint: string;
}

/** Tipos de ayuda que se pueden ofrecer o solicitar. */
export const CATEGORIES: Category[] = [
  {
    id: "rescate",
    label: "Rescate y mano de obra",
    icon: "⛑️",
    hint: "PRIORIDAD: búsqueda y rescate, remoción de escombros, maquinaria pesada, herramientas, brigadas con experiencia",
  },
  {
    id: "voluntarios",
    label: "Voluntarios",
    icon: "🙋",
    hint: "Personas dispuestas a ayudar con su tiempo: rescate, logística, reparto, censo, apoyo",
  },
  {
    id: "maquinaria",
    label: "Maquinaria pesada",
    icon: "🚜",
    hint: "Excavadoras, retroexcavadoras, grúas, montacargas y camiones de volteo para remover escombros",
  },
  {
    id: "transporte",
    label: "Transporte",
    icon: "🚚",
    hint: "Camión, camioneta, carro, moto o gandola para mover personas o insumos",
  },
  {
    id: "refugio",
    label: "Refugio y alojamiento",
    icon: "🏠",
    hint: "Espacio para dormir, albergue temporal, terreno seguro",
  },
  {
    id: "alimentos",
    label: "Alimentos y agua",
    icon: "🥫",
    hint: "Comida, agua potable, fórmula para bebés, comida preparada",
  },
  {
    id: "salud",
    label: "Salud y medicinas",
    icon: "🩺",
    hint: "Medicamentos, primeros auxilios, atención médica, insumos",
  },
  {
    id: "materiales",
    label: "Materiales y herramientas",
    icon: "🛠️",
    hint: "Carpas, cobijas, generadores, herramientas, materiales de construcción",
  },
  {
    id: "comunicacion",
    label: "Comunicación y energía",
    icon: "🔌",
    hint: "Carga de teléfonos, internet, radio, planta eléctrica",
  },
  {
    id: "mascotas",
    label: "Mascotas y animales",
    icon: "🐾",
    hint: "Rescate, refugio, comida o cuidado de mascotas y animales",
  },
  {
    id: "otros",
    label: "Otros",
    icon: "🤝",
    hint: "Cualquier otra ayuda que no encaje en las categorías anteriores",
  },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export interface City {
  id: string;
  name: string;
  zones: string[]; // municipios / parroquias / sectores sugeridos
}

/**
 * Ciudades priorizadas. Caracas y La Guaira son las más golpeadas por los
 * terremotos del 24 de junio de 2026. El orden refleja la prioridad.
 */
export const CITIES: City[] = [
  {
    id: "caracas",
    name: "Caracas",
    zones: [
      "Libertador",
      "Chacao - Altamira",
      "Chacao - Los Palos Grandes",
      "Baruta",
      "Sucre - Petare",
      "El Hatillo",
      "Catia",
      "El Valle",
      "La Candelaria",
    ],
  },
  {
    id: "la-guaira",
    name: "La Guaira (Vargas)",
    zones: ["Maiquetía", "Catia La Mar", "La Guaira", "Macuto", "Caraballeda"],
  },
  {
    id: "san-felipe",
    name: "San Felipe (Yaracuy)",
    zones: ["San Felipe", "Independencia", "Cocorote"],
  },
  {
    id: "moron",
    name: "Morón / Puerto Cabello",
    zones: ["Morón", "Puerto Cabello", "Yumare"],
  },
  {
    id: "valencia",
    name: "Valencia (Carabobo)",
    zones: ["Valencia", "Naguanagua", "San Diego"],
  },
  {
    id: "maracay",
    name: "Maracay (Aragua)",
    zones: ["Maracay", "Turmero", "La Victoria"],
  },
  { id: "maracaibo", name: "Maracaibo (Zulia)", zones: [] },
  { id: "barquisimeto", name: "Barquisimeto (Lara)", zones: [] },
  { id: "otra", name: "Otra ciudad", zones: [] },
];

export const CITY_MAP: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.id, c]),
);

export function cityName(id: string): string {
  return CITY_MAP[id]?.name ?? id;
}

/**
 * Datos de ejemplo usados en "modo demo" (cuando no hay base de datos
 * configurada). Los teléfonos son ficticios. Sirven para mostrar cómo
 * funciona la plataforma.
 */
const RAW_SEED_POSTS: Omit<
  Post,
  "address" | "trapped" | "rescue_state" | "rescued_at" | "duplicate_of" | "corroboration_count"
>[] = [
  {
    id: "seed-1",
    type: "offer",
    category: "transporte",
    title: "Camión 350 disponible para traslado de insumos",
    description:
      "Tengo un camión 350 con conductor. Puedo mover agua, comida o personas dentro de Caracas y hacia La Guaira. Combustible cubierto por mi parte hoy y mañana.",
    city: "caracas",
    zone: "Sucre - Petare",
    contact_name: "José",
    contact_phone: "+584121110001",
    people_count: null,
    lat: null,
    lng: null,
    status: "active",
    created_at: minutesAgo(35),
  },
  {
    id: "seed-2",
    type: "need",
    category: "refugio",
    title: "Familia de 5 sin vivienda en Los Palos Grandes",
    description:
      "Nuestro edificio fue marcado como inhabitable. Somos 2 adultos, 2 niños y 1 abuela. Necesitamos un lugar seguro para dormir esta noche en el este de Caracas.",
    city: "caracas",
    zone: "Chacao - Los Palos Grandes",
    contact_name: "Marisol",
    contact_phone: "+584142220002",
    people_count: 5,
    lat: null,
    lng: null,
    status: "active",
    created_at: minutesAgo(58),
  },
  {
    id: "seed-3",
    type: "offer",
    category: "salud",
    title: "Médico voluntario + insumos de primeros auxilios",
    description:
      "Soy médico general. Puedo atender heridas leves y entregar insumos de primeros auxilios. Disponible en el oeste de Caracas durante el día.",
    city: "caracas",
    zone: "Libertador",
    contact_name: "Dr. Andrés",
    contact_phone: "+584161230003",
    people_count: null,
    lat: null,
    lng: null,
    status: "active",
    created_at: minutesAgo(90),
  },
  {
    id: "seed-4",
    type: "need",
    category: "alimentos",
    title: "Agua potable para albergue en Maiquetía",
    description:
      "Estamos coordinando un albergue con unas 40 personas. Necesitamos agua potable y comida que no requiera cocción.",
    city: "la-guaira",
    zone: "Maiquetía",
    contact_name: "Comité vecinal",
    contact_phone: "+584241240004",
    people_count: 40,
    lat: null,
    lng: null,
    status: "active",
    created_at: minutesAgo(120),
  },
  {
    id: "seed-5",
    type: "offer",
    category: "refugio",
    title: "2 habitaciones disponibles para familia",
    description:
      "Tengo dos habitaciones en Baruta. Puedo recibir a una familia (hasta 4 personas) por varios días. Hay agua y planta eléctrica.",
    city: "caracas",
    zone: "Baruta",
    contact_name: "Carla",
    contact_phone: "+584121250005",
    people_count: 4,
    lat: null,
    lng: null,
    status: "active",
    created_at: minutesAgo(150),
  },
  {
    id: "seed-6",
    type: "need",
    category: "rescate",
    title: "Voluntarios para remoción de escombros",
    description:
      "Se necesitan manos para ayudar a remover escombros de viviendas afectadas. Traer guantes si es posible. Coordinamos por zona.",
    city: "caracas",
    zone: "Catia",
    contact_name: "Brigada comunitaria",
    contact_phone: "+584142260006",
    people_count: null,
    lat: null,
    lng: null,
    status: "active",
    created_at: minutesAgo(200),
  },
  {
    id: "seed-7",
    type: "offer",
    category: "comunicacion",
    title: "Punto de carga de teléfonos e internet",
    description:
      "Tenemos planta eléctrica e internet en un local en Chacao. Pueden venir a cargar teléfonos y comunicarse con sus familiares.",
    city: "caracas",
    zone: "Chacao - Altamira",
    contact_name: "Local La Esquina",
    contact_phone: "+584161270007",
    people_count: null,
    lat: null,
    lng: null,
    status: "active",
    created_at: minutesAgo(240),
  },
  {
    id: "seed-8",
    type: "need",
    category: "materiales",
    title: "Carpas y cobijas para 12 personas",
    description:
      "Estamos durmiendo a la intemperie tras la evacuación. Necesitamos carpas, cobijas y colchonetas para 12 personas, incluidos 3 niños.",
    city: "la-guaira",
    zone: "Catia La Mar",
    contact_name: "Yolanda",
    contact_phone: "+584241280008",
    people_count: 12,
    lat: null,
    lng: null,
    status: "active",
    created_at: minutesAgo(310),
  },
];

// Inyecta los campos de rescate (no usados en los ejemplos) con valores por defecto.
export const SEED_POSTS: Post[] = RAW_SEED_POSTS.map((p) => ({
  ...p,
  address: null,
  trapped: false,
  rescue_state: null,
  rescued_at: null,
  duplicate_of: null,
  corroboration_count: 0,
}));

function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}
