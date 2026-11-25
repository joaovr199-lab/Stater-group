// Cria (ou reativa) um administrador Stater. Uso:
//   ADMIN_EMAIL=... ADMIN_NAME="..." ADMIN_PASSWORD=... npm run admin:create
import bcrypt from "bcryptjs";
import { Client } from "pg";

async function main() {
  const { DATABASE_ADMIN_URL, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env;
  if (!DATABASE_ADMIN_URL || !ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD)
    throw new Error("Defina DATABASE_ADMIN_URL, ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD");
  if (ADMIN_PASSWORD.length < 12) throw new Error("A senha deve ter pelo menos 12 caracteres");
  const c = new Client({ connectionString: DATABASE_ADMIN_URL });
  await c.connect();
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await c.query(
    `insert into app.users(email, name, password_hash, role, must_change_password)
     values (lower($1), $2, $3, 'stater_admin', false)
     on conflict (email) do update set password_hash = excluded.password_hash, active = true, role = 'stater_admin', agency_id = null`,
    [ADMIN_EMAIL, ADMIN_NAME, hash]
  );
  await c.query(`insert into app.audit_log(action, entity, data) values ('admin.bootstrap','user', jsonb_build_object('email', lower($1::text)))`, [ADMIN_EMAIL]);
  console.log(`Administrador Stater pronto: ${ADMIN_EMAIL}`);
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
