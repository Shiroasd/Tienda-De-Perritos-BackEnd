const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de variables de entorno con valores por defecto
const {
  DB_HOST = "10.0.2.88",
  DB_USER = "alumno",
  DB_PASSWORD = "alumno123",
  DB_NAME = "tienda_perritos",
  DB_PORT = 3306,
} = process.env;

app.use(cors());
app.use(express.json());

let pool;

// Inicializar pool de conexiones con verificación
async function initDb() {
  try {
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

    // Verificación real de conexión antes de iniciar
    await pool.query('SELECT 1');
    console.log("Pool de conexiones MySQL inicializado y verificado correctamente.");
  } catch (err) {
    console.error("ERROR CRÍTICO al inicializar MySQL:", err.message);
    throw err;
  }
}

// Helper centralizado para errores
function handleError(res, error, message = "Error interno del servidor") {
  console.error("Error en operación:", error);
  res.status(500).json({ message, details: error.message });
}

// --- Rutas ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend de tienda de perritos en ejecución." });
});

app.get("/api/productos", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, descripcion, precio, stock FROM productos ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    handleError(res, err, "No se pudieron obtener los productos.");
  }
});

app.get("/api/productos/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, descripcion, precio, stock FROM productos WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Producto no encontrado." });
    res.json(rows[0]);
  } catch (err) {
    handleError(res, err, "No se pudo obtener el producto.");
  }
});

app.post("/api/productos", async (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;
  if (!nombre || precio == null || stock == null) return res.status(400).json({ message: "Datos incompletos." });
  try {
    const [result] = await pool.query("INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)", [nombre, descripcion, precio, stock]);
    res.status(201).json({ id: result.insertId, nombre, descripcion, precio, stock });
  } catch (err) {
    handleError(res, err, "No se pudo crear el Producto.");
  }
});

app.put("/api/productos/:id", async (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;
  try {
    const [result] = await pool.query("UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ? WHERE id = ?", [nombre, descripcion, precio, stock, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Producto no encontrado." });
    res.json({ message: "Producto actualizado." });
  } catch (err) {
    handleError(res, err, "No se pudo actualizar el Producto.");
  }
});

app.delete("/api/productos/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM productos WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Producto no encontrado." });
    res.json({ message: "Producto eliminado correctamente." });
  } catch (err) {
    handleError(res, err, "No se pudo eliminar el Producto.");
  }
});

// --- Inicio del Servidor ---
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Servidor backend escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("Fallo al iniciar el servidor. Verifica las credenciales de BD.");
    process.exit(1);
  }
}

startServer();