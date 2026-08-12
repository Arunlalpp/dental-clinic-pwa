import * as patientService from "@/services/patientService";
import { PatientSearchList } from "@/components/patients/PatientSearchList";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const initial = await patientService.listRecentPatients(20);
  return <PatientSearchList initial={initial} />;
}
