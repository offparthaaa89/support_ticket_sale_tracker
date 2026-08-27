import { DateTime } from "luxon";

const configuredTimeZone =
  Bun.env.BUSINESS_TIMEZONE?.trim() || "Asia/Kolkata";

const timeZoneProbe = DateTime.now().setZone(configuredTimeZone);

if (!timeZoneProbe.isValid) {
  throw new Error(
    `BUSINESS_TIMEZONE "${configuredTimeZone}" is not a valid timezone`,
  );
}

export const BUSINESS_TIMEZONE = configuredTimeZone;

export const BUSINESS_START_HOUR = 9;

export const BUSINESS_END_HOUR = 18;