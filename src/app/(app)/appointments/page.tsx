import * as appointmentService from "@/services/appointmentService";
import * as treatmentPriceService from "@/services/treatmentPriceService";
import { ScheduleView } from "@/components/appointments/ScheduleView";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
    const today = new Date().toISOString().slice(0, 10);
    const [initial, prices] = await Promise.all([
        appointmentService.listByDate(today),
        treatmentPriceService.listPrices(),
    ]);
    return <ScheduleView initial={initial} date={today} prices={prices} />;
}
