# Sample Data Snapshot to EC2

This repo now includes a full SQL snapshot of local sample data:

- `migrations/004_sample_data_snapshot.sql`

The snapshot is idempotent (`ON CONFLICT DO NOTHING`) and can be replayed safely on the same schema.

## 1) EC2 prerequisites

- Postgres client installed on EC2 (`psql`, `pg_dump`)
- `.env` exists on EC2 with correct `DATABASE_URL`
- Schema migrations already applied (`001`, `002`, `003`)

## 2) Apply snapshot on EC2

From your app folder on EC2:

```bash
npm run snapshot:apply
```

This runs:

- `scripts/apply-sample-snapshot.sh`
- Reads `DATABASE_URL` from `.env`
- Executes `migrations/004_sample_data_snapshot.sql` via `psql`

## 3) Validate import

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM ingestion.events;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM public.users;"
psql "$DATABASE_URL" -c "SELECT org_id, COUNT(*) FROM analytics.daily_active_users GROUP BY org_id ORDER BY org_id;"
```

## 4) Regenerate snapshot from local (optional)

If local sample data changes and you want a fresh snapshot:

```bash
npm run snapshot:export
```

This overwrites `migrations/004_sample_data_snapshot.sql` from your local DB using `.env`.
