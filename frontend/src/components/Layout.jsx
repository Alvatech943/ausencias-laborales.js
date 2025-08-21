// src/components/Layout.jsx
import { useState, useEffect } from "react";
import { Menu, LogOut, FileText, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Obtener el nombre del usuario guardado en localStorage
    const storedUser = localStorage.getItem("username");
    if (storedUser) {
      setUsername(storedUser);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username"); // Borrar también el usuario
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`${
          open ? "w-64" : "w-20"
        } bg-white shadow-lg transition-all duration-300`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h1
            className={`text-xl font-semibold text-gray-700 ${
              !open && "hidden"
            }`}
          >
            Panel
          </h1>
          <button
            className="p-2 rounded-md hover:bg-gray-100"
            onClick={() => setOpen(!open)}
          >
            <Menu size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-3">
          <button
              onClick={() => navigate("/mis-solicitudes")}
              className="flex items-center gap-2 w-full text-left rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <FileText size={18} />
            {open && "Mis Solicitudes"}
          </button>
              
              <button
                onClick={() => navigate("/solicitud")}
                className="flex items-center gap-2 w-full text-left rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <PlusCircle size={18} />
                {open && "Nueva Solicitud"}
              </button>
          
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center bg-white shadow px-6 py-4">
          <h2 className="text-lg font-medium text-gray-700">
            Bienvenido,{" "}
            <span className="text-blue-600 font-semibold">
              {username || "Usuario"}
            </span>
          </h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-500"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </header>

        {/* Content */}
        <section className="flex-1 p-6">{children}</section>
      </main>
    </div>
  );
}
