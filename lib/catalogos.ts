import type { Categoria, Colonia, Municipio } from "./types";

export const MUNICIPIOS_FOCO: Municipio[] = [
  { cveMun: "001", nombre: "Acapulco de Juárez", codigoFolio: "ACA" },
  { cveMun: "029", nombre: "Chilpancingo de los Bravo", codigoFolio: "CGO" },
  { cveMun: "038", nombre: "Zihuatanejo de Azueta", codigoFolio: "ZIH" },
  { cveMun: "055", nombre: "Taxco de Alarcón", codigoFolio: "TAX" },
  { cveMun: "021", nombre: "Coyuca de Benítez", codigoFolio: "COY" },
  { cveMun: "028", nombre: "Chilapa de Álvarez", codigoFolio: "CPA" },
  { cveMun: "035", nombre: "Iguala de la Independencia", codigoFolio: "IGU" },
  { cveMun: "057", nombre: "Técpan de Galeana", codigoFolio: "TEC" },
];

export const MUNICIPIO_POR_CVE = Object.fromEntries(
  MUNICIPIOS_FOCO.map((m) => [m.cveMun, m]),
) as Record<string, Municipio>;

export const COLONIAS_ACAPULCO: Colonia[] = [
  { id: "col-centro", nombre: "Centro", cveMun: "001", lat: 16.8494, lng: -99.9089 },
  { id: "col-diamante", nombre: "Diamante", cveMun: "001", lat: 16.794, lng: -99.818 },
  { id: "col-icacos", nombre: "Icacos", cveMun: "001", lat: 16.845, lng: -99.855 },
  { id: "col-pie", nombre: "Pie de la Cuesta", cveMun: "001", lat: 16.91, lng: -99.975 },
  { id: "col-sabana", nombre: "La Sabana", cveMun: "001", lat: 16.875, lng: -99.775 },
  { id: "col-renacimiento", nombre: "Renacimiento", cveMun: "001", lat: 16.89, lng: -99.85 },
  { id: "col-zapata", nombre: "Emiliano Zapata", cveMun: "001", lat: 16.86, lng: -99.88 },
  { id: "col-marques", nombre: "Puerto Marqués", cveMun: "001", lat: 16.804, lng: -99.845 },
  { id: "col-cayaco", nombre: "Cayaco", cveMun: "001", lat: 16.92, lng: -99.82 },
  { id: "col-colosio", nombre: "Colosio", cveMun: "001", lat: 16.88, lng: -99.89 },
  { id: "col-farallon", nombre: "Farallón", cveMun: "001", lat: 16.83, lng: -99.87 },
  { id: "col-hornos", nombre: "Hornos", cveMun: "001", lat: 16.852, lng: -99.875 },
];

export const COLONIA_POR_ID = Object.fromEntries(
  COLONIAS_ACAPULCO.map((c) => [c.id, c]),
) as Record<string, Colonia>;

export const CATEGORIAS: Categoria[] = [
  {
    id: "servicios",
    nombre: "Servicios públicos básicos",
    subcategorias: [
      "Agua potable",
      "Drenaje",
      "Alcantarillado",
      "Alumbrado público",
      "Recolección de basura",
      "Pavimentación",
      "Banquetas",
    ],
  },
  {
    id: "seguridad",
    nombre: "Seguridad pública",
    subcategorias: [
      "Presencia policial",
      "Robo",
      "Extorsión",
      "Violencia doméstica",
      "Narcomenudeo",
      "Iluminación de zonas inseguras",
      "Cámaras de vigilancia",
    ],
  },
  {
    id: "salud",
    nombre: "Salud",
    subcategorias: [
      "Acceso a centros de salud",
      "Desabasto de medicamentos",
      "Atención a adultos mayores",
      "Salud mental",
      "Enfermedades crónicas",
      "Embarazo y maternidad",
      "Discapacidad",
    ],
  },
  {
    id: "educacion",
    nombre: "Educación",
    subcategorias: [
      "Infraestructura escolar",
      "Becas",
      "Útiles y uniformes",
      "Plazas docentes",
      "Inscripciones",
      "Guarderías",
      "Educación especial",
    ],
  },
  {
    id: "empleo",
    nombre: "Empleo y economía familiar",
    subcategorias: [
      "Falta de empleo",
      "Apoyos a emprendedores",
      "Capacitación laboral",
      "Apoyos a comerciantes",
      "Tianguis y mercados",
      "Desempleo juvenil",
    ],
  },
  {
    id: "vivienda",
    nombre: "Vivienda",
    subcategorias: [
      "Regularización de predios",
      "Escrituración",
      "Apoyos para construcción o mejora",
      "Riesgo estructural",
      "Vivienda social",
    ],
  },
  {
    id: "movilidad",
    nombre: "Movilidad y transporte",
    subcategorias: [
      "Transporte público",
      "Rutas",
      "Semaforización",
      "Baches",
      "Señalización",
      "Ciclovías",
      "Transporte escolar",
      "Accesibilidad",
    ],
  },
  {
    id: "ambiente",
    nombre: "Medio ambiente",
    subcategorias: [
      "Tiraderos clandestinos",
      "Contaminación",
      "Áreas verdes",
      "Poda de árboles",
      "Plagas",
      "Quema de basura",
      "Cuerpos de agua",
    ],
  },
  {
    id: "social",
    nombre: "Desarrollo social y apoyos",
    subcategorias: [
      "Programas sociales",
      "Adultos mayores",
      "Madres solteras",
      "Personas con discapacidad",
      "Comedores comunitarios",
      "Despensas",
    ],
  },
  {
    id: "cultura",
    nombre: "Cultura, deporte y juventud",
    subcategorias: [
      "Espacios deportivos",
      "Actividades culturales",
      "Casas de cultura",
      "Canchas",
      "Prevención de adicciones",
      "Actividades para jóvenes",
    ],
  },
  {
    id: "tramites",
    nombre: "Trámites y gestión municipal",
    subcategorias: [
      "Actas",
      "CURP",
      "Licencias",
      "Permisos",
      "Atención en ventanillas",
      "Denuncias contra funcionarios",
      "Transparencia",
    ],
  },
  {
    id: "otros",
    nombre: "Otros",
    subcategorias: ["No clasificado"],
  },
];

export const CATEGORIA_POR_ID = Object.fromEntries(
  CATEGORIAS.map((c) => [c.id, c]),
) as Record<string, Categoria>;

export const TIPOS_PETICION = [
  { id: "queja", nombre: "Queja" },
  { id: "peticion", nombre: "Petición" },
  { id: "propuesta", nombre: "Propuesta" },
  { id: "requerimiento", nombre: "Requerimiento" },
  { id: "reconocimiento", nombre: "Reconocimiento" },
] as const;

export const URGENCIAS = [
  { id: "alta", nombre: "Alta" },
  { id: "media", nombre: "Media" },
  { id: "baja", nombre: "Baja" },
] as const;

export const ALCANCES = [
  { id: "individual", nombre: "Individual" },
  { id: "familiar", nombre: "Familiar" },
  { id: "colectivo", nombre: "Colectivo" },
] as const;

export const ROL_LABEL: Record<string, string> = {
  territorio: "Capturista Territorio",
  cuantiva: "Capturista Cuantiva",
  candidata: "Candidata",
  admin: "Administrador",
};

export const HOME_POR_ROL: Record<string, string> = {
  territorio: "/territorio",
  cuantiva: "/bandeja",
  candidata: "/dashboard",
  admin: "/dashboard",
};
