// // import { createContext, useState, useEffect } from 'react';

// // export const AuthContext = createContext();

// export function AuthProvider({ children }) {
//   const [token, setToken] = useState(localStorage.getItem('token') || '');
//   const [usuario, setUsuario] = useState(localStorage.getItem('usuario') || '');
//   const [rol, setRol] = useState(localStorage.getItem('rol') || '');

//   useEffect(() => {
//     localStorage.setItem('token', token);
//     localStorage.setItem('usuario', usuario);
//     localStorage.setItem('rol', rol);
//   }, [token, usuario, rol]);

//   const logout = () => {
//     setToken('');
//     setUsuario('');
//     setRol('');
//     localStorage.removeItem('token');
//     localStorage.removeItem('usuario');
//     localStorage.removeItem('rol');
//   };

//   return (
//     <AuthContext.Provider value={{ token, setToken, usuario, setUsuario, rol, setRol, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }
