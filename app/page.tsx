"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";

type CalendarView = "month" | "week" | "day";

type Resource = {
  id: number;
  name: string;
};

type Booking = {
  id: number;
  resource_id: number;
  name: string;
  start_time: string;
  end_time: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [name, setName] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [calendarDateState, setCalendarDate] = useState<Date | null>(null);
  const calendarDate = calendarDateState ?? new Date(2026, 9, 16);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  async function readResponse(response: Response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("The server returned an unexpected response. Please check the terminal.");
    }
  }

  async function loadData() {
    try {
      const response = await fetch("/api/bookings", { cache: "no-store" });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to load booking records.");

      const loadedResources: Resource[] = data.resources || [];
      const loadedBookings: Booking[] = data.bookings || [];

      setResources(loadedResources);
      setBookings(loadedBookings);
      setResourceId((current) => {
        if (current && loadedResources.some((resource) => String(resource.id) === current)) {
          return current;
        }
        return loadedResources.length ? String(loadedResources[0].id) : "";
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load data.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setNow(Date.now());
    setCalendarDate(new Date());
    loadData();
  }, []);

  const upcomingBookings = bookings.filter(
    (booking) => now !== null && new Date(booking.start_time).getTime() > now
  );

  const roomsInUse =
    now === null
      ? 0
      : resources.filter((resource) =>
          bookings.some(
            (booking) =>
              booking.resource_id === resource.id &&
              new Date(booking.start_time).getTime() <= now &&
              new Date(booking.end_time).getTime() > now
          )
        ).length;

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (!name.trim() || !resourceId || !startTime || !endTime) {
      setMessage("Please complete all booking fields.");
      setMessageType("error");
      return;
    }

    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      setMessage("Booking Rejected! The end time must be later than the start time. Please correct your booking details and try again.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          resourceId,
          startTime: toLocalDateTime(startTime),
          endTime: toLocalDateTime(endTime),
        }),
      });

      const data = await readResponse(response);
      if (!response.ok) {
        const errorMessage = data.error || "Unable to create booking.";
        setMessage(
          errorMessage.toLowerCase().includes("overlap")
            ? "Booking Rejected! This meeting room is already booked during your selected time. Please choose another available time or room."
            : `Booking Rejected! ${errorMessage} Please correct your booking details and try again.`
        );
        setMessageType("error");
        return;
      }

      setMessage("Booking created successfully! Your meeting room is reserved.");
      setMessageType("success");
      setName("");
      setStartTime("");
      setEndTime("");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Booking Rejected! Unable to create the booking. Please try again.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBooking(id: number) {
    const booking = bookings.find((item) => item.id === id);
    if (!booking) return;

    const confirmed = window.confirm(
      `DELETE BOOKING\n\nBooking: ${booking.name}\n\nAre you sure you want to permanently delete this meeting room booking? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || "Unable to delete booking.");

      setMessage("Booking deleted successfully.");
      setMessageType("success");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete booking.");
      setMessageType("error");
    } finally {
      setDeletingId(null);
    }
  }

  const roomColors = [
    { event: "bg-blue-600 text-white", dot: "bg-blue-600", soft: "bg-blue-50 text-blue-800 border-blue-200" },
    { event: "bg-violet-600 text-white", dot: "bg-violet-600", soft: "bg-violet-50 text-violet-800 border-violet-200" },
    { event: "bg-emerald-600 text-white", dot: "bg-emerald-600", soft: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { event: "bg-orange-500 text-white", dot: "bg-orange-500", soft: "bg-orange-50 text-orange-800 border-orange-200" },
  ];

  function roomColor(resourceIdValue: number) {
    const index = Math.max(0, resources.findIndex((resource) => resource.id === resourceIdValue));
    return roomColors[index % roomColors.length];
  }

  function startOfWeek(date: Date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - result.getDay());
    return result;
  }

  function sameDate(first: Date, second: Date) {
    return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
  }

  function dateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function bookingsForDate(date: Date) {
    return [...bookings]
      .filter((booking) => {
        const start = new Date(booking.start_time);
        const end = new Date(booking.end_time);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        return start.getTime() < dayEnd && end.getTime() > dayStart;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  function changeCalendar(direction: number) {
    setCalendarDate((current) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next = new Date(current);
      if (calendarView === "month") next.setMonth(next.getMonth() + direction);
      else if (calendarView === "week") next.setDate(next.getDate() + direction * 7);
      else next.setDate(next.getDate() + direction);
      next.setHours(0, 0, 0, 0);
      if (next < today) return today;
      return next;
    });
  }

  function calendarTitle() {
    if (calendarView === "month") return calendarDate.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
    if (calendarView === "day") return calendarDate.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const first = startOfWeek(calendarDate);
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    if (first.getMonth() === last.getMonth()) return `${first.getDate()} – ${last.getDate()} ${last.toLocaleDateString("en-MY", { month: "long", year: "numeric" })}`;
    return `${first.toLocaleDateString("en-MY", { day: "numeric", month: "short" })} – ${last.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}`;
  }

  const stats = [
    {
      title: "Total bookings",
      value: bookings.length,
      description: "All reservations in the system",
      icon: "▤",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-700",
      accent: "bg-blue-600",
    },
    {
      title: "Upcoming",
      value: upcomingBookings.length,
      description: "Scheduled for a later time",
      icon: "◷",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-700",
      accent: "bg-violet-600",
    },
    {
      title: "Rooms registered",
      value: resources.length,
      description: "Meeting spaces available",
      icon: "▦",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-700",
      accent: "bg-emerald-600",
    },
    {
      title: "Currently in use",
      value: roomsInUse,
      description: "Rooms in active meetings",
      icon: "⌁",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-700",
      accent: "bg-amber-500",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-800">
      <header className="relative overflow-hidden bg-[#101d3a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.28),_transparent_55%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg shadow-black/10">
              <img src="/surgeai-logo.png" alt="SurgeAI Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-blue-300">SurgeAI Workspace</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Meeting Room Booking</h1>
              <p className="mt-1 text-sm text-slate-300">Manage your workspace reservations in one place.</p>
            </div>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
            </span>
            <div>
              <p className="text-sm font-semibold">Booking system online</p>
              <p className="mt-0.5 text-xs text-slate-300">Connected to PostgreSQL</p>
            </div>
            <span className="ml-2 hidden rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 sm:inline-block">LIVE</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-blue-700">OVERVIEW</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Workspace dashboard</h2>
            <p className="mt-2 text-sm text-slate-500">A quick overview of your meeting rooms and reservations.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {loading ? "Syncing booking data..." : "Booking data is up to date"}
          </div>
        </div>

        <section aria-label="Booking statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.title} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_14px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`absolute inset-y-0 left-0 w-1 ${stat.accent}`} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{loading ? "—" : stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${stat.iconBg} ${stat.iconColor}`}>{stat.icon}</div>
              </div>
              <p className="mt-3 text-xs text-slate-500">{stat.description}</p>
            </div>
          ))}
        </section>

        <section id="booking-calendar" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_24px_rgba(15,23,42,0.045)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" strokeLinecap="round"/></svg>
                </div>
                <div><h2 className="text-base font-bold text-slate-900">Booking calendar</h2><p className="mt-0.5 text-xs text-slate-500">See room reservations by date and time.</p></div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setCalendarDate(new Date())} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Today</button>
                <div className="flex items-center rounded-lg border border-slate-200 p-1">
                  <button type="button" aria-label="Previous period" onClick={() => changeCalendar(-1)} className="rounded-md px-2 py-1 text-base text-slate-600 hover:bg-slate-100">‹</button>
                  <button type="button" aria-label="Next period" onClick={() => changeCalendar(1)} className="rounded-md px-2 py-1 text-base text-slate-600 hover:bg-slate-100">›</button>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  {(["month", "week", "day"] as CalendarView[]).map((view) => <button key={view} type="button" onClick={() => setCalendarView(view)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize transition ${calendarView === view ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{view}</button>)}
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h3 className="text-base font-bold text-slate-900">{calendarTitle()}</h3><div className="flex flex-wrap gap-x-4 gap-y-2">{resources.map((resource) => <span key={resource.id} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600"><span className={`h-2 w-2 rounded-sm ${roomColor(resource.id).dot}`}/>{resource.name}</span>)}</div></div>
          </div>
          {calendarView === "month" ? (() => {
            const first = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
            const gridStart = startOfWeek(first);
            const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + index); return date; });
            return <div className="p-2"><div className="grid grid-cols-7 border-b border-slate-200">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">{day}</div>)}</div><div className="grid grid-cols-7 border-l border-slate-100">{days.map((date) => { const isPast = date < new Date(new Date(now ?? 0).getFullYear(), new Date(now ?? 0).getMonth(), new Date(now ?? 0).getDate()); const dayBookings = bookingsForDate(date); return <div key={dateKey(date)} className={`min-h-[42px] border-b border-r border-slate-100 p-0.5 ${isPast ? "bg-slate-50/50" : date.getMonth() !== calendarDate.getMonth() ? "bg-slate-50/70" : "bg-white"} ${now !== null && sameDate(date, new Date(now)) ? "bg-blue-50/50" : ""}`}>{!isPast && <><button type="button" onClick={() => { setCalendarDate(date); setCalendarView("day"); }} className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${sameDate(date, new Date(now ?? 0)) ? "bg-blue-700 text-white" : date.getMonth() === calendarDate.getMonth() ? "text-slate-700 hover:bg-slate-100" : "text-slate-300"}`}>{date.getDate()}</button><div className="space-y-0.5">{dayBookings.filter((booking) => new Date(booking.end_time).getTime() > Date.now()).slice(0, 2).map((booking) => <button type="button" key={booking.id} onClick={() => setSelectedBooking(booking)} title={`${booking.name} · ${new Date(booking.start_time).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}`} className={`block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold ${roomColor(booking.resource_id).soft}`}>{new Date(booking.start_time).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })} {booking.name}</button>)}{dayBookings.filter((booking) => new Date(booking.end_time).getTime() > Date.now()).length > 2 && <button type="button" onClick={() => { setCalendarDate(date); setCalendarView("day"); }} className="px-1 text-[9px] font-semibold text-blue-700">+more</button>}</div></>}</div>; })}</div></div>;
          })() : (() => {
            const today = new Date(now ?? 0); today.setHours(0, 0, 0, 0);
            const dates = (calendarView === "day" ? [new Date(calendarDate)] : Array.from({ length: 7 }, (_, index) => { const date = startOfWeek(calendarDate); date.setDate(date.getDate() + index); return date; })).filter((date) => date >= today);
            const hours = Array.from({ length: 10 }, (_, index) => index + 8);
            return <div className="overflow-x-auto p-2"><div className="min-w-[560px]"><div className="grid" style={{ gridTemplateColumns: `48px repeat(${dates.length}, minmax(0, 1fr))` }}><div className="border-b border-slate-100 p-2"/>{dates.map((date) => <button type="button" key={dateKey(date)} onClick={() => { setCalendarDate(date); setCalendarView("day"); }} className={`border-b border-l border-slate-100 px-1.5 py-1.5 text-center hover:bg-blue-50 ${sameDate(date, new Date(now ?? 0)) ? "bg-blue-50" : ""}`}><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{date.toLocaleDateString("en-MY", { weekday: "short" })}</span><span className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${sameDate(date, new Date(now ?? 0)) ? "bg-blue-700 text-white" : "text-slate-800"}`}>{date.getDate()}</span></button>)}{hours.map((hour) => <Fragment key={`hour-row-${hour}`}><div key={`hour-${hour}`} className="h-7 border-b border-slate-100 pr-1.5 pt-0.5 text-right text-[9px] text-slate-400">{String(hour).padStart(2, "0")}:00</div>{dates.map((date) => { const hourStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).getTime(); const hourEnd = hourStart + 60 * 60 * 1000; const items = bookingsForDate(date).filter((booking) => new Date(booking.start_time).getTime() < hourEnd && new Date(booking.end_time).getTime() > hourStart); return <div key={`${dateKey(date)}-${hour}`} className="relative h-7 border-b border-l border-slate-100 p-0.5">{items.map((booking) => <button type="button" key={booking.id} onClick={() => setSelectedBooking(booking)} className={`mb-1 block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold shadow-sm ${roomColor(booking.resource_id).event}`} title={`${booking.name} (${formatDate(booking.start_time)} – ${formatDate(booking.end_time)})`}>{new Date(booking.start_time).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })} {booking.name}</button>)}</div>; })}</Fragment>)}</div></div></div>;
          })()}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500"><span>Click any booking to view details.</span><span>{bookings.length} reservations loaded from your database</span></div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_24px_rgba(15,23,42,0.045)]">
          <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
                <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3M8 16h6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Create a booking</h2>
              <p className="mt-1 text-sm text-slate-500">Enter your meeting details to reserve a room.</p>
            </div>
          </div>

          <form onSubmit={createBooking} className="space-y-6 p-5 sm:p-7">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="bookingName" className="mb-2 block text-sm font-semibold text-slate-700">Booking name</label>
                <input
                  id="bookingName"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Weekly team meeting"
                  maxLength={100}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label htmlFor="resource" className="mb-2 block text-sm font-semibold text-slate-700">Meeting room</label>
                <select
                  id="resource"
                  value={resourceId}
                  onChange={(event) => setResourceId(event.target.value)}
                  required
                  disabled={loading || resources.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                >
                  <option value="">Select a meeting room</option>
                  {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="startTime" className="mb-2 block text-sm font-semibold text-slate-700">Start date &amp; time</label>
                <input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  min={now === null ? undefined : toLocalDateTime(new Date(now).toISOString())}
                  required
                  className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:px-4"
                />
              </div>
              <div>
                <label htmlFor="endTime" className="mb-2 block text-sm font-semibold text-slate-700">End date &amp; time</label>
                <input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  min={startTime || (now === null ? undefined : toLocalDateTime(new Date(now).toISOString()))}
                  required
                  className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:px-4"
                />
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs leading-5 text-slate-500">Please check your selected date and time before submitting. Room availability is validated automatically.</p>
              <button
                type="submit"
                disabled={loading || saving || resources.length === 0}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    Creating booking...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                    Create booking
                  </>
                )}
              </button>
            </div>

            {resources.length === 0 && !loading && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No meeting rooms were found. Please add rooms to your database first.</p>}

            {message && (
              <div role="alert" aria-live="assertive" className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${messageType === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold ${messageType === "error" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{messageType === "error" ? "!" : "✓"}</span>
                <div>
                  <p className="font-bold">{messageType === "error" ? "Booking rejected" : "All done!"}</p>
                  <p className="mt-1 leading-6">{message}</p>
                </div>
              </div>
            )}
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_24px_rgba(15,23,42,0.045)]">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h4" strokeLinecap="round" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Booking records</h2>
                <p className="mt-1 text-sm text-slate-500">Review and manage your room reservations.</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Loading booking records...
            </div>
          ) : bookings.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h5" strokeLinecap="round" /></svg>
              </div>
              <p className="mt-4 font-semibold text-slate-800">No bookings yet</p>
              <p className="mt-1 text-sm text-slate-500">Your reservations will appear here once you create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-5 py-4 font-semibold">ID</th>
                    <th className="border-b border-slate-200 px-5 py-4 font-semibold">Booking name</th>
                    <th className="border-b border-slate-200 px-5 py-4 font-semibold">Meeting room</th>
                    <th className="border-b border-slate-200 px-5 py-4 font-semibold">Start date &amp; time</th>
                    <th className="border-b border-slate-200 px-5 py-4 font-semibold">End date &amp; time</th>
                    <th className="border-b border-slate-200 px-5 py-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...bookings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map((booking) => {
                    const room = resources.find((resource) => resource.id === booking.resource_id);
                    const isUpcoming = now !== null && new Date(booking.start_time).getTime() > now;
                    const isActive = now !== null && new Date(booking.start_time).getTime() <= now && new Date(booking.end_time).getTime() > now;
                    return (
                      <tr key={booking.id} className="transition hover:bg-blue-50/40">
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-400">#{booking.id}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{booking.name}</p>
                          <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${isActive ? "bg-emerald-50 text-emerald-700" : isUpcoming ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : isUpcoming ? "bg-blue-500" : "bg-slate-400"}`} />
                            {isActive ? "In progress" : isUpcoming ? "Upcoming" : "Completed"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                            <span className="h-2 w-2 rounded-sm bg-blue-500" />
                            {room?.name || `Room ${booking.resource_id}`}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(booking.start_time)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(booking.end_time)}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => deleteBooking(booking.id)}
                            disabled={deletingId !== null}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === booking.id ? (
                              <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                Delete
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-col justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-7">
            <span>Reservation data is stored securely in your PostgreSQL database.</span>
            <span>Showing {bookings.length} {bookings.length === 1 ? "record" : "records"}</span>
          </div>
        </section>
      </div>

      {selectedBooking && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}><div role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Booking details · #{selectedBooking.id}</p><h2 id="booking-detail-title" className="mt-2 text-2xl font-bold text-slate-900">{selectedBooking.name}</h2></div><button type="button" onClick={() => setSelectedBooking(null)} aria-label="Close booking details" className="rounded-lg p-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button></div><div className="mt-6 space-y-4"><div className={`rounded-xl border p-4 ${roomColor(selectedBooking.resource_id).soft}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-70">Meeting room</p><p className="mt-1 font-bold">{resources.find((resource) => resource.id === selectedBooking.resource_id)?.name || `Room ${selectedBooking.resource_id}`}</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Start</p><p className="mt-1 text-sm font-bold text-slate-800">{formatDate(selectedBooking.start_time)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">End</p><p className="mt-1 text-sm font-bold text-slate-800">{formatDate(selectedBooking.end_time)}</p></div></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Booked by</p><p className="mt-1 font-semibold text-slate-800">{selectedBooking.name}</p></div></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelectedBooking(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button><button type="button" disabled={deletingId !== null} onClick={async () => { const id = selectedBooking.id; setSelectedBooking(null); await deleteBooking(id); }} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Delete booking</button></div></div></div>}

      <footer className="border-t border-slate-800 bg-[#101d3a] px-5 py-6 text-center text-sm text-slate-300">
        <div className="flex items-center justify-center gap-2">
          <span className="font-semibold text-white">SurgeAI</span>
          <span className="text-slate-500">·</span>
          <span>Meeting Room Booking System</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">Workspace reservations made simple.</p>
      </footer>
    </main>
  );
}
