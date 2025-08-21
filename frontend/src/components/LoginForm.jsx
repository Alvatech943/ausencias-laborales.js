import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function LoginForm() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [deps, setDeps] = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);

  const [formData, setFormData] = useState({
    nombre: "",
    usuario: "",
    password: "",
    cedula: "",
    dependencia_id: "",
  });

  // cargar dependencias
  useEffect(() => {
    if (!isLogin) {
      (async () => {
        try {
          const res = await axios.get("http://localhost:4000/api/dependencias");
          console.log("Dependencias recibidas:", res.data);
          setDeps(res.data);
        } catch (err) {
          console.error("Error cargando dependencias", err);
        } finally {
          setLoadingDeps(false);
        }
      })();
    }
  }, [isLogin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.usuario.trim() || !formData.password.trim()) {
      alert("❌ Usuario y contraseña son obligatorios");
      return;
    }
    if (!isLogin) {
      if (!formData.nombre.trim()) {
        alert("❌ El nombre es obligatorio para registrarse");
        return;
      }
      if (!formData.cedula.trim()) {
        alert("❌ La cédula es obligatoria");
        return;
      }
      if (!formData.dependencia_id) {
        alert("❌ Debes seleccionar una dependencia");
        return;
      }
      if (formData.password.length < 6) {
        alert("❌ La contraseña debe tener al menos 6 caracteres");
        return;
      }
    }

    try {
      if (isLogin) {
        // 🔑 Login
        const res = await axios.post("http://localhost:4000/api/auth/login", {
          usuario: formData.usuario,
          password: formData.password,
        });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("idUsuario", res.data.id);
        localStorage.setItem("username", formData.usuario);
        localStorage.setItem("rol", res.data.rol);
        alert("✅ Inicio de sesión exitoso");
        navigate("/mis-solicitudes");
      } else {
        // 📝 Registro
        await axios.post("http://localhost:4000/api/auth/register", {
          nombre: formData.nombre,
          usuario: formData.usuario,
          password: formData.password,
          cedula: formData.cedula,
          dependencia_id: Number(formData.dependencia_id),
        });
        alert("✅ Registro exitoso");
        setIsLogin(true);
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
      alert(
        `❌ Error: ${error.response?.data?.error || error.response?.data?.message || error.message}`
      );
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
          {isLogin ? "Iniciar Sesión" : "Crear Cuenta (Empleado)"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-gray-600 mb-2">Nombre completo</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
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
              onChange={handleChange}
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
              onChange={handleChange}
              required
              className={passwordClass}
            />
            {!isLogin && formData.password.length > 0 && formData.password.length < 6 && (
              <p className="text-red-500 text-sm mt-1">
                La contraseña debe tener al menos 6 caracteres
              </p>
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
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-gray-600 mb-2">Dependencia</label>
                {loadingDeps ? (
                  <div className="text-gray-500 text-sm">Cargando dependencias...</div>
                ) : (
                  <select
                    name="dependencia_id"
                    value={formData.dependencia_id}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Selecciona...</option>
                    {deps.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.dependencia_padre_id ? "— " : ""}
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>
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
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 font-semibold hover:underline"
          >
            {isLogin ? "Regístrate aquí" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}





// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// export default function LoginForm() {
//   const navigate = useNavigate();
//   const [isLogin, setIsLogin] = useState(true);
//   const [formData, setFormData] = useState({
//     usuario: "",
//     password: "",
//     email: "",
//     rol: "EMPLEADO",
//   });

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // Validación de campos
//     if (!formData.usuario.trim() || !formData.password.trim()) {
//       alert("❌ Usuario y contraseña son obligatorios");
//       return;
//     }
//     if (!isLogin && !formData.email.trim()) {
//       alert("❌ El correo es obligatorio para registrarse");
//       return;
//     }
//     if (!isLogin && formData.password.length < 6) {
//       alert("❌ La contraseña debe tener al menos 6 caracteres");
//       return;
//     }

//     try {
//       if (isLogin) {
//         const res = await axios.post("http://localhost:4000/api/auth/login", {
//           usuario: formData.usuario,
//           password: formData.password,
//         });
//         localStorage.setItem("token", res.data.token);
//         localStorage.setItem("idUsuario", res.data.id);   // ✅ Viene del backend
//         localStorage.setItem("username", formData.usuario);
//         localStorage.setItem("rol", res.data.rol);
//         alert("✅ Inicio de sesión exitoso");
//         navigate("/mis-solicitudes"); // Solo login redirige
//       } else {
//         console.log("Registrando con datos:", formData);
//         await axios.post("http://localhost:4000/api/auth/register", formData);
//         alert("✅ Registro exitoso");
//         setIsLogin(true); 
//         setFormData({ usuario: "", password: "", email: "", rol: "EMPLEADO" });
//       }
//     } catch (error) {
//       console.error(error.response?.data || error.message);
//       alert(
//         `❌ Error: ${error.response?.data?.message || error.response?.data || error.message}`
//       );
//     }
//   };

//   // Clase para input de contraseña: rojo si es menor a 6
//   const passwordClass =
//     formData.password.length > 0 && formData.password.length < 6
//       ? "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 border-red-500"
//       : "w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400";

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-400 to-indigo-600">
//       <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
//         <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
//           {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
//         </h2>

//         <form onSubmit={handleSubmit} className="space-y-5">
//           <div>
//             <label className="block text-gray-600 mb-2">Usuario</label>
//             <input
//               type="text"
//               name="usuario"
//               value={formData.usuario}
//               onChange={handleChange}
//               required
//               className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
//             />
//           </div>

//           <div>
//             <label className="block text-gray-600 mb-2">Contraseña</label>
//             <input
//               type="password"
//               name="password"
//               value={formData.password}
//               onChange={handleChange}
//               required
//               className={passwordClass}
//             />
//             {!isLogin && formData.password.length > 0 && formData.password.length < 6 && (
//               <p className="text-red-500 text-sm mt-1">
//                 La contraseña debe tener al menos 6 caracteres
//               </p>
//             )}
//           </div>

//           {!isLogin && (
//             <div>
//               <label className="block text-gray-600 mb-2">Correo electrónico</label>
//               <input
//                 type="email"
//                 name="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 required
//                 className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
//               />
//             </div>
//           )}

//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-300"
//           >
//             {isLogin ? "Ingresar" : "Registrar"}
//           </button>
//         </form>

//         <p className="mt-6 text-center text-gray-600">
//           {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
//           <button
//             onClick={() => setIsLogin(!isLogin)}
//             className="text-blue-600 font-semibold hover:underline"
//           >
//             {isLogin ? "Regístrate aquí" : "Inicia sesión"}
//           </button>
//         </p>
//       </div>
//     </div>
//   );
// }