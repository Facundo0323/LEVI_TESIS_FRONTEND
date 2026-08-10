/**
 * @file PantallaPerfil.jsx
 * @brief Edición de perfil, contraseña y eliminación de cuenta.
 *
 * Compartido por profesor y tutor.
 * El campo "Materia" solo se muestra para rol === 'profesor'.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../panel.css';

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
    const navigate = useNavigate();
    const rol = sessionStorage.getItem('rol');
    const authHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`,
    });

    const [cargando, setCargando] = useState(false);
    const [nombreUsuario, setNombreUsuario] = useState('');

    // Datos perfil
    const [datosPerfil, setDatosPerfil]     = useState({ idUsuario: null, usuario: '', nombre: '', apellido: '', materia: '', contacto: '' });
    const [datosOriginales, setDatosOriginales] = useState(null);

    // Contraseña
    const [passActual, setPassActual]       = useState('');
    const [passNueva, setPassNueva]         = useState('');
    const [passConfirmar, setPassConfirmar] = useState('');
    const [showActual, setShowActual]       = useState(false);
    const [showNueva, setShowNueva]         = useState(false);
    const [showConfirmar, setShowConfirmar] = useState(false);

    // Eliminar cuenta
    const [claveBorrar, setClaveBorrar]     = useState('');
    const [showClaveBorrar, setShowClaveBorrar] = useState(false);

     // Referencias: Datos Generales
    const usuarioRef = useRef(null);
    const nombreRef = useRef(null);
    const apellidoRef = useRef(null);
    const materiaRef = useRef(null);
    const contactoRef = useRef(null);

    // Referencias: Cambiar Contraseña
    const passActualRef = useRef(null);
    const passNuevaRef = useRef(null);
    const passConfirmarRef = useRef(null);

    useEffect(() => {
        const cargar = async () => {
            setCargando(true);
            try {
                const res  = await fetch('/api/auth/perfil', { headers: authHeaders() });
                const data = await res.json();
                if (res.ok) {
                    const cargado = { idUsuario: data.idUsuario, usuario: data.usuario, nombre: data.nombre, apellido: data.apellido, materia: data.materia || '', contacto: data.contacto || '' };
                    setDatosPerfil(cargado);
                    setDatosOriginales(cargado);
                    setNombreUsuario(`${data.nombre} ${data.apellido}`);
                } else alert(data.mensaje || 'Error al cargar perfil.');
            } catch (_) { alert('Error de conexión.'); }
            finally { setCargando(false); }
        };
        cargar();
    }, []);

    const guardarPerfil = async () => {
        setCargando(true);
        try {
            const res  = await fetch('/api/usuarios/perfil', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(datosPerfil) });
            const data = await res.json();
            if (res.ok) {
                alert('¡Perfil actualizado con éxito!');
                setNombreUsuario(`${datosPerfil.nombre} ${datosPerfil.apellido}`);
                setDatosOriginales(datosPerfil);
            } else alert(data.mensaje || 'Error al actualizar.');
        } catch (_) { alert('Error de conexión.'); }
        finally { setCargando(false); }
    };

    const cambiarContrasena = async () => {
        if (!passActual || !passNueva || !passConfirmar) return alert('Completá todas las contraseñas.');
        if (passNueva !== passConfirmar) return alert('Las contraseñas nuevas no coinciden.');
        setCargando(true);
        try {
            const res  = await fetch('/api/usuarios/perfil/password', { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ passwordActual: passActual, passwordNueva: passNueva, confirmar: passConfirmar }) });
            const data = await res.json();
            if (res.ok) { alert('¡Contraseña actualizada!'); setPassActual(''); setPassNueva(''); setPassConfirmar(''); }
            else alert(data.mensaje || 'Error al cambiar contraseña.');
        } catch (_) { alert('Error de conexión.'); }
        finally { setCargando(false); }
    };

    const eliminarCuenta = async () => {

        if (window.confirm(`¿Estás seguro de que querés eliminar DEFINITIVAMENTE tu cuenta de usuario "${datosPerfil.usuario}"?\nEsta acción no se puede deshacer.`)) {
            setCargando(true);
            try {
                const url = `/api/usuario?id=${datosPerfil.idUsuario}`;
                
                const respuesta = await fetch(url, {
                    method: 'DELETE',
                    headers: authHeaders() 
                });

                const textoResp = await respuesta.text();
                let datos = {};
                try {
                    datos = JSON.parse(textoResp);
                } catch (e) {
                    datos = { mensaje: textoResp };
                }

                if (respuesta.ok) {
                    alert(datos.mensaje || "Tu cuenta fue eliminada correctamente.");
                    onLogout(); 
                } else {
                    alert(datos.mensaje || "Error al intentar eliminar la cuenta.");
                }
            } catch (error) {
                console.error("Error de red:", error);
                alert("Error de conexión con el servidor.");
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

    return (
        <div className="panel-menu-container">
            <div className="panel-header">
                <h2>Hola, {nombreUsuario}</h2>
                <button className="btn-rojo-logout" onClick={() => { if (window.confirm('¿Cerrar sesión?')) onLogout(); }} disabled={cargando}>
                    Cerrar sesión
                </button>
            </div>

            <div className="perfil-form-container">
                {/* ── Datos generales ── */}
                <h1 className="perfil-titulo-destacado">Editar Perfil</h1>

                <div className="perfil-fila">
                    <label>Usuario:</label>
                    <input 
                        type="text" className="perfil-input" value={datosPerfil.usuario} 
                        onChange={e => setDatosPerfil({ ...datosPerfil, usuario: e.target.value })} 
                        ref={usuarioRef}
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
                                if (rol === 'profesor') materiaRef.current?.focus(); 
                                else contactoRef.current?.focus(); 
                            } 
                        }}
                    />
                </div>
                {rol === 'profesor' && (
                    <div className="perfil-fila">
                        <label>Materia:</label>
                        <input 
                            type="text" className="perfil-input" value={datosPerfil.materia} 
                            onChange={e => setDatosPerfil({ ...datosPerfil, materia: e.target.value })} 
                            ref={materiaRef}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); contactoRef.current?.focus(); } }}
                        />
                    </div>
                )}
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
                    <button className="btn-perfil-outline btn-perfil-verde" disabled={cargando} onClick={guardarPerfil}>
                        {cargando ? 'Guardando...' : 'Guardar datos'}
                    </button>
                </div>

                <hr style={{ margin: '30px 0', borderColor: '#444' }} />

                {/* ── Cambiar contraseña ── */}
                <h2 className="perfil-titulo-destacado" style={{ color: '#f39c12', fontSize: '1.5em' }}>Cambiar Contraseña</h2>

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
                                        cambiarContrasena(); 
                                    }
                                }
                            }}
                            style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                        />
                        <button onClick={() => setShow(!show)} disabled={cargando} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                            {show ? SVG_CERRADO : SVG_ABIERTO}
                        </button>
                    </div>
                ))}

                <div className="perfil-botones">
                    <button className="btn-perfil-outline" style={{ width: '100%', backgroundColor: '#f39c12', color: '#fff', borderColor: '#f39c12' }} disabled={cargando} onClick={cambiarContrasena}>
                        {cargando ? 'Procesando...' : 'Actualizar contraseña'}
                    </button>
                </div>

                <hr style={{ margin: '30px 0', borderColor: '#444' }} />

                {/* ── Eliminar cuenta ── */}
                <div className="perfil-botones">
                    <button style={{ width: '100%', backgroundColor: '#e74c3c', color: '#fff', padding: '15px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: cargando ? 0.7 : 1 }} disabled={cargando} onClick={eliminarCuenta}>
                        {cargando ? 'ELIMINANDO...' : 'Eliminar cuenta'}
                    </button>
                </div>
            </div>

            <button className="btn-volver-bottom" disabled={cargando} onClick={salir}>
                Volver
            </button>
        </div>
    );
}

export default PantallaPerfil;
