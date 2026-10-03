import { categoriasConExtras } from "@/lib/catalogos";
import { MUNICIPIOS_FOCO } from "@/lib/catalogos";
import {
  CATALOGO_DISTRITOS_FEDERALES,
  CATALOGO_DISTRITOS_LOCALES,
} from "@/lib/distritos-guerrero";
import { generarFolio, siguienteSecuencia } from "@/lib/folio";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { nombreMunicipio } from "@/lib/lote-titulo";
import { PETICIONES_EXCEL } from "@/lib/mock/peticiones-excel";
import { LOTES_INICIALES } from "@/lib/mock/seed";
import { USUARIOS_DEMO } from "@/lib/mock/demo-usuarios";
import {
  PLANTILLAS_DEFAULT,
  normalizarPlantillas,
  type PlantillasConfig,
} from "@/lib/plantillas-default";
import type { AuditoriaDto } from "@/lib/services/auditoria";
import type { EventoCatalogoDto } from "@/lib/services/config";
import type {
  CapturaPeticionDto,
  Complejidad,
  CoincidenciaIdentidad,
  EstatusPeticion,
  Lote,
  LoteDocumentoDto,
  LoteDto,
  Peticion,
  PeticionConsultaDto,
  Rol,
  UsuarioPublico,
} from "@/lib/types";

type SolicitudDemo = {
  id: string;
  esGrupo: boolean;
  nombre: string;
  telefono: string | null;
  cveMun: string;
  municipio: string;
  descripcion: string;
  tieneFoto: boolean;
  fotoUrl: string | null;
  estatus: "pendiente" | "aceptada" | "descartada";
  motivoDescarte: string | null;
  peticionId: string | null;
  creadoEn: string;
};

type LocalidadDemo = {
  cveLoc: string;
  nombre: string;
  ambito: string;
  lat: number;
  lng: number;
  poblacion: number | null;
};

type EstadoDemo = {
  peticiones: PeticionConsultaDto[];
  lotes: LoteDto[];
  usuarios: UsuarioPublico[];
  auditoria: AuditoriaDto[];
  solicitudes: SolicitudDemo[];
  eventos: EventoCatalogoDto[];
  plantillas: PlantillasConfig;
  municipiosFoco: string[];
  subsExtra: Record<string, string[]>;
};

const ESTATUS_CICLO: EstatusPeticion[] = [
  "recibida",
  "en_gestion",
  "cumplida",
  "recibida",
  "no_procede",
  "compromiso_gobierno",
  "recibida",
  "cumplida",
];

const COMPLEJIDAD_CICLO: Complejidad[] = [
  "simple",
  "media",
  "estructural",
  "media",
];

const ROLES: Rol[] = [
  "territorio",
  "cuantiva",
  "operador",
  "candidata",
  "admin",
];

const AHORA = "2026-08-16T12:00:00-06:00";

function clonar<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function responder(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const DOMICILIO_ALCALDIA: Record<string, string> = {
  "002": "Clavería, Azcapotzalco",
  "003": "Del Carmen, Coyoacán",
  "004": "Contadero, Cuajimalpa",
  "005": "Lindavista, Gustavo A. Madero",
  "006": "Agrícola Oriental, Iztacalco",
  "007": "Santa Cruz Meyehualco, Iztapalapa",
  "008": "San Jerónimo Lídice, Magdalena Contreras",
  "009": "San Pablo Oztotepec, Milpa Alta",
  "010": "San Ángel, Álvaro Obregón",
  "011": "San Francisco Tlaltenco, Tláhuac",
  "012": "Tlalpan Centro",
  "013": "Centro de Xochimilco",
  "014": "Narvarte, Benito Juárez",
  "015": "Centro Histórico, Cuauhtémoc",
  "016": "Polanco, Miguel Hidalgo",
  "017": "Jardín Balbuena, Venustiano Carranza",
};

function centroDe(cveMun: string): [number, number] {
  const conocidos: Record<string, [number, number]> = {
    "002": [19.486, -99.186],
    "003": [19.35, -99.162],
    "004": [19.357, -99.299],
    "005": [19.483, -99.11],
    "006": [19.395, -99.098],
    "007": [19.355, -99.062],
    "008": [19.318, -99.242],
    "009": [19.193, -99.023],
    "010": [19.358, -99.226],
    "011": [19.286, -99.003],
    "012": [19.288, -99.167],
    "013": [19.257, -99.103],
    "014": [19.381, -99.159],
    "015": [19.432, -99.149],
    "016": [19.434, -99.2],
    "017": [19.419, -99.093],
  };
  return conocidos[cveMun] ?? [19.432, -99.133];
}

function distritosDe(cveMun: string) {
  const local = CATALOGO_DISTRITOS_LOCALES.find((d) =>
    d.municipios.some((m) => m.cveMun === cveMun),
  );
  const federal = CATALOGO_DISTRITOS_FEDERALES.find((d) =>
    d.municipios.some((m) => m.cveMun === cveMun),
  );
  return {
    distritoLocal: local?.clave ?? null,
    distritoFederal: federal?.clave ?? null,
  };
}

function municipioCercano(lat: number, lng: number) {
  let mejor = MUNICIPIOS_GUERRERO[0]?.cveMun ?? "015";
  let distancia = Number.POSITIVE_INFINITY;
  for (const mun of MUNICIPIOS_GUERRERO) {
    const [la, ln] = centroDe(mun.cveMun);
    const d = (la - lat) ** 2 + (ln - lng) ** 2;
    if (d < distancia) {
      distancia = d;
      mejor = mun.cveMun;
    }
  }
  return mejor;
}

function localidadesDe(cveMun: string): LocalidadDemo[] {
  const [lat, lng] = centroDe(cveMun);
  const nombre = nombreMunicipio(cveMun);
  return [
    {
      cveLoc: "0001",
      nombre,
      ambito: "Urbano",
      lat,
      lng,
      poblacion: 18000,
    },
    {
      cveLoc: "0002",
      nombre: `Colonia ${nombre}`,
      ambito: "Urbano",
      lat: lat + 0.012,
      lng: lng + 0.012,
      poblacion: 640,
    },
    {
      cveLoc: "0003",
      nombre: `Unidad habitacional ${nombre}`,
      ambito: "Urbano",
      lat: lat - 0.01,
      lng: lng + 0.008,
      poblacion: 90,
    },
  ];
}

function documentoDe(p: Peticion): PeticionConsultaDto["documento"] {
  return {
    id: `doc-${p.id}`,
    nombreArchivo: `${p.folio}.jpg`,
    mimeType: p.documentoUrl ? "image/jpeg" : "application/octet-stream",
    sizeBytes: p.documentoUrl ? 160000 : 0,
    estatus: "capturado",
    url: p.documentoUrl || "",
  };
}

const QUIENES_CDMX = [
  "Vecinos de la Roma Norte",
  "Comité de Santa María la Ribera",
  "Habitantes de la Del Valle",
  "Mesa de la Escandón",
  "Vecinos de la Condesa",
  "Comité de San Rafael",
  "Habitantes de Portales",
  "Vecinos de la Nápoles",
  "Comité de la Juárez",
  "Habitantes de Mixcoac",
  "Vecinos de la Obrera",
  "Comité de Clavería",
  "Habitantes de Lindavista",
  "Vecinos de San Ángel",
  "Comité de la Doctores",
  "Habitantes de la Agrícola Oriental",
];

const RELATOS_CDMX = [
  "Los baches de la avenida principal ya dañan autos y ponen en riesgo a peatones y motociclistas.",
  "El alumbrado del parque y de las calles de alrededor falla de noche y la zona queda a oscuras.",
  "El agua potable llega por tandeo y varias familias pasan días sin suministro.",
  "El camión de la basura no pasa con regularidad y se acumulan residuos en la esquina.",
  "Piden más vigilancia por la noche: en la colonia se han reportado robos a transeúntes.",
  "El camión de la ruta deja de pasar temprano y la gente no alcanza a llegar al trabajo.",
  "La banqueta está rota frente a la escuela y los niños tienen que bajar al arroyo.",
  "El mercado de la colonia se inunda en cuanto llueve y los puestos pierden mercancía.",
];

function quienCdmx(index: number) {
  return QUIENES_CDMX[index % QUIENES_CDMX.length] ?? "Vecinos de la colonia";
}

function relatoCdmx(_categoriaId: string, index: number, lugar: string) {
  const base = RELATOS_CDMX[index % RELATOS_CDMX.length] ?? RELATOS_CDMX[0];
  return `${base} El reporte es de ${lugar}, Ciudad de México.`;
}

function fechaDemo(index: number) {
  const diasAtras = index % 90;
  const d = new Date();
  d.setHours(11, (index * 13) % 60, 0, 0);
  d.setDate(d.getDate() - diasAtras);
  return d;
}

function ymdDemo(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function aConsulta(p: Peticion, index: number): PeticionConsultaDto {
  const estatus = ESTATUS_CICLO[index % ESTATUS_CICLO.length] ?? "recibida";
  const complejidad = COMPLEJIDAD_CICLO[index % COMPLEJIDAD_CICLO.length] ?? "media";
  const alcaldia =
    MUNICIPIOS_GUERRERO[index % MUNICIPIOS_GUERRERO.length] ?? MUNICIPIOS_GUERRERO[0];
  const cveMun = alcaldia?.cveMun ?? "015";
  const zonas = distritosDe(cveMun);
  const [lat, lng] = centroDe(cveMun);
  const cumplida = estatus === "cumplida";
  const enGestion = estatus === "en_gestion" || estatus === "compromiso_gobierno";
  const captura = fechaDemo(index);
  const entrega = new Date(captura);
  entrega.setDate(entrega.getDate() - 1);
  const cierre = new Date(captura);
  cierre.setDate(cierre.getDate() + 2);
  const hoy = new Date();
  const fechaCumplimiento = cumplida
    ? ymdDemo(cierre.getTime() > hoy.getTime() ? hoy : cierre)
    : null;
  const relacion: PeticionConsultaDto["remitenteRelacion"] =
    index % 5 === 0 ? "vecino" : index % 5 === 1 ? "familiar" : p.alcance === "colectivo" ? "grupo" : "mismo";
  return {
    id: p.id,
    folio: p.folio,
    documentoId: `doc-${p.id}`,
    loteId: `lote-${cveMun}`,
    eventoOrigen: `Recorrido ${alcaldia?.corto ?? "Centro"}`,
    loteFechaEntrega: ymdDemo(entrega),
    ciudadanoNombre: quienCdmx(index),
    ciudadanoDomicilio: DOMICILIO_ALCALDIA[cveMun] ?? nombreMunicipio(cveMun),
    ciudadanoTelefono: p.ciudadano.telefono || null,
    remitenteNombre: relacion === "vecino" || relacion === "familiar" ? quienCdmx(index + 3) : null,
    remitenteTelefono: relacion === "vecino" || relacion === "familiar" ? "5551002030" : null,
    remitenteRelacion: relacion,
    descripcion: relatoCdmx(p.categoriaId, index, alcaldia?.corto ?? "la ciudad"),
    transcripcion: relatoCdmx(p.categoriaId, index, alcaldia?.corto ?? "la ciudad"),
    categoriaId: p.categoriaId,
    subcategorias: p.subcategorias,
    tipo: p.tipo,
    urgencia: p.urgencia,
    alcance: p.alcance,
    complejidad: p.complejidad ?? complejidad,
    firmantes: p.firmantes ?? null,
    cveMun,
    coloniaId: null,
    lat: String(lat),
    lng: String(lng),
    distritoLocal: zonas.distritoLocal,
    distritoFederal: zonas.distritoFederal,
    metodoUbicacion: "inegi",
    localidadInegi: "0001",
    ubicacionLabel: nombreMunicipio(cveMun),
    fechaEntrega: ymdDemo(entrega),
    fechaCaptura: captura.toISOString(),
    origenCaptura: "escaneado_territorio",
    escenarioAcuse: "A",
    estatus,
    fechaCumplimiento,
    descripcionCumplimiento: cumplida
      ? "Seguimiento registrado en la demostración."
      : null,
    evidenciaUrls: cumplida && index % 2 === 0 ? ["/scans/cartas/baches.png"] : [],
    motivoNoProcede: estatus === "no_procede" ? "Fuera del alcance de Nexo" : null,
    responsableAsignado: enGestion || cumplida ? "usr-operador" : null,
    responsableNombre: enGestion || cumplida ? "Operación" : null,
    cerradoPor: cumplida ? "usr-operador" : null,
    capturistaNombre: "Captura",
    capturistaEmail: "cuantiva@demo.mx",
    subidaPorNombre: "Territorio",
    subidaPorEmail: "territorio@demo.mx",
    documento: documentoDe(p),
  };
}

const FOTOS_BANDEJA = [
  { url: "/scans/cartas/baches.png", nombre: "baches-del-carmen.png" },
  { url: "/scans/cartas/banqueta.jpg", nombre: "banqueta-del-valle.jpg" },
  { url: "/scans/cartas/semaforo.jpg", nombre: "semaforo-coyoacan.jpg" },
  { url: "/scans/cartas/arbol.jpg", nombre: "arbol-insurgentes.jpg" },
  { url: "/scans/cartas/mercado.jpg", nombre: "mercado-meyehualco.jpg" },
];

function loteSeedADto(lote: Lote, index: number): LoteDto {
  const alcaldia =
    MUNICIPIOS_GUERRERO[index % MUNICIPIOS_GUERRERO.length] ?? MUNICIPIOS_GUERRERO[0];
  return {
    id: lote.id,
    fechaEntrega: lote.fechaEntrega,
    eventoOrigen: `Recorrido ${alcaldia?.corto ?? "Centro"}`,
    cveMun: alcaldia?.cveMun ?? "015",
    notas: lote.notas ?? null,
    estatus: lote.estatus,
    creadoEn: lote.creadoEn,
    subidaPorNombre: "Territorio",
    subidaPorEmail: "territorio@demo.mx",
    documentos: lote.documentos.map((doc, i) => {
      const foto = FOTOS_BANDEJA[(index * 3 + i) % FOTOS_BANDEJA.length];
      return {
        id: doc.id,
        loteId: lote.id,
        nombreArchivo: foto?.nombre ?? doc.nombreArchivo,
        mimeType: foto?.url.endsWith(".png") ? "image/png" : "image/jpeg",
        sizeBytes: 180000,
        estatus: doc.estatus,
        url: foto?.url ?? doc.imagenUrl,
        peticionId: doc.peticionId ?? null,
        folio: null,
        peticion: null,
      };
    }),
  };
}

function lotesSinFoto(): LoteDto[] {
  const textos = [
    ["Fuga de agua en Eje 1 Norte", "015", "Cuauhtémoc"],
    ["Banqueta rota en avenida Cuauhtémoc", "014", "Benito Juárez"],
    ["Luminaria apagada en Calzada de Tlalpan", "003", "Coyoacán"],
    ["Mercado inundado en Santa Cruz Meyehualco", "007", "Iztapalapa"],
    ["Camión de basura irregular en Clavería", "002", "Azcapotzalco"],
    ["Baches en Calzada México-Tacuba", "016", "Miguel Hidalgo"],
    ["Falta de vigilancia en Lindavista", "005", "Gustavo A. Madero"],
    ["Drenaje tapado en Agrícola Oriental", "006", "Iztacalco"],
    ["Poste caído en San Jerónimo", "008", "Magdalena Contreras"],
    ["Ruta del camión suspendida en Xochimilco", "013", "Xochimilco"],
    ["Árbol caído en avenida Insurgentes Sur", "010", "Álvaro Obregón"],
    ["Semáforo descompuesto en Calzada de la Viga", "017", "Venustiano Carranza"],
  ] as const;
  return textos.map(([titulo, cveMun, lugar], index) => {
    const id = `lote-texto-${index + 1}`;
    return {
      id,
      fechaEntrega: `2026-09-${String(28 - (index % 20)).padStart(2, "0")}`,
      eventoOrigen: `Recorrido ${lugar}`,
      cveMun,
      notas: titulo,
      estatus: "cerrado",
      creadoEn: `2026-09-${String(28 - (index % 20)).padStart(2, "0")}T18:00:00-06:00`,
      subidaPorNombre: "Territorio",
      subidaPorEmail: "territorio@demo.mx",
      documentos: [
        {
          id: `${id}-doc`,
          loteId: id,
          nombreArchivo: `${titulo}.txt`,
          mimeType: "text/plain",
          sizeBytes: 1200,
          estatus: "pendiente",
          url: "",
          peticionId: null,
          folio: null,
          peticion: null,
        },
      ],
    };
  });
}

function usuariosIniciales(): UsuarioPublico[] {
  return USUARIOS_DEMO.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    createdAt: "2026-06-01T10:00:00-06:00",
    updatedAt: AHORA,
  }));
}

function eventosIniciales(): EventoCatalogoDto[] {
  return MUNICIPIOS_GUERRERO.map((m) => ({
    id: `ev-${m.cveMun}`,
    nombre: `Recorrido ${m.corto}`,
    fecha: "2026-08-14",
    cveMun: m.cveMun,
    lugar: m.nombre,
    activo: true,
  }));
}

function solicitudesConFoto(): SolicitudDemo[] {
  return [
    {
      id: "sol-baches",
      esGrupo: true,
      nombre: "Vecinos de la colonia Del Carmen",
      telefono: "5555682140",
      cveMun: "003",
      municipio: "Coyoacán",
      descripcion:
        "Solicitamos la reparación de los baches en Avenida México, la avenida principal de la colonia Del Carmen, en Coyoacán. Han dañado vehículos y son un riesgo para peatones y motociclistas.",
      tieneFoto: true,
      fotoUrl: "/scans/cartas/baches.png",
      estatus: "pendiente",
      motivoDescarte: null,
      peticionId: null,
      creadoEn: "2026-09-28T10:15:00-06:00",
    },
    {
      id: "sol-alumbrado",
      esGrupo: true,
      nombre: "Habitantes de Extremadura Insurgentes",
      telefono: "5555639021",
      cveMun: "014",
      municipio: "Benito Juárez",
      descripcion:
        "Pedimos que se repare el alumbrado público del Parque Hundido y de las calles aledañas en Extremadura Insurgentes. Por las noches la zona queda completamente oscura y eso genera inseguridad para las familias.",
      tieneFoto: true,
      fotoUrl: "/scans/cartas/alumbrado.png",
      estatus: "pendiente",
      motivoDescarte: null,
      peticionId: null,
      creadoEn: "2026-09-27T19:40:00-06:00",
    },
    {
      id: "sol-agua",
      esGrupo: true,
      nombre: "Vecinos organizados de Santa María Aztahuacán",
      telefono: "5556924418",
      cveMun: "007",
      municipio: "Iztapalapa",
      descripcion:
        "Solicitamos la regularización del servicio de agua potable en Santa María Aztahuacán, Iztapalapa. En los últimos días el suministro ha sido intermitente y varias familias se han visto afectadas.",
      tieneFoto: true,
      fotoUrl: "/scans/cartas/agua.png",
      estatus: "pendiente",
      motivoDescarte: null,
      peticionId: null,
      creadoEn: "2026-09-26T11:05:00-06:00",
    },
    {
      id: "sol-basura",
      esGrupo: true,
      nombre: "Vecinos del sector Agrícola Oriental",
      telefono: "5556497730",
      cveMun: "006",
      municipio: "Iztacalco",
      descripcion:
        "Pedimos que se mejore la recolección de basura en Agrícola Oriental, Iztacalco. El camión no ha pasado con regularidad y esto ha generado acumulación de residuos y malos olores.",
      tieneFoto: true,
      fotoUrl: "/scans/cartas/basura.png",
      estatus: "pendiente",
      motivoDescarte: null,
      peticionId: null,
      creadoEn: "2026-09-25T16:20:00-06:00",
    },
    {
      id: "sol-seguridad",
      esGrupo: true,
      nombre: "Comité vecinal de Clavería",
      telefono: "5553961184",
      cveMun: "002",
      municipio: "Azcapotzalco",
      descripcion:
        "Solicitamos mayor presencia de seguridad y vigilancia en la colonia Clavería, Azcapotzalco, especialmente durante la noche. Se han reportado robos y situaciones que preocupan a los vecinos.",
      tieneFoto: true,
      fotoUrl: "/scans/cartas/seguridad.png",
      estatus: "pendiente",
      motivoDescarte: null,
      peticionId: null,
      creadoEn: "2026-09-24T21:10:00-06:00",
    },
  ];
}

function crearEstado(): EstadoDemo {
  return {
    peticiones: PETICIONES_EXCEL.map(aConsulta),
    lotes: [
      ...LOTES_INICIALES.map(loteSeedADto),
      ...lotesSinFoto(),
    ],
    usuarios: usuariosIniciales(),
    auditoria: [
      {
        id: "aud-1",
        createdAt: "2026-08-16T09:10:00-06:00",
        actorId: "usr-cuantiva",
        actorEmail: "cuantiva@demo.mx",
        actorNombre: "Captura",
        accion: "captura",
        entidad: "peticion",
        entidadId: PETICIONES_EXCEL[0]?.id ?? null,
        folio: PETICIONES_EXCEL[0]?.folio ?? null,
        detalle: "Capturó un oficio de la gira.",
        antes: null,
        despues: null,
      },
      {
        id: "aud-2",
        createdAt: "2026-08-15T18:40:00-06:00",
        actorId: "usr-operador",
        actorEmail: "operador@demo.mx",
        actorNombre: "Operación",
        accion: "estatus",
        entidad: "peticion",
        entidadId: null,
        folio: null,
        detalle: "Marcó una petición como cumplida.",
        antes: { estatus: "en_gestion" },
        despues: { estatus: "cumplida" },
      },
      {
        id: "aud-3",
        createdAt: "2026-08-14T11:05:00-06:00",
        actorId: "usr-admin",
        actorEmail: "admin@demo.mx",
        actorNombre: "Administración",
        accion: "usuario",
        entidad: "usuario",
        entidadId: "usr-territorio",
        folio: null,
        detalle: "Confirmó el acceso de territorio.",
        antes: null,
        despues: null,
      },
    ],
    solicitudes: solicitudesConFoto(),
    eventos: eventosIniciales(),
    plantillas: PLANTILLAS_DEFAULT,
    municipiosFoco: MUNICIPIOS_FOCO.map((m) => m.cveMun),
    subsExtra: {},
  };
}

const state = crearEstado();

function configActual() {
  return {
    plantillas: state.plantillas,
    municipiosFoco: state.municipiosFoco,
    subsExtra: state.subsExtra,
    eventos: state.eventos,
    categorias: categoriasConExtras(state.subsExtra),
  };
}

function auditar(parcial: Omit<AuditoriaDto, "id" | "createdAt">) {
  state.auditoria.unshift({
    ...parcial,
    id: `aud-${Date.now()}`,
    createdAt: new Date().toISOString(),
  });
}

function buscarPeticion(id: string) {
  return state.peticiones.find((p) => p.id === id) ?? null;
}

function capturaDesde(p: PeticionConsultaDto): CapturaPeticionDto {
  return {
    id: p.id,
    folio: p.folio,
    documentoId: p.documentoId,
    loteId: p.loteId,
    ciudadanoNombre: p.ciudadanoNombre,
    ciudadanoDomicilio: p.ciudadanoDomicilio,
    ciudadanoTelefono: p.ciudadanoTelefono,
    remitenteNombre: p.remitenteNombre,
    remitenteTelefono: p.remitenteTelefono,
    remitenteRelacion: p.remitenteRelacion,
    descripcion: p.descripcion,
    transcripcion: p.transcripcion,
    categoriaId: p.categoriaId,
    subcategorias: p.subcategorias,
    tipo: p.tipo,
    urgencia: p.urgencia,
    alcance: p.alcance,
    complejidad: p.complejidad,
    firmantes: p.firmantes,
    cveMun: p.cveMun,
    coloniaId: p.coloniaId,
    lat: p.lat,
    lng: p.lng,
    distritoLocal: p.distritoLocal,
    distritoFederal: p.distritoFederal,
    metodoUbicacion: p.metodoUbicacion,
    localidadInegi: p.localidadInegi,
    ubicacionLabel: p.ubicacionLabel,
    origenCaptura: p.origenCaptura,
    escenarioAcuse: p.escenarioAcuse,
    estatus: p.estatus,
  };
}

function documentosPendientes() {
  return state.lotes.reduce(
    (total, lote) =>
      total +
      (lote.estatus === "cerrado"
        ? lote.documentos.filter((d) => d.estatus === "pendiente").length
        : 0),
    0,
  );
}

async function leerJson(init?: RequestInit): Promise<Record<string, unknown>> {
  if (typeof init?.body !== "string" || !init.body) return {};
  try {
    const data = JSON.parse(init.body) as unknown;
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function texto(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function rolDe(value: unknown): Rol {
  return typeof value === "string" && ROLES.includes(value as Rol)
    ? (value as Rol)
    : "territorio";
}

function usuarioPublico(input: {
  id: string;
  email: string;
  displayName: string;
  role: Rol;
  createdAt?: string;
}): UsuarioPublico {
  const ahora = new Date().toISOString();
  return {
    id: input.id,
    email: input.email,
    displayName: input.displayName || null,
    role: input.role,
    createdAt: input.createdAt ?? ahora,
    updatedAt: ahora,
  };
}

function aplicarCaptura(
  doc: LoteDocumentoDto,
  lote: LoteDto,
  body: Record<string, unknown>,
  origen: PeticionConsultaDto["origenCaptura"],
) {
  const cveMun = texto(body.cveMun) || lote.cveMun;
  const zonas = distritosDe(cveMun);
  const previa = doc.peticionId ? buscarPeticion(doc.peticionId) : null;
  const folio =
    previa?.folio ??
    generarFolio(
      new Date(),
      cveMun,
      siguienteSecuencia(
        state.peticiones.map((p) => p.folio),
        new Date(),
        cveMun,
      ),
    );
  const id = previa?.id ?? `pet-demo-${Date.now()}`;
  const complejidad = (texto(body.complejidad) || "media") as Complejidad;
  const peticion: PeticionConsultaDto = {
    id,
    folio,
    documentoId: doc.id,
    loteId: lote.id,
    eventoOrigen: lote.eventoOrigen,
    loteFechaEntrega: lote.fechaEntrega,
    ciudadanoNombre: texto(body.ciudadanoNombre) || "Sin nombre",
    ciudadanoDomicilio: texto(body.ciudadanoDomicilio),
    ciudadanoTelefono: texto(body.ciudadanoTelefono) || null,
    remitenteNombre: texto(body.remitenteNombre) || null,
    remitenteTelefono: texto(body.remitenteTelefono) || null,
    remitenteRelacion:
      (texto(body.remitenteRelacion) as PeticionConsultaDto["remitenteRelacion"]) ||
      "mismo",
    descripcion: texto(body.descripcion),
    transcripcion: texto(body.transcripcion) || texto(body.descripcion),
    categoriaId: texto(body.categoriaId) || "otros",
    subcategorias: Array.isArray(body.subcategorias)
      ? body.subcategorias.filter((s): s is string => typeof s === "string")
      : [],
    tipo: (texto(body.tipo) || "peticion") as PeticionConsultaDto["tipo"],
    urgencia: (texto(body.urgencia) || "media") as PeticionConsultaDto["urgencia"],
    alcance: (texto(body.alcance) || "individual") as PeticionConsultaDto["alcance"],
    complejidad,
    firmantes: typeof body.firmantes === "number" ? body.firmantes : null,
    cveMun,
    coloniaId: null,
    lat: body.lat == null ? null : String(body.lat),
    lng: body.lng == null ? null : String(body.lng),
    distritoLocal: zonas.distritoLocal,
    distritoFederal: zonas.distritoFederal,
    metodoUbicacion:
      (texto(body.metodoUbicacion) as PeticionConsultaDto["metodoUbicacion"]) ||
      "inegi",
    localidadInegi: texto(body.localidadInegi) || null,
    ubicacionLabel: texto(body.ubicacionLabel) || nombreMunicipio(cveMun),
    fechaEntrega: lote.fechaEntrega,
    fechaCaptura: previa?.fechaCaptura ?? new Date().toISOString(),
    origenCaptura: origen,
    escenarioAcuse:
      (texto(body.escenarioAcuse) as PeticionConsultaDto["escenarioAcuse"]) || "A",
    estatus: "recibida",
    fechaCumplimiento: null,
    descripcionCumplimiento: null,
    evidenciaUrls: [],
    motivoNoProcede: null,
    responsableAsignado: null,
    responsableNombre: null,
    cerradoPor: null,
    capturistaNombre: "Captura",
    capturistaEmail: "cuantiva@demo.mx",
    subidaPorNombre: lote.subidaPorNombre,
    subidaPorEmail: lote.subidaPorEmail,
    documento: {
      id: doc.id,
      nombreArchivo: doc.nombreArchivo,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      estatus: "capturado",
      url: doc.url,
    },
  };
  if (previa) {
    const i = state.peticiones.findIndex((p) => p.id === previa.id);
    if (i >= 0) state.peticiones[i] = peticion;
  } else {
    state.peticiones.unshift(peticion);
  }
  doc.estatus = "capturado";
  doc.peticionId = peticion.id;
  doc.folio = peticion.folio;
  doc.peticion = capturaDesde(peticion);
  auditar({
    actorId: "usr-cuantiva",
    actorEmail: "cuantiva@demo.mx",
    actorNombre: "Captura",
    accion: "captura",
    entidad: "peticion",
    entidadId: peticion.id,
    folio: peticion.folio,
    detalle: previa ? "Actualizó una captura." : "Capturó un documento.",
    antes: null,
    despues: { folio: peticion.folio },
  });
  return peticion;
}

function coincidenciasDe(params: URLSearchParams): CoincidenciaIdentidad[] {
  const nombre = (params.get("nombre") ?? "").trim().toLowerCase();
  const excluir = params.get("excluirId");
  const fecha = params.get("fechaEntrega") ?? "";
  const categoriaId = params.get("categoriaId") ?? "";
  if (nombre.length < 3) return [];
  return state.peticiones
    .filter((p) => p.id !== excluir && p.ciudadanoNombre.toLowerCase().includes(nombre))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      folio: p.folio,
      fechaEntrega: p.fechaEntrega,
      categoriaId: p.categoriaId,
      subcategorias: p.subcategorias,
      ciudadanoNombre: p.ciudadanoNombre,
      ciudadanoDomicilio: p.ciudadanoDomicilio,
      ciudadanoTelefono: p.ciudadanoTelefono,
      mismoDiaMismoTema: p.fechaEntrega === fecha && p.categoriaId === categoriaId,
    }));
}

async function despachar(url: URL, init?: RequestInit): Promise<Response> {
  const path = url.pathname.replace(/\/$/, "") || "/";
  const method = (init?.method ?? "GET").toUpperCase();
  const body = await leerJson(init);

  if (path === "/api/dashboard" && method === "GET") {
    return responder({
      peticiones: clonar(state.peticiones),
      documentosPendientes: documentosPendientes(),
    });
  }

  if (path === "/api/peticiones" && method === "GET") {
    return responder(clonar(state.peticiones));
  }

  if (path === "/api/config" && method === "GET") {
    return responder(clonar(configActual()));
  }

  if (path === "/api/config" && method === "PUT") {
    const seccion = texto(body.seccion);
    if (seccion === "plantillas") {
      state.plantillas = normalizarPlantillas(body.plantillas);
    } else if (seccion === "geografia") {
      state.municipiosFoco = Array.isArray(body.municipiosFoco)
        ? body.municipiosFoco.filter((c): c is string => typeof c === "string")
        : [];
    } else if (seccion === "catalogo") {
      const extras =
        body.subsExtra && typeof body.subsExtra === "object"
          ? (body.subsExtra as Record<string, unknown>)
          : {};
      const limpio: Record<string, string[]> = {};
      for (const [id, lista] of Object.entries(extras)) {
        if (!Array.isArray(lista)) continue;
        limpio[id] = lista.filter((s): s is string => typeof s === "string");
      }
      state.subsExtra = limpio;
    } else {
      return responder({ error: "Sección no válida" }, 400);
    }
    auditar({
      actorId: "usr-admin",
      actorEmail: "admin@demo.mx",
      actorNombre: "Administración",
      accion: seccion === "plantillas" ? "plantilla" : seccion === "geografia" ? "geografia" : "catalogo",
      entidad: "config",
      entidadId: seccion,
      folio: null,
      detalle: `Guardó la sección ${seccion}.`,
      antes: null,
      despues: null,
    });
    return responder({ success: true, ...clonar(configActual()) });
  }

  if (path === "/api/config/eventos" && method === "POST") {
    const nombre = texto(body.nombre);
    if (nombre.length < 2) return responder({ error: "Escribe el nombre del evento" }, 400);
    state.eventos.unshift({
      id: `ev-${Date.now()}`,
      nombre,
      fecha: texto(body.fecha) || null,
      cveMun: texto(body.cveMun) || null,
      lugar: texto(body.lugar) || null,
      activo: true,
    });
    return responder({ success: true });
  }

  if (path === "/api/config/eventos" && method === "PATCH") {
    const ev = state.eventos.find((e) => e.id === texto(body.id));
    if (ev && typeof body.activo === "boolean") ev.activo = body.activo;
    return responder({ success: true });
  }

  if (path === "/api/cuantiva/lotes" && method === "GET") {
    const bandeja = state.lotes.filter((l) => l.eventoOrigen !== "Portal ciudadano");
    return responder(clonar(bandeja));
  }

  const loteCuantiva = path.match(/^\/api\/cuantiva\/lotes\/([^/]+)$/);
  if (loteCuantiva && method === "GET") {
    const lote = state.lotes.find((l) => l.id === decodeURIComponent(loteCuantiva[1]));
    if (!lote) return responder({ error: "Lote no encontrado" }, 404);
    return responder(clonar(lote));
  }

  if (path === "/api/lotes" && method === "GET") {
    return responder(clonar(state.lotes));
  }

  if (path === "/api/lotes/eventos" && method === "GET") {
    const vistos = new Set<string>();
    const nombres: string[] = [];
    for (const lote of state.lotes) {
      const nombre = lote.eventoOrigen.trim();
      if (!nombre || vistos.has(nombre.toLowerCase())) continue;
      vistos.add(nombre.toLowerCase());
      nombres.push(nombre);
      if (nombres.length >= 8) break;
    }
    return responder(nombres);
  }

  if (path === "/api/lotes" && method === "POST" && init?.body instanceof FormData) {
    const form = init.body;
    const fechaEntrega = texto(form.get("fechaEntrega")) || new Date().toISOString().slice(0, 10);
    const eventoOrigen = texto(form.get("eventoOrigen")) || "Sin evento";
    const cveMun = texto(form.get("cveMun")) || "015";
    const notas = texto(form.get("notas"));
    const archivos = form.getAll("files").filter((v): v is File => v instanceof File);
    const id = `lote-${Date.now()}`;
    const lote: LoteDto = {
      id,
      fechaEntrega,
      eventoOrigen,
      cveMun,
      notas: notas || null,
      estatus: "cerrado",
      creadoEn: new Date().toISOString(),
      subidaPorNombre: "Territorio",
      subidaPorEmail: "territorio@demo.mx",
      documentos: archivos.map((file, i) => ({
        id: `${id}-doc-${i + 1}`,
        loteId: id,
        nombreArchivo: file.name || `oficio-${i + 1}`,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        estatus: "pendiente",
        url: URL.createObjectURL(file),
        peticionId: null,
        folio: null,
        peticion: null,
      })),
    };
    state.lotes.unshift(lote);
    return responder({ success: true, lote: clonar(lote) });
  }

  const loteId = path.match(/^\/api\/lotes\/([^/]+)$/);
  if (loteId && method === "DELETE") {
    const id = decodeURIComponent(loteId[1]);
    const lote = state.lotes.find((l) => l.id === id);
    if (!lote) return responder({ error: "Lote no encontrado" }, 404);
    const capturados = lote.documentos.filter((d) => d.estatus === "capturado").length;
    if (capturados > 0) {
      return responder(
        { error: "No se puede eliminar un lote que ya tiene capturas" },
        400,
      );
    }
    state.lotes = state.lotes.filter((l) => l.id !== id);
    return responder({ success: true });
  }

  if (path === "/api/usuarios" && method === "GET") {
    return responder(clonar(state.usuarios));
  }

  if (path === "/api/usuarios" && method === "POST") {
    const email = texto(body.email).toLowerCase();
    const password = texto(body.password);
    if (!email.includes("@")) return responder({ error: "Correo inválido" }, 400);
    if (password.length < 4) return responder({ error: "La contraseña es muy corta" }, 400);
    if (state.usuarios.some((u) => u.email === email)) {
      return responder({ error: "Ese correo ya está registrado" }, 400);
    }
    const usuario = usuarioPublico({
      id: `usr-${Date.now()}`,
      email,
      displayName: texto(body.displayName),
      role: rolDe(body.role),
    });
    state.usuarios.unshift(usuario);
    return responder({ usuario });
  }

  const usuarioMatch = path.match(/^\/api\/usuarios\/([^/]+)$/);
  if (usuarioMatch && method === "PATCH") {
    const usuario = state.usuarios.find((u) => u.id === decodeURIComponent(usuarioMatch[1]));
    if (!usuario) return responder({ error: "Usuario no encontrado" }, 404);
    const email = texto(body.email).toLowerCase();
    if (email) usuario.email = email;
    if ("displayName" in body) usuario.displayName = texto(body.displayName) || null;
    if (body.role) usuario.role = rolDe(body.role);
    usuario.updatedAt = new Date().toISOString();
    return responder({ usuario: clonar(usuario) });
  }
  if (usuarioMatch && method === "DELETE") {
    const id = decodeURIComponent(usuarioMatch[1]);
    if (!state.usuarios.some((u) => u.id === id)) {
      return responder({ error: "Usuario no encontrado" }, 404);
    }
    state.usuarios = state.usuarios.filter((u) => u.id !== id);
    return responder({ success: true });
  }

  if (path === "/api/auditoria" && method === "GET") {
    const accion = url.searchParams.get("accion") ?? "";
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const desde = url.searchParams.get("desde") ?? "";
    const hasta = url.searchParams.get("hasta") ?? "";
    const filas = state.auditoria.filter((row) => {
      if (accion && row.accion !== accion) return false;
      const dia = row.createdAt.slice(0, 10);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      if (!q) return true;
      return (
        row.detalle.toLowerCase().includes(q) ||
        (row.folio ?? "").toLowerCase().includes(q) ||
        (row.actorNombre ?? "").toLowerCase().includes(q)
      );
    });
    return responder(clonar(filas));
  }

  if (path === "/api/digitales/conteo" && method === "GET") {
    return responder({
      pendientes: state.solicitudes.filter((s) => s.estatus === "pendiente").length,
    });
  }

  if (path === "/api/digitales" && method === "GET") {
    const estatus = url.searchParams.get("estatus") ?? "pendiente";
    return responder(
      clonar(state.solicitudes.filter((s) => s.estatus === estatus)),
    );
  }

  if (path === "/api/digitales" && method === "POST") {
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string")
      : [];
    const motivo = texto(body.motivo) || "spam";
    for (const solicitud of state.solicitudes) {
      if (!ids.includes(solicitud.id)) continue;
      solicitud.estatus = "descartada";
      solicitud.motivoDescarte = motivo;
    }
    return responder({ success: true });
  }

  const aceptar = path.match(/^\/api\/digitales\/([^/]+)\/aceptar$/);
  if (aceptar && method === "POST") {
    const solicitud = state.solicitudes.find(
      (s) => s.id === decodeURIComponent(aceptar[1]),
    );
    if (!solicitud || solicitud.estatus !== "pendiente") {
      return responder({ error: "La solicitud ya no está pendiente" }, 400);
    }
    const loteId = "lote-portal";
    let lote = state.lotes.find((l) => l.id === loteId);
    if (!lote) {
      lote = {
        id: loteId,
        fechaEntrega: new Date().toISOString().slice(0, 10),
        eventoOrigen: "Portal ciudadano",
        cveMun: solicitud.cveMun,
        notas: "Solicitudes digitales de demostración",
        estatus: "cerrado",
        creadoEn: new Date().toISOString(),
        subidaPorNombre: "Portal",
        subidaPorEmail: "portal@demo.mx",
        documentos: [],
      };
      state.lotes.push(lote);
    }
    const doc: LoteDocumentoDto = {
      id: `doc-${solicitud.id}`,
      loteId,
      nombreArchivo: `${solicitud.nombre}.jpg`,
      mimeType: "image/jpeg",
      sizeBytes: 120000,
      estatus: "pendiente",
      url: solicitud.fotoUrl || "/scans/oficio-1.jpg",
      peticionId: null,
      folio: null,
      peticion: null,
    };
    lote.documentos.push(doc);
    const peticion = aplicarCaptura(doc, lote, body, "portal_ciudadano");
    solicitud.estatus = "aceptada";
    solicitud.peticionId = peticion.id;
    return responder({ folio: peticion.folio, peticion: capturaDesde(peticion) });
  }

  if (path === "/api/publico/solicitudes" && method === "POST" && init?.body instanceof FormData) {
    const form = init.body;
    if (texto(form.get("empresa"))) return responder({ recibido: true });
    const nombre = texto(form.get("nombre"));
    const descripcion = texto(form.get("descripcion"));
    const cveMun = texto(form.get("cveMun"));
    if (nombre.length < 2) {
      return responder({ error: "Escribe el nombre de la persona o del grupo" }, 400);
    }
    if (descripcion.length < 10) {
      return responder(
        { error: "Cuéntanos la solicitud con un poco más de detalle" },
        400,
      );
    }
    if (!MUNICIPIOS_GUERRERO.some((m) => m.cveMun === cveMun)) {
      return responder({ error: "Elige un municipio" }, 400);
    }
    const foto = form.get("foto");
    const archivo = foto instanceof File && foto.size > 0 ? foto : null;
    state.solicitudes.unshift({
      id: `sol-${Date.now()}`,
      esGrupo: texto(form.get("esGrupo")) === "1",
      nombre,
      telefono: texto(form.get("telefono")) || null,
      cveMun,
      municipio: nombreMunicipio(cveMun),
      descripcion,
      tieneFoto: Boolean(archivo),
      fotoUrl: archivo ? URL.createObjectURL(archivo) : null,
      estatus: "pendiente",
      motivoDescarte: null,
      peticionId: null,
      creadoEn: new Date().toISOString(),
    });
    return responder({ recibido: true });
  }

  if (path === "/api/geo/maps-config" && method === "GET") {
    return responder({ key: null });
  }

  if (path === "/api/geo/localidades" && method === "GET") {
    const cveMun = url.searchParams.get("cveMun")?.trim() ?? "";
    if (!MUNICIPIOS_GUERRERO.some((m) => m.cveMun === cveMun)) {
      return responder({ error: "Municipio inválido" }, 400);
    }
    return responder(localidadesDe(cveMun));
  }

  if (path === "/api/geo/resolver" && method === "POST") {
    const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
    const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return responder({ error: "Coordenadas inválidas" }, 400);
    }
    const cveMun = municipioCercano(lat, lng);
    return responder({ cveMun, ...distritosDe(cveMun) });
  }

  if (path === "/api/cuantiva/identidad" && method === "GET") {
    return responder({ coincidencias: coincidenciasDe(url.searchParams) });
  }

  const capturar = path.match(/^\/api\/cuantiva\/documentos\/([^/]+)\/capturar$/);
  if (capturar && method === "POST") {
    const docId = decodeURIComponent(capturar[1]);
    const lote = state.lotes.find((l) => l.documentos.some((d) => d.id === docId));
    const doc = lote?.documentos.find((d) => d.id === docId);
    if (!lote || !doc) return responder({ error: "Documento no encontrado" }, 404);
    const encontradas = coincidenciasDe(
      new URLSearchParams({
        nombre: texto(body.ciudadanoNombre),
        fechaEntrega: lote.fechaEntrega,
        categoriaId: texto(body.categoriaId),
        excluirId: doc.peticionId ?? "",
      }),
    );
    const duplicado = encontradas.some((c) => c.mismoDiaMismoTema);
    if (!body.confirmarDuplicado && (duplicado || encontradas.length > 0)) {
      return responder(
        {
          error: duplicado
            ? "Petición duplicada el mismo día y tema."
            : "Este peticionario ya existe.",
          coincidencias: encontradas,
        },
        409,
      );
    }
    const peticion = aplicarCaptura(doc, lote, body, "escaneado_territorio");
    return responder({ peticion: capturaDesde(peticion) });
  }

  if (path === "/api/cumplimientos/operadores" && method === "GET") {
    return responder(
      state.usuarios
        .filter((u) => u.role === "operador" || u.role === "admin")
        .map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
        })),
    );
  }

  if (path === "/api/cumplimientos/asignar" && method === "POST") {
    const ids = Array.isArray(body.peticionIds)
      ? body.peticionIds.filter((id): id is string => typeof id === "string")
      : [];
    const operador = state.usuarios.find((u) => u.id === texto(body.operadorId));
    if (!operador || (operador.role !== "operador" && operador.role !== "admin")) {
      return responder({ error: "El usuario no es operador" }, 400);
    }
    let actualizadas = 0;
    for (const peticion of state.peticiones) {
      if (!ids.includes(peticion.id)) continue;
      peticion.responsableAsignado = operador.id;
      peticion.responsableNombre = operador.displayName || operador.email;
      actualizadas += 1;
    }
    return responder({ success: true, actualizadas });
  }

  const evidencia = path.match(/^\/api\/cumplimientos\/([^/]+)\/evidencia$/);
  if (evidencia && method === "POST" && init?.body instanceof FormData) {
    const peticion = buscarPeticion(decodeURIComponent(evidencia[1]));
    if (!peticion) return responder({ error: "Petición no encontrada" }, 404);
    const file = init.body.get("file");
    if (!(file instanceof File)) return responder({ error: "Falta el archivo" }, 400);
    peticion.evidenciaUrls = [...peticion.evidenciaUrls, URL.createObjectURL(file)];
    return responder({ urls: peticion.evidenciaUrls });
  }
  if (evidencia && method === "DELETE") {
    const peticion = buscarPeticion(decodeURIComponent(evidencia[1]));
    if (!peticion) return responder({ error: "Petición no encontrada" }, 404);
    const urlArchivo = texto(body.url);
    peticion.evidenciaUrls = peticion.evidenciaUrls.filter((u) => u !== urlArchivo);
    return responder({ urls: peticion.evidenciaUrls });
  }

  const cumplimiento = path.match(/^\/api\/cumplimientos\/([^/]+)$/);
  if (cumplimiento && method === "POST") {
    const peticion = buscarPeticion(decodeURIComponent(cumplimiento[1]));
    if (!peticion) return responder({ error: "Petición no encontrada" }, 404);
    const accion = texto(body.accion);
    if (accion === "en_gestion") peticion.estatus = "en_gestion";
    else if (accion === "no_procede") {
      peticion.estatus = "no_procede";
      peticion.motivoNoProcede = texto(body.motivo) || "No procede";
    } else if (accion === "cumplida") {
      peticion.estatus = "cumplida";
      peticion.fechaCumplimiento = texto(body.fechaCumplimiento) || null;
      peticion.descripcionCumplimiento = texto(body.descripcionCumplimiento) || null;
      peticion.cerradoPor = "usr-operador";
    } else if (accion === "reclasificar") {
      const complejidad = texto(body.complejidad) as Complejidad;
      if (complejidad) peticion.complejidad = complejidad;
    } else {
      return responder({ error: "Acción no válida" }, 400);
    }
    auditar({
      actorId: "usr-operador",
      actorEmail: "operador@demo.mx",
      actorNombre: "Operación",
      accion: accion === "reclasificar" ? "complejidad" : "estatus",
      entidad: "peticion",
      entidadId: peticion.id,
      folio: peticion.folio,
      detalle: `Actualizó la petición (${accion}).`,
      antes: null,
      despues: { estatus: peticion.estatus },
    });
    return responder({ peticion: clonar(peticion) });
  }

  return responder({ error: "Esta demostración no consulta ese servicio" }, 404);
}

/** Sustituye fetch hacia /api con el almacén en memoria de la demostración. */
export async function demoFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const url = new URL(raw, "http://demo.local");
  if (!url.pathname.startsWith("/api/")) {
    return fetch(input, init);
  }
  return despachar(url, init);
}
