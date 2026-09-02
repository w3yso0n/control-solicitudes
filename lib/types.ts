export type Rol = "territorio" | "cuantiva" | "candidata" | "admin";

export type TipoPeticion =
  | "queja"
  | "peticion"
  | "propuesta"
  | "requerimiento"
  | "reconocimiento";

export type Urgencia = "alta" | "media" | "baja";

export type Alcance = "individual" | "familiar" | "colectivo";

export type EstatusPeticion = "recibida" | "capturada" | "archivada";

export type EstatusLote = "abierto" | "cerrado";

export type EstatusDocumento = "pendiente" | "capturado";

export type PeriodoFiltro = "7" | "30" | "90" | "acumulado";

export type Municipio = {
  cveMun: string;
  nombre: string;
  codigoFolio: string;
};

export type Colonia = {
  id: string;
  nombre: string;
  cveMun: string;
  lat: number;
  lng: number;
};

export type Categoria = {
  id: string;
  nombre: string;
  subcategorias: string[];
};

export type Evento = {
  id: string;
  nombre: string;
  fecha: string;
  cveMun: string;
  lugar: string;
};

export type Ciudadano = {
  id: string;
  nombre: string;
  telefono: string;
  coloniaId?: string;
  cveMun: string;
  domicilio?: string;
};

export type DocumentoEscaneado = {
  id: string;
  loteId: string;
  imagenUrl: string;
  nombreArchivo: string;
  estatus: EstatusDocumento;
  peticionId?: string;
};

export type Lote = {
  id: string;
  fechaEntrega: string;
  eventoId?: string;
  lugar: string;
  notas?: string;
  estatus: EstatusLote;
  creadoEn: string;
  documentos: DocumentoEscaneado[];
};

export type Peticion = {
  id: string;
  folio: string;
  ciudadano: Ciudadano;
  descripcion: string;
  transcripcion: string;
  categoriaId: string;
  subcategorias: string[];
  tipo: TipoPeticion;
  urgencia: Urgencia;
  alcance: Alcance;
  comunitaria: boolean;
  firmantes?: number;
  cveMun: string;
  coloniaId?: string;
  eventoId?: string;
  fechaEntrega: string;
  fechaCaptura: string;
  estatus: EstatusPeticion;
  documentoUrl: string;
};

export type ItcComponentes = {
  volumen: number;
  urgencia: number;
  colectividad: number;
  diversidad: number;
};

export type ItcScore = {
  clave: string;
  peticiones: number;
  score: number | null;
  componentes: ItcComponentes | null;
  topCategorias: { id: string; nombre: string; count: number }[];
  urgenciaPromedio: Urgencia | null;
};

export type CapturaPeticionDto = {
  id: string;
  folio: string;
  documentoId: string;
  loteId: string;
  ciudadanoNombre: string;
  ciudadanoTelefono: string;
  descripcion: string;
  transcripcion: string;
  categoriaId: string;
  subcategorias: string[];
  tipo: TipoPeticion;
  urgencia: Urgencia;
  alcance: Alcance;
  firmantes: number | null;
  cveMun: string;
  coloniaId: string | null;
};

export type LoteDocumentoDto = {
  id: string;
  loteId: string;
  nombreArchivo: string;
  mimeType: string;
  sizeBytes: number;
  estatus: EstatusDocumento;
  url: string;
  peticionId: string | null;
  folio: string | null;
  peticion: CapturaPeticionDto | null;
};

export type LoteDto = {
  id: string;
  fechaEntrega: string;
  eventoOrigen: string;
  cveMun: string;
  notas: string | null;
  estatus: EstatusLote;
  creadoEn: string;
  documentos: LoteDocumentoDto[];
};

export type UsuarioPublico = {
  id: string;
  email: string;
  displayName: string | null;
  role: Rol;
  createdAt: string;
  updatedAt: string;
};

export type PeticionConsultaDto = {
  id: string;
  folio: string;
  documentoId: string;
  loteId: string;
  eventoOrigen: string;
  loteFechaEntrega: string;
  ciudadanoNombre: string;
  ciudadanoTelefono: string;
  descripcion: string;
  transcripcion: string;
  categoriaId: string;
  subcategorias: string[];
  tipo: TipoPeticion;
  urgencia: Urgencia;
  alcance: Alcance;
  firmantes: number | null;
  cveMun: string;
  coloniaId: string | null;
  fechaEntrega: string;
  fechaCaptura: string;
  estatus: EstatusPeticion;
  capturistaNombre: string | null;
  capturistaEmail: string;
  documento: {
    id: string;
    nombreArchivo: string;
    mimeType: string;
    sizeBytes: number;
    estatus: EstatusDocumento;
    url: string;
  };
};

export type DashboardDto = {
  peticiones: PeticionConsultaDto[];
  documentosPendientes: number;
};
