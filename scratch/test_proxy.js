const { neon } = require('@neondatabase/serverless');

const getClient = () => {
  return neon("postgresql://neondb_owner:npg_e1zifTH5dZaE@ep-gentle-mouse-ankslyb3-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
};

const sql = new Proxy(() => {}, {
  apply(target, thisArg, argumentsList) {
    console.log("Proxy applied with arguments:", argumentsList);
    return getClient()(...argumentsList);
  }
});

async function run() {
  try {
    const results = await sql`SELECT 1 as val`;
    console.log("Proxy query results:", results);
  } catch (e) {
    console.error("Proxy query failed:", e);
  }
}

run();
