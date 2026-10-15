
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL
        REFERENCES resources(id) ON DELETE RESTRICT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_booking_time
        CHECK (end_time > start_time),
    CONSTRAINT no_overlapping_bookings
        EXCLUDE USING gist (
            resource_id WITH =,
            tstzrange(start_time, end_time, '[)') WITH &&
        )
);
