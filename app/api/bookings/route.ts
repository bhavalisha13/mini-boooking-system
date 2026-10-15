
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const resources = await pool.query(
      "SELECT id, name FROM resources ORDER BY id"
    );

    const bookings = await pool.query(
      "SELECT id, resource_id, name, start_time, end_time, created_at FROM bookings ORDER BY start_time DESC"
    );

    return NextResponse.json({
      resources: resources.rows,
      bookings: bookings.rows,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve booking data. Check your database connection." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const resourceId = Number(body.resourceId);
    const startTime = body.startTime;
    const endTime = body.endTime;

    if (
      !name ||
      !Number.isInteger(resourceId) ||
      resourceId <= 0 ||
      typeof startTime !== "string" ||
      typeof endTime !== "string" ||
      !Number.isFinite(Date.parse(startTime)) ||
      !Number.isFinite(Date.parse(endTime)) ||
      new Date(endTime) <= new Date(startTime)
    ) {
      return NextResponse.json(
        { error: "Please provide valid booking details and a valid time range." },
        { status: 400 }
      );
    }

    const resource = await pool.query(
      "SELECT id FROM resources WHERE id = $1",
      [resourceId]
    );

    if (resource.rowCount === 0) {
      return NextResponse.json(
        { error: "The selected resource does not exist." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO bookings (resource_id, name, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, resource_id, name, start_time, end_time, created_at`,
      [resourceId, name, new Date(startTime), new Date(endTime)]
    );

    return NextResponse.json({ booking: result.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to create booking. Check the database and booking constraints." },
      { status: 500 }
    );
  }
}
