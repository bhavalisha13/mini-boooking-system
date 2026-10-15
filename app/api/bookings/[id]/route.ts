
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = Number(id);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return NextResponse.json(
        { error: "Invalid booking ID." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "DELETE FROM bookings WHERE id = $1 RETURNING id",
      [bookingId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Booking deleted successfully."
    });
  } catch (error) {
    console.error("Delete booking error:", error);

    return NextResponse.json(
      { error: "Unable to delete booking." },
      { status: 500 }
    );
  }
}
