CREATE TABLE voters (
    voter_id TEXT PRIMARY KEY,
    voter_data TEXT not null
);

CREATE TABLE elections (
    election_id TEXT PRIMARY KEY,
    election_data TEXT not null
);

CREATE TABLE event_log (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT,
    physical_time INTEGER NOT NULL, -- physical time of the event
    logical_counter INTEGER NOT NULL, -- logical time of the event
    event_type TEXT, -- e.g., "check_in", "undo_check_in"
    voter_id TEXT, -- voter_id of the voter involved in the event, if any
    event_data TEXT not null -- JSON data for additional details associated with the event (id type used for check in, etc.)
);

-- Index for sorting events by hybrid logical clock physical time then logical counter - machine id is included in the rare event of tie
CREATE INDEX idx_hlc ON event_log (physical_time, logical_counter, machine_id); 

CREATE TABLE voter_check_in_status (
    voter_id TEXT PRIMARY KEY,
    voter_first_name TEXT NOT NULL,
    voter_middle_name TEXT,
    voter_last_name TEXT NOT NULL,
    is_checked_in INTEGER NOT NULL DEFAULT 0,
    machine_id TEXT,
    check_in_data TEXT,
    FOREIGN KEY (voter_id) REFERENCES voters(voter_id)
);