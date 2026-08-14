"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { generarFolio, siguienteSecuencia } from "./folio";
import { HOY } from "./itc";
import { EVENTOS, LOTES_INICIALES, PETICIONES_INICIALES } from "./mock/seed";
import type {
  DocumentoEscaneado,
  Evento,
  Lote,
  Peticion,
} from "./types";

type CapturaInput = {
  documentoId: string;
  documentoUrl: string;
  ciudadano: Omit<Peticion["ciudadano"], "id">;
  descripcion: string;
  categoriaId: string;
  subcategorias: string[];
  tipo: Peticion["tipo"];
  urgencia: Peticion["urgencia"];
  alcance: Peticion["alcance"];
  firmantes?: number;
  cveMun: string;
  coloniaId?: string;
  eventoId?: string;
  fechaEntrega: string;
};

type Store = {
  peticiones: Peticion[];
  lotes: Lote[];
  eventos: Evento[];
  agregarLote: (input: {
    fechaEntrega: string;
    eventoId?: string;
    lugar: string;
    notas?: string;
    archivos: { nombre: string; url: string }[];
  }) => string;
  cerrarLote: (loteId: string) => void;
  capturar: (input: CapturaInput) => Peticion;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [peticiones, setPeticiones] = useState<Peticion[]>(PETICIONES_INICIALES);
  const [lotes, setLotes] = useState<Lote[]>(LOTES_INICIALES);

  const agregarLote = useCallback(
    (input: {
      fechaEntrega: string;
      eventoId?: string;
      lugar: string;
      notas?: string;
      archivos: { nombre: string; url: string }[];
    }) => {
      const id = `lote-${Date.now()}`;
      const documentos: DocumentoEscaneado[] = input.archivos.map((a, i) => ({
        id: `${id}-doc-${i + 1}`,
        loteId: id,
        imagenUrl: a.url,
        nombreArchivo: a.nombre,
        estatus: "pendiente",
      }));
      const lote: Lote = {
        id,
        fechaEntrega: input.fechaEntrega,
        eventoId: input.eventoId,
        lugar: input.lugar,
        notas: input.notas,
        estatus: "abierto",
        creadoEn: new Date().toISOString(),
        documentos,
      };
      setLotes((prev) => [lote, ...prev]);
      return id;
    },
    [],
  );

  const cerrarLote = useCallback((loteId: string) => {
    setLotes((prev) =>
      prev.map((l) => (l.id === loteId ? { ...l, estatus: "cerrado" } : l)),
    );
  }, []);

  const capturar = useCallback((input: CapturaInput) => {
    const ahora = HOY;
    const { documentoId } = input;
    let creada: Peticion | undefined;
    setPeticiones((prev) => {
      const seq = siguienteSecuencia(
        prev.map((p) => p.folio),
        ahora,
        input.cveMun,
      );
      const folio = generarFolio(ahora, input.cveMun, seq);
      creada = {
        id: `pet-${prev.length + 1}`,
        folio,
        fechaCaptura: ahora.toISOString(),
        estatus: "capturada",
        comunitaria: input.alcance === "colectivo",
        documentoUrl: input.documentoUrl,
        descripcion: input.descripcion,
        categoriaId: input.categoriaId,
        subcategorias: input.subcategorias,
        tipo: input.tipo,
        urgencia: input.urgencia,
        alcance: input.alcance,
        firmantes: input.firmantes,
        cveMun: input.cveMun,
        coloniaId: input.coloniaId,
        eventoId: input.eventoId,
        fechaEntrega: input.fechaEntrega,
        ciudadano: {
          ...input.ciudadano,
          id: `c-${prev.length + 1}`,
        },
      };
      return [creada, ...prev];
    });
    setLotes((prev) =>
      prev.map((lote) => ({
        ...lote,
        documentos: lote.documentos.map((d) =>
          d.id === documentoId
            ? { ...d, estatus: "capturado", peticionId: creada?.id }
            : d,
        ),
      })),
    );
    if (!creada) throw new Error("No se pudo capturar");
    return creada;
  }, []);

  const value = useMemo(
    () => ({
      peticiones,
      lotes,
      eventos: EVENTOS,
      agregarLote,
      cerrarLote,
      capturar,
    }),
    [peticiones, lotes, agregarLote, cerrarLote, capturar],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
