import * as dentistService from "@/services/dentistService";
import { BookingFlow } from "@/components/appointments/BookingFlow";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const dentists = await dentistService.listActiveDentists();
  return <BookingFlow dentists={dentists} />;
}
