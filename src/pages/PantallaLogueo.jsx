import { useState, useEffect, useRef } from 'react';
import './PantallaLogueo.css'; 

function PantallaLogueo({ onLoginSuccess, onGoBack }) {
    const [vistaActual, setVistaActual] = useState('login');
    const BACKEND_URL = ""; 
    const [showLoginPass, setShowLoginPass] = useState(false);
    const [showRegClave, setShowRegClave] = useState(false);
    const [showRegPass, setShowRegPass] = useState(false);
    const [showRegPass2, setShowRegPass2] = useState(false);
    const [showRecClave, setShowRecClave] = useState(false);
    const [showRecPass1, setShowRecPass1] = useState(false);
    const [showRecPass2, setShowRecPass2] = useState(false);
    const [showDelClave, setShowDelClave] = useState(false);
    const [showDelPass, setShowDelPass] = useState(false);

    const SVG_ABIERTO = (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
    );
    const SVG_CERRADO = (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
    );

    // MEMORIA DE LOS INPUTS
    const [regClave, setRegClave] = useState('');
    const [regUser, setRegUser] = useState('');
    const [regPass1, setRegPass1] = useState('');
    const [regPass2, setRegPass2] = useState('');
    const [recUser, setRecUser] = useState('');
    const [recClave, setRecClave] = useState('');
    const [recPass1, setRecPass1] = useState('');
    const [recPass2, setRecPass2] = useState('');
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [regRol, setRegRol] = useState('profesor'); 
    const [regNombre, setRegNombre] = useState('');
    const [regApellido, setRegApellido] = useState('');
    const [regMateria, setRegMateria] = useState('');
    const [regContacto, setRegContacto] = useState('');


    // --- REFERENCIAS DE TECLADO ---
    const passwordInputRef = useRef(null);
    const regUserRef = useRef(null);
    const regPass1Ref = useRef(null);
    const regPass2Ref = useRef(null);
    const regNombreRef = useRef(null);
    const regApellidoRef = useRef(null);
    const regRolRef = useRef(null);
    const regMateriaRef = useRef(null);
    const regContactoRef = useRef(null);
    const recClaveRef = useRef(null);
    const recPass1Ref = useRef(null);
    const recPass2Ref = useRef(null);

    // ─────────────────────────────────────────────────────────
    // 1. FUNCIÓN DE LOGIN CON BACKEND
    // ─────────────────────────────────────────────────────────
    const iniciarSesion = async () => {
        if (!loginUser || !loginPass) {
            alert("Por favor, ingresá tu usuario y contraseña.");
            return;
        }

        try {
            const respuesta = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    usuario: loginUser.trim().toLowerCase(), 
                    password: loginPass 
                })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                const rolDelUsuario = datos.rol || 'profesor';
                const nombreReal = datos.nombre || loginUser;
                const token = datos.token;
                
                sessionStorage.setItem('token', token);
                sessionStorage.setItem('rol', rolDelUsuario);
                sessionStorage.setItem('nombreSesionActiva', nombreReal);
                
                alert(`¡Se inició sesión correctamente como ${rolDelUsuario}!`);
                
                onLoginSuccess(rolDelUsuario);
                setLoginUser('');
                setLoginPass('');
            } else {
                alert(datos.mensaje || "Usuario o contraseña incorrectos");
                setLoginPass('');
            }
        } catch (error) {
            console.error("Error al conectar con el backend:", error);
            alert("Error de conexión con el servidor.");
        }
    };

  // ─────────────────────────────────────────────────────────
    // 2. FUNCIÓN DE REGISTRO CON BACKEND
    // ─────────────────────────────────────────────────────────
    const registrarUsuario = async () => {
    if (!regClave || !regUser || !regPass1 || !regPass2 || !regNombre || !regApellido || !regContacto) {
        alert("Por favor, completá todos los campos.");
        return;
    }

    if (regRol === 'profesor' && !regMateria) {
        alert("Por favor, ingresá la materia.");
        return;
    }

    if (regPass1 !== regPass2) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    try {
        const respuesta = await fetch(`${BACKEND_URL}/api/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario: regUser.trim().toLowerCase(),
                nombre: regNombre.trim(),
                apellido: regApellido.trim(),
                rol: regRol,
                materia: regRol === 'profesor' ? regMateria.trim() : '',
                contacto: regContacto.trim(),
                password: regPass1,
                confirmar: regPass2,
                claveMaestra: regClave.trim() 
            })
        });

        const textoResp = await respuesta.text();
        let datos = {};
        try {
            datos = JSON.parse(textoResp);
        } catch (e) {
            datos = { mensaje: textoResp };
        }

        if (respuesta.ok) {
            alert(datos.mensaje || `¡Usuario creado con éxito como ${regRol}!`);
            cancelarRegistro();
        } else {
            alert(datos.mensaje || "Error al crear el usuario.");
        }
    } catch (error) {
        console.error("Error real en el fetch:", error);
        alert("Error de conexión real con el servidor.");
    }
};

    // ─────────────────────────────────────────────────────────
    // 3. FUNCIÓN PARA RECUPERAR CONTRASEÑA CON BACKEND
    // ─────────────────────────────────────────────────────────
    const recuperarClave = async () => {
        if (!recUser || !recClave || !recPass1 || !recPass2) {
            alert("Por favor, completá todos los campos.");
            return;
        }

        try {
            const respuesta = await fetch(`${BACKEND_URL}/api/usuarios/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario: recUser.trim().toLowerCase(),
                    claveMaestra: recClave.trim().toLowerCase(),
                    passwordNueva: recPass1,
                    confirmar: recPass2
                })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                alert(datos.mensaje || "¡Contraseña restablecida con éxito!");
                cancelarRecuperacion();
            } else {
                alert(datos.mensaje || "Error al recuperar la contraseña.");
            }
        } catch (error) {
            console.error("Error de red:", error);
            alert("Error de conexión con el servidor.");
        }
    };

    // ─────────────────────────────────────────────────────────
    // 4. FUNCIONES DE LIMPIEZA Y NAVEGACIÓN
    // ─────────────────────────────────────────────────────────
    const volverAtras = () => {
        onGoBack();
    }

    const cancelarRegistro = () => {
        setRegClave('');
        setRegUser('');
        setRegPass1('');
        setRegPass2('');
        setRegRol('profesor');
        setRegNombre('');
        setRegApellido('');
        setRegMateria('');
        setRegContacto('');
        setVistaActual('login');
    };

    const cancelarBorrado = () => {
        setDelClave('');
        setDelUser('');
        setDelPass('');
        setVistaActual('login');
    };

    const cancelarRecuperacion = () => {
        setRecUser('');
        setRecClave('');
        setRecPass1('');
        setRecPass2('');
        setVistaActual('login');
    };

    return (
        <div className="auth-page-container">

            {/* --- 1. ESTADO: LOGIN --- */}
            {vistaActual === 'login' && (
                <div className="auth-form-container">
                    <h2 style={{ marginBottom: '10px' }}>Iniciar Sesión</h2>
                    
                    <input 
                        type="text" 
                        className="auth-input" 
                        placeholder="Usuario" 
                        value={loginUser}
                        onChange={(e) => setLoginUser(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                passwordInputRef.current?.focus();
                            }
                        }}
                    />
                    
                    <div className="password-wrapper">
                        <input 
                            type={showLoginPass ? "text" : "password"} 
                            className="auth-input" 
                            placeholder="Contraseña" 
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)}
                            ref={passwordInputRef}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    iniciarSesion();
                                }
                            }}
                        />
                        <button className="btn-ojo" onClick={() => setShowLoginPass(!showLoginPass)}>
                            {showLoginPass ? SVG_CERRADO : SVG_ABIERTO}
                        </button>
                    </div>
                    
                    {/* BOTÓN DE INICIO DE SESIÓN */}
                    <button className="btn-verde btn-full" style={{ padding: '15px' }} onClick={iniciarSesion}>
                        INGRESAR
                    </button>
                    
                    <hr />

                    {/* BOTÓN DE REGISTRO */}
                    <button className="btn-amarillo btn-full" style={{ marginTop: '10px', padding: '15px' }} onClick={() => setVistaActual('registro')}>
                        Registrar usuario nuevo
                    </button>
                    
                    {/* BOTÓN DE INVITADO */}
                    <button className="btn-azul btn-full" onClick={() => onLoginSuccess('invitado')} style={{ padding: '15px', marginTop: '10px' }}>
                        Entrar como Invitado
                    </button>

                    {/* BOTÓN DE RECUPERACIÓN */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button className="btn-gris btn-full" style={{ flexGrow: 1, padding: '15px' }} onClick={() => setVistaActual('recuperar')}>
                            Recuperar Clave
                        </button>
                        <button className="btn-gris btn-full" style={{ flexGrow: 1, padding: '15px' }} onClick={volverAtras}>
                            Volver
                        </button>
                    </div>
                </div>
            )}

            {/* --- ESTADO: REGISTRO --- */}
            {vistaActual === 'registro' && (
                <div className="auth-form-container">
                    <h2 style={{ color: '#2ecc71', marginBottom: '10px' }}>Crear Cuenta</h2>
                    <p style={{ textAlign: 'center', marginTop: '-5px', marginBottom: '5px', fontSize: '0.95em' }}>Requiere palabra clave de administrador.</p>
                    
                    <div className="password-wrapper">
                        <input 
                            type={showRegClave ? "text" : "password"} 
                            className="auth-input" 
                            placeholder="Palabra Clave" 
                            value={regClave} 
                            onChange={(e) => setRegClave(e.target.value)} 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); regUserRef.current?.focus(); }
                            }}
                        />
                        <button className="btn-ojo" onClick={() => setShowRegClave(!showRegClave)}>
                            {showRegClave ? SVG_CERRADO : SVG_ABIERTO}
                        </button>
                    </div>
                    
                    <hr />

                    <input 
                        type="text" 
                        className="auth-input" 
                        placeholder="Nombre de usuario nuevo"
                        value={regUser} 
                        onChange={(e) => setRegUser(e.target.value)} 
                        ref={regUserRef}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); regPass1Ref.current?.focus(); }
                        }}
                    />

                    <div className="password-wrapper">
                        <input 
                            type={showRegPass ? "text" : "password"} 
                            className="auth-input" 
                            placeholder="Contraseña" 
                            value={regPass1} 
                            onChange={(e) => setRegPass1(e.target.value)} 
                            ref={regPass1Ref}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); regPass2Ref.current?.focus(); }
                            }}
                        />
                        <button className="btn-ojo" onClick={() => setShowRegPass(!showRegPass)}>
                            {showRegPass ? SVG_CERRADO : SVG_ABIERTO}
                        </button>
                    </div>
                    
                    <div className="password-wrapper">
                        <input 
                            type={showRegPass2 ? "text" : "password"} 
                            className="auth-input" 
                            placeholder="Repetir contraseña" 
                            value={regPass2} 
                            onChange={(e) => setRegPass2(e.target.value)} 
                            ref={regPass2Ref}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); regNombreRef.current?.focus(); }
                            }}
                        />
                        <button className="btn-ojo" onClick={() => setShowRegPass2(!showRegPass2)}>
                            {showRegPass2 ? SVG_CERRADO : SVG_ABIERTO}
                        </button>
                    </div>

                    <input 
                        type="text" 
                        className="auth-input" 
                        placeholder="Nombre" 
                        value={regNombre} 
                        onChange={(e) => setRegNombre(e.target.value)} 
                        ref={regNombreRef}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); regApellidoRef.current?.focus(); }
                        }}
                    />
                    
                    <input 
                        type="text" 
                        className="auth-input" 
                        placeholder="Apellido" 
                        value={regApellido} 
                        onChange={(e) => setRegApellido(e.target.value)} 
                        ref={regApellidoRef}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); regRolRef.current?.focus(); }
                        }}
                    />
                    
                    <select 
                        className="auth-select" 
                        value={regRol} 
                        onChange={(e) => setRegRol(e.target.value)}
                        ref={regRolRef}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { 
                                e.preventDefault(); 
                                if (regRol === 'tutor') {
                                    regContactoRef.current?.focus();
                                } else {
                                    regMateriaRef.current?.focus();
                                }
                            }
                        }}
                        style={{ marginBottom: '15px' }}
                    >
                        <option value="profesor">Profesor</option>
                        <option value="tutor">Tutor</option>
                    </select>

                    <input 
                        type="text" 
                        className="auth-input" 
                        placeholder="Materia" 
                        value={regMateria} 
                        onChange={(e) => setRegMateria(e.target.value)}
                        ref={regMateriaRef}
                        disabled={regRol === 'tutor'}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); regContactoRef.current?.focus(); }
                        }}
                        style={{
                            opacity: regRol === 'tutor' ? 0.5 : 1,
                            cursor: regRol === 'tutor' ? 'not-allowed' : 'text'
                        }}
                    />

                    <input 
                        type="text" 
                        className="auth-input" 
                        placeholder="Contacto (Celular o e-mail)"
                        value={regContacto} 
                        onChange={(e) => setRegContacto(e.target.value)} 
                        ref={regContactoRef}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { 
                                e.preventDefault(); 
                                registrarUsuario(); 
                            }
                        }}
                    />
                    
                    <button className="btn-verde btn-full" style={{ padding: '15px', marginTop: '15px' }} onClick={registrarUsuario}>
                        CREAR CUENTA
                    </button>
                    <button className="btn-gris btn-full" onClick={cancelarRegistro} style={{ marginTop: '10px', padding: '15px' }}>
                        Cancelar
                    </button>
                </div>
            )}

            {/* --- 3. ESTADO: RECUPERAR --- */}
            {vistaActual === 'recuperar' && (
                <div className="auth-form-container">
                    <h2 style={{ color: '#f39c12', marginBottom: '10px' }}>Recuperar Contraseña</h2>
                    <p style={{ textAlign: 'center', marginBottom: '15px', fontSize: '0.95em' }}>
                        Ingresa la palabra clave de administrador para cambiar la contraseña de cualquier usuario.
                    </p>
                    
                    <input 
                        type="text" 
                        className="auth-input" 
                        placeholder="Usuario a recuperar" 
                        value={recUser}
                        onChange={(e) => setRecUser(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); recClaveRef.current?.focus(); }
                        }}
                    />
                    
                    <div className="password-wrapper">
                        <input 
                            type={showRecClave ? "text" : "password"} 
                            className="auth-input" 
                            placeholder="Palabra Clave" 
                            value={recClave}
                            onChange={(e) => setRecClave(e.target.value)}
                            ref={recClaveRef}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); recPass1Ref.current?.focus(); }
                            }}
                        />
                        <button className="btn-ojo" onClick={() => setShowRecClave(!showRecClave)}>
                            {showRecClave ? SVG_CERRADO : SVG_ABIERTO}
                        </button>
                    </div>
                    
                    <hr style={{ marginTop: '15px' }} />
                    
                    <div className="password-wrapper">
                        <input 
                            type={showRecPass1 ? "text" : "password"} 
                            className="auth-input" 
                            placeholder="Nueva contraseña" 
                            value={recPass1}
                            onChange={(e) => setRecPass1(e.target.value)}
                            ref={recPass1Ref}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); recPass2Ref.current?.focus(); }
                            }}
                        />
                        <button className="btn-ojo" onClick={() => setShowRecPass1(!showRecPass1)}>
                            {showRecPass1 ? SVG_CERRADO : SVG_ABIERTO}
                        </button>
                    </div>
                    
                    <div className="password-wrapper">
                        <input 
                            type={showRecPass2 ? "text" : "password"} 
                            className="auth-input" 
                            placeholder="Repetir nueva contraseña" 
                            value={recPass2}
                            onChange={(e) => setRecPass2(e.target.value)}
                            ref={recPass2Ref}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { 
                                    e.preventDefault(); 
                                    recuperarClave(); 
                                }
                            }}
                        />
                        <button className="btn-ojo" onClick={() => setShowRecPass2(!showRecPass2)}>
                            {showRecPass2 ? SVG_CERRADO : SVG_ABIERTO}
                        </button>
                    </div>
                    
                    <button className="btn-verde btn-full" style={{ padding: '15px', marginTop: '15px' }} onClick={recuperarClave}>
                        RESTABLECER CONTRASEÑA
                    </button>
                    <button className="btn-gris btn-full" onClick={cancelarRecuperacion} style={{ marginTop: '10px', padding: '15px' }}>
                        Cancelar
                    </button>
                </div>
            )}
        </div>
    );
}

export default PantallaLogueo;