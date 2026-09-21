/**
 * @file PantallaPerfil.jsx
 * @brief Edición de perfil, contraseña y eliminación de cuenta.
 *
 * Compartido por profesor y tutor.
 * El campo "Referencia" se muestra siempre, pero su etiqueta cambia:
 * "Materia" para profesores, "Vínculo" para tutores.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../panel.css';
import { getPerfil, editarPerfil, cambiarMiPassword, eliminarUsuarioPorId } from '../../services/api';

const SVG_ABIERTO = (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const SVG_CERRADO = (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

function PantallaPerfil({ onLogout }) {

    // -----------------------------------------------------------------------
    // SESION Y NAVEGACIÓN
    // -----------------------------------------------------------------------
    const navigate = useNavigate();
    const rol = sessionStorage.getItem('rol');
    const authHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`,
    });

    // -----------------------------------------------------------------------
    // CARGA DE DATOS DE PERFIL Y ESTADO DE LA PANTALLA
    // -----------------------------------------------------------------------
    const [cargando, setCargando] = useState(false);
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [datosPerfil, setDatosPerfil]     = useState({ idUsuario: null, usuario: '', nombre: '', apellido: '', referencia: '', contacto: '' });
    const [datosOriginales, setDatosOriginales] = useState(null);

    // -----------------------------------------------------------------------
    // MANEJO DE CONTRASEÑAS
    // -----------------------------------------------------------------------
    const [passActual, setPassActual]       = useState('');
    const [passNueva, setPassNueva]         = useState('');
    const [passConfirmar, setPassConfirmar] = useState('');
    const [showActual, setShowActual]       = useState(false);
    const [showNueva, setShowNueva]         = useState(false);
    const [showConfirmar, setShowConfirmar] = useState(false);

    // -----------------------------------------------------------------------
    // REFERENCIAS A INPUTS
    // -----------------------------------------------------------------------
    const nombreRef = useRef(null);
    const apellidoRef = useRef(null);
    const referenciaRef = useRef(null);
    const contactoRef = useRef(null);
    const passActualRef = useRef(null);
    const passNuevaRef = useRef(null);
    const passConfirmarRef = useRef(null);

    // -----------------------------------------------------------------------
    // CARGA DE DATOS DE PERFIL AL INICIAR
    // -----------------------------------------------------------------------
    useEffect(() => {
        const cargar = async () => {
            setCargando(true);
            try {
                const data = await getPerfil();
                const cargado = { 
                    idUsuario: data.idUsuario, 
                    usuario: data.usuario, 
                    nombre: data.nombre, 
                    apellido: data.apellido, 
                    referencia: data.referencia || '', 
                    contacto: data.contacto || '' 
                };
                setDatosPerfil(cargado);
                setDatosOriginales(cargado);
                setNombreUsuario(`${data.nombre} ${data.apellido}`);
            } catch (error) { 
                alert(error.message || 'Error al cargar perfil.'); 
            } finally { 
                setCargando(false); 
            }
        };
        cargar();
    }, []);

    // -----------------------------------------------------------------------
    // FUNCIONES PRINCIPALES
    // -----------------------------------------------------------------------
    const guardarPerfil = async () => {
        setCargando(true);
        try {
            await editarPerfil(datosPerfil);
            alert('¡Perfil actualizado con éxito!');
            setNombreUsuario(`${datosPerfil.nombre} ${datosPerfil.apellido}`);
            setDatosOriginales(datosPerfil);
        } catch (error) { 
            alert(error.message || 'Error al actualizar.'); 
        } finally { 
            setCargando(false); 
        }
    };
    const cambiarContrasenaLocal = async () => { 
        if (!passActual || !passNueva || !passConfirmar) return alert('Completá todas las contraseñas.');
        if (passNueva !== passConfirmar) return alert('Las contraseñas nuevas no coinciden.');
        setCargando(true);
        try {
            await cambiarMiPassword({ 
                passwordActual: passActual, 
                passwordNueva: passNueva, 
                confirmar: passConfirmar 
            });
            alert('¡Contraseña actualizada!'); 
            setPassActual(''); setPassNueva(''); setPassConfirmar('');
        } catch (error) { 
            alert(error.message || 'Error al cambiar contraseña.'); 
        } finally { 
            setCargando(false); 
        }
    };
    const eliminarCuenta = async () => {
        if (window.confirm(`¿Estás seguro de que querés eliminar DEFINITIVAMENTE tu cuenta de usuario "${datosPerfil.usuario}"?\nEsta acción no se puede deshacer.`)) {
            setCargando(true);
            try {
                await eliminarUsuarioPorId(datosPerfil.idUsuario);
                alert("Tu cuenta fue eliminada correctamente.");
                onLogout(); 
            } catch (error) {
                alert(error.message || "Error al intentar eliminar la cuenta.");
            } finally {
                setCargando(false);
            }
        }
    };

    const salir = () => {
        const modificado = JSON.stringify(datosPerfil) !== JSON.stringify(datosOriginales);
        const passModif  = passActual || passNueva || passConfirmar;
        if (modificado || passModif) {
            if (window.confirm('¿Salir sin guardar los cambios?')) navigate('/panel');
        } else {
            navigate('/panel');
        }
    };

    // -----------------------------------------------------------------------
    // RENDERIZADO DE PANTALLA DE PERFIL
    // -----------------------------------------------------------------------

    return (
        <div className="panel-menu-container">
            <div className="panel-header">
                <h2>Hola, {nombreUsuario}</h2>
                <button className="btn-rojo-logout" onClick={() => { if (window.confirm('¿Cerrar sesión?')) onLogout(); }} disabled={cargando}>
                    Cerrar sesión
                </button>
            </div>

            <div className="perfil-form-container">
                {/* ── Datos del perfil ── */}
                <h1 className="perfil-titulo-destacado">Editar Perfil</h1>

                <div className="perfil-fila">
                    <label>Usuario:</label>
                    <input 
                        type="text" className="perfil-input" value={datosPerfil.usuario} 
                        onChange={e => setDatosPerfil({ ...datosPerfil, usuario: e.target.value })} 
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); nombreRef.current?.focus(); } }}
                    />
                </div>
                <div className="perfil-fila">
                    <label>Nombre:</label>
                    <input 
                        type="text" className="perfil-input" value={datosPerfil.nombre} 
                        onChange={e => setDatosPerfil({ ...datosPerfil, nombre: e.target.value })} 
                        ref={nombreRef}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apellidoRef.current?.focus(); } }}
                    />
                </div>
                <div className="perfil-fila">
                    <label>Apellido:</label>
                    <input 
                        type="text" className="perfil-input" value={datosPerfil.apellido} 
                        onChange={e => setDatosPerfil({ ...datosPerfil, apellido: e.target.value })} 
                        ref={apellidoRef}
                        onKeyDown={(e) => { 
                            if (e.key === 'Enter') { 
                                e.preventDefault(); 
                                referenciaRef.current?.focus(); 
                            } 
                        }}
                    />
                </div>
                <div className="perfil-fila">
                    <label>{rol === 'tutor' ? 'Vínculo:' : 'Materia:'}</label>
                    <input 
                        type="text" className="perfil-input" value={datosPerfil.referencia} 
                        onChange={e => setDatosPerfil({ ...datosPerfil, referencia: e.target.value })} 
                        ref={referenciaRef}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); contactoRef.current?.focus(); } }}
                    />
                </div>
                <div className="perfil-fila">
                    <label>Contacto:</label>
                    <input 
                        type="text" className="perfil-input" value={datosPerfil.contacto} 
                        onChange={e => setDatosPerfil({ ...datosPerfil, contacto: e.target.value })} 
                        ref={contactoRef}
                        onKeyDown={(e) => { 
                            if (e.key === 'Enter') { 
                                e.preventDefault(); 
                                guardarPerfil(); 
                                passActualRef.current?.focus();
                            } 
                        }}
                    />
                </div>

                <div className="perfil-botones">
                    <button 
                        className="btn-perfil-outline btn-perfil-verde" 
                        disabled={cargando} 
                        onClick={guardarPerfil}>
                            {cargando ? 'Procesando...' : 'Guardar datos'}
                    </button>
                </div>

                <hr style={{ margin: '30px 0', borderColor: '#444' }} />

                {/* ── Cambiar contraseña ── */}
                <h2 className="perfil-titulo-destacado" style={{ color: '#f39c12', fontSize: '1.5em' }}> Cambiar Contraseña </h2>

                {[
                    { val: passActual,    set: setPassActual,    show: showActual,    setShow: setShowActual,    ph: 'Contraseña actual', ref: passActualRef, nextRef: passNuevaRef },
                    { val: passNueva,     set: setPassNueva,     show: showNueva,     setShow: setShowNueva,     ph: 'Nueva contraseña', ref: passNuevaRef, nextRef: passConfirmarRef },
                    { val: passConfirmar, set: setPassConfirmar, show: showConfirmar, setShow: setShowConfirmar, ph: 'Repetir nueva contraseña', ref: passConfirmarRef, nextRef: null },
                ].map(({ val, set, show, setShow, ph, ref, nextRef }, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: '15px' }}>
                        <input
                            type={show ? 'text' : 'password'}
                            className="perfil-input"
                            placeholder={ph}
                            value={val}
                            onChange={e => set(e.target.value)}
                            ref={ref}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (nextRef) {
                                        nextRef.current?.focus();
                                    } else {
                                        cambiarContrasenaLocal(); 
                                    }
                                }
                            }}
                            style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                        />
                        <button 
                            onClick={() => setShow(!show)} 
                            disabled={cargando} 
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                            {show ? SVG_CERRADO : SVG_ABIERTO}
                        </button>
                    </div>
                ))}

                <div className="perfil-botones">
                    <button 
                        className="btn-perfil-outline" 
                        style={{ width: '100%', backgroundColor: '#f39c12', 
                        color: '#fff', borderColor: '#f39c12' }} 
                        disabled={cargando} 
                        onClick={cambiarContrasenaLocal}>
                            {cargando ? 'Procesando...' : 'Actualizar contraseña'}
                    </button>
                </div>

                <hr style={{ margin: '30px 0', borderColor: '#444' }} />

                {/* ── Eliminar cuenta ── */}
                <div className="perfil-botones">
                    <button 
                        style={{ width: '100%', backgroundColor: '#e74c3c', 
                        color: '#fff', padding: '15px', borderRadius: '8px', 
                        fontWeight: 'bold', border: 'none', cursor: 'pointer', 
                        opacity: cargando ? 0.7 : 1 }} 
                        disabled={cargando} 
                        onClick={eliminarCuenta}>
                            {cargando ? 'Procesando...' : 'Eliminar cuenta'}
                    </button>
                </div>
            </div>

            <button 
                className="btn-volver-bottom" 
                disabled={cargando} 
                onClick={salir}>
                    Volver
            </button>
        </div>
    );
}

export default PantallaPerfil;
