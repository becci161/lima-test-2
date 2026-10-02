import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    stationEva: process.env.STATION_EVA ?? "8000105",
    stationName: process.env.STATION_NAME ?? "Frankfurt(Main)Hbf"
  });
}
