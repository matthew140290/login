import { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

axios.defaults.withCredentials = true;

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/register", { email, password });
      setMessage("Usuario registrado exitosamente");
    } catch (error) {
      setMessage("Error en el registro");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/login", {
        email,
        password,
      });
      setAccessToken(response.data.accessToken);
      setMessage("Inicio de sesión exitoso");
    } catch (error) {
      setMessage("Error en el inicio de sesión");
    }
  };

  const handleProtected = async () => {
    try {
      const response = await axios.get("http://localhost:5000/protected", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setMessage(response.data.message);
    } catch (error) {
      if (error.response.status === 401) {
        await refreshAccessToken();
        handleProtected();
      } else {
        setMessage("Acceso denegado");
      }
    }
  };

  const refreshAccessToken = async () => {
    try {
      const response = await axios.post("http://localhost:5000/refresh");
      setAccessToken(response.data.accessToken);
    } catch (error) {
      setMessage("No se pudo renovar el token");
    }
  };

  const handleLogout = async () => {
    await axios.post("http://localhost:5000/logout");
    setAccessToken("");
    setMessage("Cierre de sesión exitoso");
  };

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-md-6 offset-md-3">
          <h2 className="text-center mb-4">Autenticación</h2>

          <div className="card p-4">
            <h3 className="text-center">Registro</h3>
            <form onSubmit={handleRegister}>
              <div className="form-group mb-3">
                <label htmlFor="registerEmail">Correo electrónico</label>
                <input
                  type="email"
                  className="form-control"
                  id="registerEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  required
                />
              </div>
              <div className="form-group mb-3">
                <label htmlFor="registerPassword">Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  id="registerPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-100">
                Registrarse
              </button>
            </form>
          </div>

          <div className="card p-4 mt-4">
            <h3 className="text-center">Iniciar Sesión</h3>
            <form onSubmit={handleLogin}>
              <div className="form-group mb-3">
                <label htmlFor="loginEmail">Correo electrónico</label>
                <input
                  type="email"
                  className="form-control"
                  id="loginEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  required
                />
              </div>
              <div className="form-group mb-3">
                <label htmlFor="loginPassword">Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  id="loginPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                />
              </div>
              <button type="submit" className="btn btn-success w-100">
                Iniciar Sesión
              </button>
            </form>
          </div>

          <div className="text-center mt-3">
            <button className="btn btn-warning mt-3" onClick={handleProtected}>
              Acceder a ruta protegida
            </button>
            <button className="btn btn-danger mt-3" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>

          {message && (
            <p className="alert alert-info mt-3 text-center">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
