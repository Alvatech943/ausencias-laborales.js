import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, LogOut, FileText, PlusCircle, BarChart2 } from "lucide-react";
import { Shield } from "lucide-react";

export default function Layout() {
  const [open, setOpen] = useState(true);
  const [username, setUsername] = useState("");
  const [rol, setRol] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    const storedRol = (localStorage.getItem("rol") || "").toLowerCase();
    if (storedUser) setUsername(storedUser);
    setRol(storedRol);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("rol");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside className={`${open ? "w-64" : "w-20"} bg-white shadow-lg transition-all duration-300`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className={`text-xl font-semibold text-gray-700 ${!open && "hidden"}`}>Panel</h1>
          <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => setOpen(!open)}>
            <Menu size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-3">
          {["empleado","jefe", "secretario"].includes(rol) && (
            <button
              onClick={() => navigate("/mis-solicitudes")}
              className="flex items-center gap-2 w-full text-left rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              <FileText size={18} />
              {open && "Mis Solicitudes"}
            </button>
          )}
          {/* Solo EMPLEADO */}
          {rol === "empleado" && (
            <button
              onClick={() => navigate("/solicitud")}
              className="flex items-center gap-2 w-full text-left rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              <PlusCircle size={18} />
              {open && "Nueva Solicitud"}
            </button>
          )}

          {/* Solo JEFE o SECRETARIO */}
          {["jefe", "secretario", "admin"].includes(rol) && (
            <button
              onClick={() => navigate("/tablero")}
              className="flex items-center gap-2 w-full text-left rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              <BarChart2 size={18} />
              {open && "Tablero"}
            </button>
          )}
          {rol === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2 w-full text-left rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              {/* icono */}
              {open && "Administrador"}
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="flex justify-between items-center bg-white shadow px-6 py-4">
          <h2 className="text-lg font-medium text-gray-700">
            Bienvenido, <span className="text-blue-600 font-semibold">{username || "Usuario"}</span>
          </h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-500"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </header>

        <section className="flex-1 p-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
