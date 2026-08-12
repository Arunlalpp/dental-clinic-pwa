import { notFound } from "next/navigation";
import * as patientService from "@/services/patientService";
import * as appointmentService from "@/services/appointmentService";
import * as treatmentService from "@/services/treatmentService";
import * as paymentService from "@/services/paymentService";
import * as prescriptionService from "@/services/prescriptionService";
import { PatientProfile } from "@/components/patients/PatientProfile";

export const dynamic = "force-dynamic";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const patient = await patientService.getPatientPreview(id);
  if (!patient) notFound();

  const [appointments, treatments, payments, prescriptions] = await Promise.all([
    appointmentService.listByPatient(id),
    treatmentService.listByPatient(id),
    paymentService.listByPatient(id),
    prescriptionService.listByPatient(id),
  ]);

  return (
    <PatientProfile
      patient={patient}
      appointments={appointments}
      treatments={treatments}
      payments={payments}
      prescriptions={prescriptions}
    />
  );
}
