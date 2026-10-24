/**
 * @file PantallaContactos.jsx
 * @brief Vista de contactos, discriminada por rol:
 *
 *   - profesor → muestra la lista de tutores registrados usando el diseño original.
 *   - tutor    → muestra la lista de profesores original con opción de eliminar.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../panel.css';
import Paginador from '../../components/Paginador';
import { getTutores, getProfesores, eliminarUsuarioPorId } from '../../services/api';

function PantallaContactos() {

    // -----------------------------------------------------------------------
    // SESION Y NAVEGACIÓN
    // -----------------------------------------------------------------------
    const navigate    = useNavigate();
    const rol         = sessionStorage.getItem('rol');

    // -----------------------------------------------------------------------
    // CARGA DE DATOS DESDE EL BACKEND
    // -----------------------------------------------------------------------

    const [cargando, setCargando]   = useState(true);
    const [tutores, setTutores]     = useState([]);
    const [profesores, setProfesores] = useState([]);
    const [pagina, setPagina]             = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    /**
     * Carga una página de contactos (tutores si es profesor, profesores si es
     * tutor). Si esa página ya no existe (por ejemplo, se borró el único
     * profesor de la última página), carga la última que sí existe.
     * @param {number} p Página a cargar (por defecto, la actual).
     */
    const cargar = async (p = pagina) => {
        setCargando(true);
        try {
            const data  = rol === 'profesor' ? await getTutores(p) : await getProfesores(p);
            const total = data.totalPaginas || 1;

            if (p > total) {
                await cargar(total);
                return;
            }

            if (rol === 'profesor') setTutores(data.tutores || []);
            else                    setProfesores(data.profesores || []);

            setPagina(p);
            setTotalPaginas(total);
        } catch (error) {
            alert(error.message || 'Error al cargar los contactos.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(1); }, []);
    // -----------------------------------------------------------------------
    // ELIMINACIÓN DE PROFESORES (solo para tutores)
    // -----------------------------------------------------------------------

    const eliminarProfesor = async (profe) => {
        if (!window.confirm(`¿Eliminar definitivamente al profesor ${profe.nombre} ${profe.apellido}?`)) return;
        
        setCargando(true);
        try {
            // Usamos la función blindada que armamos hace un rato
            await eliminarUsuarioPorId(profe.idUsuario);
            
            alert('Profesor eliminado correctamente.');
            // Se recarga la página actual para que se complete con el siguiente profesor
            await cargar();
        } catch (error) { 
            alert(error.message || 'Error al eliminar profesor.'); 
        } finally { 
            setCargando(false); 
        }
    };

    // -----------------------------------------------------------------------
    // RENDERIZADO DE LA VISTA PARA PROFESORES
    // -----------------------------------------------------------------------
    if (rol === 'profesor') {
        return (
            <div className="panel-menu-container">
                <div className="tutor-container">
                    <h1 className="tutor-titulo-destacado">Tutores Registrados</h1>
                    {cargando ? (
                        <p style={{ color: '#aaa', textAlign: 'center' }}>Cargando...</p>
                    ) : tutores.length === 0 ? (
                        <div className="tutor-card tutor-vacio">
                            <p>No hay tutores registrados en el sistema.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                            {tutores.map((tutor, index) => (
                                <div className="tutor-card" key={tutor.idUsuario}>
                                    <div className="tutor-info-fila">
                                        <span className="tutor-etiqueta">Nombre:</span>
                                        <span className="tutor-valor">{tutor.nombre}</span>
                                    </div>
                                    <div className="tutor-info-fila">
                                        <span className="tutor-etiqueta">Apellido:</span>
                                        <span className="tutor-valor">{tutor.apellido}</span>
                                    </div>
                                    <div className="tutor-info-fila">
                                        <span className="tutor-etiqueta">Vínculo:</span>
                                        <span className="tutor-valor">{tutor.vinculo}</span>
                                    </div>
                                    <div className="tutor-info-fila">
                                        <span className="tutor-etiqueta">Contacto:</span>
                                        <span className="tutor-valor">{tutor.contacto}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <Paginador
                    pagina={pagina}
                    totalPaginas={totalPaginas}
                    onCambiar={cargar}
                    deshabilitado={cargando}
                />
                <button
                    className="btn-volver-bottom" 
                    onClick={() => navigate('/panel')} 
                    disabled={cargando}>
                        Volver
                </button>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // RENDERIZADO DE LA VISTA PARA TUTORES
    // -----------------------------------------------------------------------
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
                                <span className="profesor-materia">{profe.materia || 'Profesor'}</span>
                                <button 
                                    className="btn-borrar-profe" 
                                    disabled={cargando} 
                                    onClick={() => eliminarProfesor(profe)}>
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

            <Paginador
                pagina={pagina}
                totalPaginas={totalPaginas}
                onCambiar={cargar}
                deshabilitado={cargando}
            />

            <button
                className="btn-volver-bottom" 
                onClick={() => navigate('/panel')} 
                disabled={cargando}>
                    Volver
            </button>
        </div>
    );
}

export default PantallaContactos;
