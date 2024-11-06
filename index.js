// server/index.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const mysql = require("mysql2/promise");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true })); // Configura el CORS para permitir cookies
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Función para generar tokens
const generateAccessToken = (user) =>
  jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "15m" });
const generateRefreshToken = (user) =>
  jwt.sign({ email: user.email }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

// Registro de usuario
app.post(
  "/register",
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const [user] = await db.query("SELECT * FROM users WHERE email = ?", [
        email,
      ]);
      if (user.length > 0)
        return res.status(400).json({ message: "El usuario ya existe" });

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query("INSERT INTO users (email, password) VALUES (?, ?)", [
        email,
        hashedPassword,
      ]);

      res.status(201).json({ message: "Usuario registrado exitosamente" });
    } catch (error) {
      res.status(500).json({ message: "Error en el servidor" });
    }
  }
);

// Inicio de sesión
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [user] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (user.length === 0)
      return res.status(400).json({ message: "Credenciales incorrectas" });

    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch)
      return res.status(400).json({ message: "Credenciales incorrectas" });

    const accessToken = generateAccessToken(user[0]);
    const refreshToken = generateRefreshToken(user[0]);

    await db.query("UPDATE users SET refresh_token = ? WHERE email = ?", [
      refreshToken,
      email,
    ]);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Asegúrate de usar HTTPS en producción
      sameSite: "Strict",
    });
    res.json({ accessToken });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Generación de nuevo token de acceso
app.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: "No autorizado" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const [user] = await db.query("SELECT * FROM users WHERE email = ?", [
      decoded.email,
    ]);

    if (user.length === 0 || user[0].refresh_token !== refreshToken) {
      return res.status(403).json({ message: "Token de renovación inválido" });
    }

    const newAccessToken = generateAccessToken(user[0]);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res
      .status(403)
      .json({ message: "Token de renovación inválido o expirado" });
  }
});

// Cierre de sesión
app.post("/logout", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(204).send(); // No hay token que eliminar

  res.clearCookie("refreshToken");
  await db.query(
    "UPDATE users SET refresh_token = NULL WHERE refresh_token = ?",
    [refreshToken]
  );
  res.json({ message: "Cierre de sesión exitoso" });
});

// Ruta protegida
app.get("/protected", (req, res) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ message: "Acceso concedido", user: decoded });
  } catch (error) {
    res.status(401).json({ message: "Token inválido o expirado" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Servidor corriendo en el puerto ${process.env.PORT}`);
});
