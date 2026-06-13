const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3001;

// Variables de entorno inyectadas por ECS
const DB_HOST = process.env.DB_HOST || "10.0.2.88";
const DB_USER = process.env.DB_USER || "alumno";
const DB_PASSWORD = process.env.DB_PASSWORD || "alumno123";
const DB_NAME = process.env.DB_NAME || "tienda_perritos";
const DB_PORT = process.env.DB_PORT || 3306;

app.use(cors());
app.use(express.json());

let pool;

// Inicialización resiliente: no mata al servidor si la DB falla al inicio
async function initDb() {
  try {
    console.log(`Intentando conectar a MySQL en: ${DB_HOST}:${DB_PORT}`);
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Verificación de conexión
    await pool.query('SELECT 1');
    console.log("¡Conexión a MySQL exitosa!");
  } catch (err) {
    console.error("ERROR DE CONEXIÓN A DB:", err.message);
    // No usamos process.exit(1) para permitir que el servidor siga vivo y veamos el error en los logs
  }
}

// Helper para errores
function handleError(res, error, message = "Error interno del servidor") {
  console.error("Error detallado:", error);
  res.status(500).json({ message, details: error.message });
}

// --- Endpoints ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend activo y escuchando." });
});

app.get("/api/productos", async (req, res) => {
  if (!pool) return handleError(res, new Error("Pool no inicializado"), "Base de datos no disponible.");
  try {
    const [rows] = await pool.query("SELECT id, nombre, descripcion, precio, stock FROM productos ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    handleError(res, err, "No se pudieron obtener los productos.");
  }
});

// --- Iniciar ---
app.listen(PORT, async () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
  await initDb();
});