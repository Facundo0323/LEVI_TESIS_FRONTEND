/**
 * @file PantallaContactos.jsx
 * @brief Vista de contactos, discriminada por rol:
 *
 *   - profesor → muestra los datos del tutor (nombre, apellido, contacto).
 *   - tutor    → muestra la lista de profesores con opción de eliminar.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../panel.css';

function PantallaContactos() {
    const navigate    = useNavigate();
    const rol         = sessionStorage.getItem('rol');
    const authHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`,
    });

    const [cargando, setCargando]   = useState(true);
    const [tutores, setTutores]     = useState([]);
    const [profesores, setProfesores] = useState([]);

    useEffect(() => {
        const cargar = async () => {
            setCargando(true);
            try {
                if (rol === 'profesor') {
                    const res  = await fetch('/api/usuarios/tutores', { headers: authHeaders() });
                    const data = await res.json();
                    if (res.ok) setTutores(data.tutores || []);
                    else alert(data.mensaje || 'Error al cargar datos del tutor.');
                } else {
                    const res  = await fetch('/api/usuarios/profesores', { headers: authHeaders() });
                    const data = await res.json();
                    if (res.ok) setProfesores(data.profesores || []);
                    else alert(data.mensaje || 'Error al cargar profesores.');
                }
            } catch (_) { alert('Error de conexión.'); }
            finally { setCargando(false); }
        };
        cargar();
    }, []);

    const eliminarProfesor = async (profe) => {
        if (!window.confirm(`¿Eliminar definitivamente al profesor ${profe.nombre} ${profe.apellido}?`)) return;
        
        setCargando(true);
        try {
            const res = await fetch(`/api/usuario?id=${profe.idUsuario}`, {
                method: 'DELETE',
                headers: authHeaders()
            });

            if (res.ok) {
                alert('Profesor eliminado correctamente.');
                setProfesores(prev => prev.filter(p => p.idUsuario !== profe.idUsuario));
            } else {
                const d = await res.json();
                alert(d.mensaje || 'Error al eliminar.');
            }
        } catch (_) { 
            alert('Error de conexión.'); 
        } finally { 
            setCargando(false); 
        }
    };

    // ── Vista: profesor → datos del tutor ──────────────────────────────────
    if (rol === 'profesor') {
        const tutor = tutores[0] || null;
        return (
            <div className="panel-menu-container">
                <div className="tutor-container">
                    <h1 className="tutor-titulo-destacado">Datos del Tutor</h1>
                    {cargando ? (
                        <p style={{ color: '#aaa', textAlign: 'center' }}>Cargando...</p>
                    ) : tutor ? (
                        <div className="tutor-card">
                            <div className="tutor-info-fila">
                                <span className="tutor-etiqueta">Nombre:</span>
                                <span className="tutor-valor">{tutor.nombre}</span>
                            </div>
                            <div className="tutor-info-fila">
                                <span className="tutor-etiqueta">Apellido:</span>
                                <span className="tutor-valor">{tutor.apellido}</span>
                            </div>
                            <div className="tutor-info-fila">
                                <span className="tutor-etiqueta">Contacto:</span>
                                <span className="tutor-valor">{tutor.contacto}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="tutor-card tutor-vacio">
                            <p>No se encontró ningún usuario con rol de Tutor registrado.</p>
                        </div>
                    )}
                </div>
                <button className="btn-volver-bottom" onClick={() => navigate('/panel')} disabled={cargando}>
                    Volver
                </button>
            </div>
        );
    }

    // ── Vista: tutor → lista de profesores ────────────────────────────────
    return (
        <div className="panel-menu-container">
            <div className="profesores-sub-header">
                <h3 className="profesores-titulo">Profesores</h3>
            </div>

            <div className="lista-profesores">
                {cargando ? (
                    <p style={{ color: '#aaa', textAlign: 'center' }}>Cargando...</p>
                ) : profesores.length === 0 ? (
                    <p style={{ color: '#fff', textAlign: 'center' }}>No hay profesores registrados.</p>
                ) : (
                    profesores.map(profe => (
                        <div className="card-profesor" key={profe.idUsuario}>
                            <div className="profesor-fila-sup">
                                <span className="profesor-materia">{profe.materia}</span>
                                <button className="btn-borrar-profe" disabled={cargando} onClick={() => eliminarProfesor(profe)}>
                                    🗑
                                </button>
                            </div>
                            <div className="profesor-fila-inf">
                                <span className="profesor-nombre">{profe.nombre} {profe.apellido}</span>
                                <span className="profesor-contacto">{profe.contacto}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button className="btn-volver-bottom" onClick={() => navigate('/panel')} disabled={cargando}>
                Volver
            </button>
        </div>
    );
}

export default PantallaContactos;
