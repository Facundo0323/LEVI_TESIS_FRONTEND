import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { logout } from './services/api';
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
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // -----------------------------------------------------------------------
    // MONITOR GLOBAL DE INACTIVIDAD Y SESIÓN
    // -----------------------------------------------------------------------
    useEffect(function monitorInactividad() {
        if (!location.pathname.startsWith('/panel')) return;

        let lastActivity = Date.now();
        const updateActivity = () => { lastActivity = Date.now(); };

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);

        const intervalo = setInterval(async () => {
            if (Date.now() - lastActivity > 600000) {
                alert("Sesión expirada por inactividad.");
                handleLogout();
                return;
            }

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
                    alert(data.mensaje || "Sesión inválida o expirada.");
                    handleLogout();
                }
            } catch (_) {
            }
        }, 5000);

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            clearInterval(intervalo);
        };
    }, [location.pathname]); 

    // -----------------------------------------------------------------------
    // FUNCIONES DE NAVEGACIÓN
    // -----------------------------------------------------------------------

    const handleLoginSuccess = (rol) => {
        if (rol === 'invitado') navigate('/invitado');
        else navigate('/panel');
    };

    const handleEntrarAlumno = () => {
        navigate('/alumno');
    };

    // -----------------------------------------------------------------------
    // RUTAS
    // -----------------------------------------------------------------------

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