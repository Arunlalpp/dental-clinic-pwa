import { NextResponse } from "next/server";
import * as appointmentService from "@/services/appointmentService";
import { notifyStaff } from "@/services/notificationService";
import { to12h } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Polled by a scheduler (see vercel.json) to push a reminder for
 * appointments starting soon. Not tied to Vercel specifically — any
 * scheduler that can send `Authorization: Bearer $CRON_SECRET` on a GET
 * request works (GitHub Actions cron, cron-job.org, etc.), which matters
 * because Vercel's own Cron Jobs only support sub-daily schedules on paid
 * plans; see the deploy notes for alternatives on Hobby.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await appointmentService.findDueReminders();

  for (const appointment of due) {
    await notifyStaff({
      title: "Upcoming appointment",
      body: `${appointment.patient_name} with ${appointment.dentist_name ?? "unassigned"} at ${to12h(appointment.start_time)}`,
      url: "/appointments",
    });
    await appointmentService.markReminderSent(appointment.id);
  }

  return NextResponse.json({ ok: true, reminded: due.length });
}
