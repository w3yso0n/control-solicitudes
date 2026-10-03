import type { Rol } from "@/lib/types";

export type UsuarioDemo = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  role: Rol;
};

/** Cuentas de la rama de demostración. La contraseña es la misma en todas. */
export const CLAVE_DEMO = "demo";

export const USUARIOS_DEMO: UsuarioDemo[] = [
  {
    id: "usr-admin",
    email: "admin@demo.mx",
    password: CLAVE_DEMO,
    displayName: "Administración",
    role: "admin",
  },
  {
    id: "usr-candidata",
    email: "candidata@demo.mx",
    password: CLAVE_DEMO,
    displayName: "Nexo Cuantiva",
    role: "candidata",
  },
  {
    id: "usr-cuantiva",
    email: "cuantiva@demo.mx",
    password: CLAVE_DEMO,
    displayName: "Captura",
    role: "cuantiva",
  },
  {
    id: "usr-operador",
    email: "operador@demo.mx",
    password: CLAVE_DEMO,
    displayName: "Operación",
    role: "operador",
  },
  {
    id: "usr-territorio",
    email: "territorio@demo.mx",
    password: CLAVE_DEMO,
    displayName: "Territorio",
    role: "territorio",
  },
];
