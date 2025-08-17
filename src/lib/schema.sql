CREATE TABLE IF NOT EXISTS accounts (id BIGSERIAL PRIMARY KEY,name TEXT NOT NULL,slug TEXT UNIQUE NOT NULL,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS production (id BIGSERIAL PRIMARY KEY,account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,"Date" DATE,"Report Type" TEXT,"Field Name / Location" TEXT,"Oil BBL" NUMERIC,"Oil Sales BBL" NUMERIC,"Gas Sales MCF" NUMERIC,"Gas Lift MCF" NUMERIC,"Produced Water BWPD" NUMERIC,"Return Gas MCF" NUMERIC,"Flare MCF" NUMERIC,"Oil Stock BBL" NUMERIC,"Injection Pressure PSI" NUMERIC,"Suction PSI" NUMERIC,"Discharge PSI" NUMERIC,"RPM" NUMERIC,"Gas Flow MCFD" NUMERIC,"Hours Operating" NUMERIC,"Operational Notes" TEXT,source_file TEXT,loaded_at_utc TIMESTAMPTZ DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_production_account_date ON production (account_id, "Date");

-- Prevent duplicate uploads for the same account, date, and field/location
CREATE UNIQUE INDEX IF NOT EXISTS uniq_production_account_date_field ON production (account_id, "Date", "Field Name / Location");
