// src/components/LoginForm.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function LoginForm() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const [deps, setDeps] = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);

  // selección jerárquica
  const [secretariaId, setSecretariaId] = useState("");
  const [areaId, setAreaId] = useState("");

  const [formData, setFormData] = useState({
    nombre: "",
    usuario: "",
    password: "",
    cedula: "",
    dependencia_id: "", // se calcula de areaId o secretariaId (si no tiene hijas)
  });

  // cargar dependencias públicas solo en registro
  useEffect(() => {
    if (!isLogin) {
      (async () => {
        try {
          const res = await axios.get("http://localhost:4000/api/dependencias");
          setDeps(res.data || []);
        } catch (err) {
          console.error("Error cargando dependencias", err);
        } finally {
          setLoadingDeps(false);
        }
      })();
    }
  }, [isLogin]);

  // derivadas
  const secretarias = useMemo(() => deps.filter(d => !d.dependencia_padre_id), [deps]);
  const areasDeSeleccionada = useMemo(
    () => (secretariaId ? deps.filter(d => String(d.dependencia_padre_id) === String(secretariaId)) : []),
    [deps, secretariaId]
  );

  // cuando cambia la secretaría, resetea área y ajusta dependencia_id provisional
  useEffect(() => {
    setAreaId("");
    if (secretariaId && areasDeSeleccionada.length === 0) {
      setFormData(p => ({ ...p, dependencia_id: String(secretariaId) }));
    } else {
      setFormData(p => ({ ...p, dependencia_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secretariaId, areasDeSeleccionada.length]);

  // cuando cambia el área, define dependencia_id
  useEffect(() => {
    if (areaId) {
      setFormData(p => ({ ...p, dependencia_id: String(areaId) }));
    } else if (secretariaId && areasDeSeleccionada.length === 0) {
      setFormData(p => ({ ...p, dependencia_id: String(secretariaId) }));
    } else {
      setFormData(p => ({ ...p, dependencia_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId, secretariaId, areasDeSeleccionada.length]);

  // reset al alternar login/registro
  useEffect(() => {
    if (isLogin) {
      setSecretariaId("");
      setAreaId("");
      setFormData({
        nombre: "",
        usuario: "",
        password: "",
        cedula: "",
        dependencia_id: "",
      });
    }
  }, [isLogin]);

  const handleChangeSimple = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // validaciones comunes
    if (!formData.usuario.trim() || !formData.password.trim()) {
      alert("❌ Usuario y contraseña son obligatorios");
      return;
    }

    if (!isLogin) {
      // validaciones mínimas de registro
      if (!formData.nombre.trim()) {
        alert("❌ El nombre es obligatorio para registrarse");
        return;
      }
      if (!formData.cedula.trim()) {
        alert("❌ La cédula es obligatoria");
        return;
      }
      if (formData.password.length < 6) {
        alert("❌ La contraseña debe tener al menos 6 caracteres");
        return;
      }
      // 👉 OJO: NO obligamos a seleccionar dependencia/área aquí.
      // Si el usuario es admin (está en ADMIN_USERS), el backend permitirá omitirla.
      // Si no lo es, el backend devolverá 400 y el mensaje correspondiente.
    }

    try {
      if (isLogin) {
        // 🔑 Login
        const res = await axios.post("http://localhost:4000/api/auth/login", {
          usuario: formData.usuario,
          password: formData.password,
        });

        const rol = (res.data.rol || "").toLowerCase();

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("idUsuario", res.data.id);
        localStorage.setItem("username", res.data.usuario || formData.usuario);
        localStorage.setItem("rol", rol);

        alert("✅ Inicio de sesión exitoso");
        // redirección según rol
        if (rol === "admin") {
          navigate("/admin");
        } else {
          navigate("/mis-solicitudes");
        }
      } else {
        // 📝 Registro
        const depId = formData.dependencia_id ? Number(formData.dependencia_id) : undefined;

        await axios.post("http://localhost:4000/api/auth/register", {
          nombre: formData.nombre,
          usuario: formData.usuario,
          password: formData.password,
          cedula: formData.cedula,
          ...(depId ? { dependencia_id: depId } : {}), // solo incluimos si hay valor
        });

        alert("✅ Registro exitoso");
        setIsLogin(true);
        setSecretariaId("");
        setAreaId("");
        setFormData({
          nombre: "",
          usuario: "",
          password: "",
          cedula: "",
          dependencia_id: "",
        });
      }
    } catch (error) {
      console.error(error.response?.data || error.message);
      alert(`❌ Error: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    }
  };

  const passwordClass =
    formData.password.length > 0 && formData.password.length < 6
      ? "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 border-red-500"
      : "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-400 to-indigo-600">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-gray-600 mb-2">Nombre completo</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChangeSimple}
                required={!isLogin}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-600 mb-2">Usuario</label>
            <input
              type="text"
              name="usuario"
              value={formData.usuario}
              onChange={handleChangeSimple}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-2">Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChangeSimple}
              required
              className={passwordClass}
            />
            {!isLogin && formData.password.length > 0 && formData.password.length < 6 && (
              <p className="text-red-500 text-sm mt-1">La contraseña debe tener al menos 6 caracteres</p>
            )}
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-gray-600 mb-2">Cédula</label>
                <input
                  type="text"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleChangeSimple}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Secretaría / Dependencia <span className="text-xs text-gray-400">(opcional para admin)</span>
                </label>
                {loadingDeps ? (
                  <div className="text-gray-500 text-sm">Cargando dependencias...</div>
                ) : (
                  <select
                    value={secretariaId}
                    onChange={(e) => setSecretariaId(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">(Sin seleccionar)</option>
                    {secretarias.length === 0 && (
                      <option value="" disabled>(No hay dependencias)</option>
                    )}
                    {secretarias.map((d) => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                )}
              </div>

              {secretariaId && areasDeSeleccionada.length > 0 && (
                <div>
                  <label className="block text-gray-600 mb-2">Área</label>
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">(Sin seleccionar)</option>
                    {areasDeSeleccionada.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Si no seleccionas, el sistema rechazará el registro salvo que seas admin.
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-300"
          >
            {isLogin ? "Ingresar" : "Registrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-semibold hover:underline">
            {isLogin ? "Regístrate aquí" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
