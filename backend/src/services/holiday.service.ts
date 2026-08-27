import { prisma } from "../lib/prisma";

export interface HolidayView {
  id: string;
  date: string;
  name: string;
}

function formatHolidayDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getHolidayDates(): Promise<Date[]> {
  const holidays = await prisma.holiday.findMany({
    select: {
      date: true,
    },

    orderBy: {
      date: "asc",
    },
  });

  return holidays.map(
    (holiday) => holiday.date,
  );
}

export async function listHolidays(): Promise<HolidayView[]> {
  const holidays = await prisma.holiday.findMany({
    orderBy: {
      date: "asc",
    },
  });

  return holidays.map(
    (holiday) => ({
      id: holiday.id,
      date: formatHolidayDate(
        holiday.date,
      ),
      name: holiday.name,
    }),
  );
}