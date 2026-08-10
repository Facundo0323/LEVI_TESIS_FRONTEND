import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react'; // <-- Importante agregar useEffect
import PantallaHome from './pages/PantallaHome';
import PantallaLogueo from './pages/PantallaLogueo';
import PantallaPanel from './pages/panel/PantallaPanel';
import PantallaCuestionario from './pages/panel/PantallaCuestionario';
import PantallaPerfil from './pages/panel/PantallaPerfil';
import PantallaContactos from './pages/panel/PantallaContactos';
import PantallaInvitado from './pages/PantallaInvitado';
import PantallaAlumno from './pages/PantallaAlumno';

function App() {
    const navigate = useNavigate();
    const location = useLocation(); // <-- Nos permite saber en qué ruta estamos

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`,
                },
            });
        } catch (_) {
            // Si falla la conexión igual cerramos sesión en el frontend
        } finally {
            sessionStorage.clear();
            navigate('/login');
        }
    };

    // -----------------------------------------------------------------------
    // NUEVO: MONITOR GLOBAL DE INACTIVIDAD Y SESIÓN
    // -----------------------------------------------------------------------
    useEffect(() => {
        // Solo activamos el vigilante si el usuario está dentro del panel
        if (!location.pathname.startsWith('/panel')) return;

        let lastActivity = Date.now();
        const updateActivity = () => { lastActivity = Date.now(); };

        // Escuchar cuando el usuario mueve el mouse, hace clic o toca el teclado
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);

        const intervalo = setInterval(async () => {
            // 1. Control de inactividad local (10 minutos)
            if (Date.now() - lastActivity > 600000) {
                alert("Sesión expirada por inactividad.");
                handleLogout();
                return;
            }

            // 2. Control de sesión con la placa ESP32 (Heartbeat)
            try {
                const res = await fetch('/api/auth/heartbeat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`,
                    },
                });

                if (!res.ok) {
                    const data = await res.json();
                    // Acá atrapa el error si alguien de mayor prioridad te sacó
                    alert(data.mensaje || "Sesión inválida o expirada.");
                    handleLogout();
                }
            } catch (_) {
                // Ignoramos errores de red momentáneos
            }
        }, 5000); // Revisa cada 5 segundos

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            clearInterval(intervalo);
        };
    }, [location.pathname]); 

    // -----------------------------------------------------------------------

    const handleLoginSuccess = (rol) => {
        if (rol === 'invitado') navigate('/invitado');
        else navigate('/panel');
    };

    const handleEntrarAlumno = async () => {
        navigate('/alumno');
    };

    return (
        <Routes>
            {/* Home */}
            <Route path="/" element={
                <PantallaHome
                    onEntrarAlumno={handleEntrarAlumno}
                    onEntrarUsuario={() => navigate('/login')}
                />
            } />

            {/* Login */}
            <Route path="/login" element={
                <PantallaLogueo
                    onLoginSuccess={handleLoginSuccess}
                    onGoBack={() => navigate('/')}
                />
            } />

            {/* ── Panel unificado (profesor + tutor) ── */}
            <Route path="/panel" element={
                <PantallaPanel onLogout={handleLogout} />
            } />
            <Route path="/panel/cuestionarios" element={
                <PantallaCuestionario />
            } />
            <Route path="/panel/perfil" element={
                <PantallaPerfil onLogout={handleLogout} />
            } />
            <Route path="/panel/contactos" element={
                <PantallaContactos />
            } />

            {/* Rutas antiguas redirigidas para no romper bookmarks */}
            <Route path="/profesor" element={<Navigate to="/panel" replace />} />
            <Route path="/tutor" element={<Navigate to="/panel" replace />} />

            {/* Invitado y Alumno */}
            <Route path="/invitado" element={
                <PantallaInvitado onLogout={() => navigate('/login')} />
            } />
            <Route path="/alumno" element={
                <PantallaAlumno
                    onLogout={() => navigate('/')}
                    onAlumnoOcupado={() => navigate('/')}
                />
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;