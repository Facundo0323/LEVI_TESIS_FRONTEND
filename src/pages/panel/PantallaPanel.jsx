/**
 * @file PantallaPanel.jsx
 * @brief Menú principal unificado para profesor y tutor.
 *
 * Discrimina por `rol` (obtenido de sessionStorage) qué opciones mostrar:
 *   - profesor: Cuestionarios / Ver datos tutor / Editar perfil
 *   - tutor:    Cuestionarios / Ver profesores  / Editar perfil
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../panel.css';

function PantallaPanel({ onLogout }) {
    const navigate = useNavigate();
    const rol = sessionStorage.getItem('rol');
    const [nombreUsuario, setNombreUsuario] = useState(rol === 'tutor' ? 'Tutor' : 'Profesor');
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        const cargarNombre = async () => {
            try {
                const res = await fetch('/api/auth/perfil', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`,
                    },
                });
                const data = await res.json();
                if (res.ok) setNombreUsuario(`${data.nombre} ${data.apellido}`);
            } catch (_) {
                
            }
        };
        cargarNombre();
    }, []);

    const handleLogout = () => {
        if (window.confirm('¿Cerrar sesión?')) onLogout();
    };

    const botonCentral = rol === 'tutor'
        ? { texto: 'Ver profesores',   clase: 'color-contactos', ruta: '/panel/contactos' }
        : { texto: 'Ver datos tutor',  clase: 'color-tutor',     ruta: '/panel/contactos' };

    return (
        <div className="panel-menu-container">
            <div className="panel-header">
                <h2>Hola, {nombreUsuario}</h2>
                <button className="btn-rojo-logout" onClick={handleLogout} disabled={cargando}>
                    Cerrar sesión
                </button>
            </div>

            <div className="panel-botones-centrales">
                <button
                    className="btn-menu-largo color-cuestionarios"
                    onClick={() => navigate('/panel/cuestionarios')}
                    disabled={cargando}
                >
                    Ver cuestionarios
                </button>

                <button
                    className={`btn-menu-largo ${botonCentral.clase}`}
                    onClick={() => navigate(botonCentral.ruta)}
                    disabled={cargando}
                >
                    {botonCentral.texto}
                </button>

                <button
                    className="btn-menu-largo color-perfil"
                    onClick={() => navigate('/panel/perfil')}
                    disabled={cargando}
                >
                    Editar perfil
                </button>
            </div>
        </div>
    );
}

export default PantallaPanel;
