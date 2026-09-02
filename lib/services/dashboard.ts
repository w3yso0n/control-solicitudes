import { countDocumentosPendientesBandeja } from "@/lib/services/lotes";
import { listPeticiones } from "@/lib/services/peticiones";
import type { DashboardDto } from "@/lib/types";

export async function getDashboardData(): Promise<DashboardDto> {
  const [peticiones, documentosPendientes] = await Promise.all([
    listPeticiones(),
    countDocumentosPendientesBandeja(),
  ]);
  return { peticiones, documentosPendientes };
}
