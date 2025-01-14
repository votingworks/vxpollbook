CREATE TABLE voters (
    voter_id TEXT PRIMARY KEY,
    voter_data TEXT not null
);

CREATE TABLE elections (
    election_id INTEGER PRIMARY KEY AUTOINCREMENT,
    election_data TEXT not null
);

CREATE TABLE event_log (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT, -- e.g., "check_in", "undo_check_in"
    voter_id TEXT, -- voter_id of the voter involved in the event, if any
    event_data TEXT not null -- JSON data for additional details associated with the event (id type used for check in, etc.)
);