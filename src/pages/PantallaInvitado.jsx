import { useState, useRef, useEffect } from 'react';
import './PantallaInvitado.css';

function PantallaInvitado({ onLogout }) {
    const [pregunta, setPregunta] = useState('');
    const [opciones, setOpciones] = useState(['', '', '', '']);
    const [sesionLista, setSesionLista] = useState(false);

    const preguntaRef = useRef(null);

    const refOp0 = useRef(null);
    const refOp1 = useRef(null);
    const refOp2 = useRef(null);
    const refOp3 = useRef(null);

    const arrayRefs = [refOp0, refOp1, refOp2, refOp3];

    // ────────────────────────────────────────────────────────────────
    // Al montar la pantalla, si no hay token, pedir sesión de invitado
    // ────────────────────────────────────────────────────────────────
    useEffect(() => {
        const iniciarSesionInvitado = async () => {
            const tokenExistente = sessionStorage.getItem('token');
            if (tokenExistente) {
                setSesionLista(true);
                return;
            }
            try {
                const res = await fetch('/api/auth/invitado', { method: 'POST' });
                const data = await res.json();
                if (data.ok) {
                    sessionStorage.setItem('token', data.token);
                    setSesionLista(true);
                } else {
                    alert(data.mensaje || "No se pudo iniciar sesión de invitado.");
                }
            } catch (e) {
                console.error('iniciarSesionInvitado:', e);
                alert("Error de conexión al iniciar sesión de invitado.");
            }
        };
        iniciarSesionInvitado();
    }, []);

    const actualizarOpcion = (index, valor) => {
        const nuevasOpciones = [...opciones];
        nuevasOpciones[index] = valor;
        setOpciones(nuevasOpciones);
    };

    // --- NUEVAS FUNCIONES VISUALES (Igual que en EditorCuestionario) ---
    const agregarOpcion = () => {
        if (opciones.length < 4) {
            setOpciones([...opciones, '']);
        }
    };

    const eliminarOpcion = (index) => {
        const nuevasOpciones = [...opciones];
        nuevasOpciones.splice(index, 1);
        setOpciones(nuevasOpciones);
    };
    // -------------------------------------------------------------------

    const guardarPregunta = async () => {
        if (!pregunta.trim()) {
            alert("Por favor, escribe una pregunta.");
            return;
        }

        const opcionesValidas = opciones.filter(opcion => opcion.trim() !== '');

        if (opcionesValidas.length < 2) {
            alert("Por favor, ingresa al menos 2 opciones válidas.");
            return;
        }

        const token = sessionStorage.getItem('token');

        try {
            const res = await fetch('/api/invitado/pregunta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pregunta: pregunta.trim(),
                    opciones: opcionesValidas
                })
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                alert(data.mensaje || "No se pudo guardar la pregunta.");
                return;
            }

            alert("¡Pregunta enviada! Ya se muestra en la pantalla del alumno.");
            
            // Opcional: Limpiar el formulario después de enviar exitosamente
            setPregunta('');
            setOpciones(['', '', '', '']);
        } catch (e) {
            console.error('guardarPregunta:', e);
            alert("Error de conexión al guardar la pregunta.");
        }
    };

    return (
        <div className="invitado-page-container">
            <h1 className="invitado-titulo">Modo Invitado</h1>
            <p className="invitado-desc">Crea una pregunta rápida para tu amigo o familiar.</p>

            <div className="form-invitado">
                <h3 className="invitado-subtitulo">Tu Pregunta Personal</h3>

                <input
                    type="text"
                    className="pregunta-input-inv"
                    placeholder="Escribe la pregunta aquí..."
                    value={pregunta}
                    onChange={(e) => setPregunta(e.target.value)}
                    ref={preguntaRef}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            arrayRefs[0].current?.focus();
                        }
                    }}
                />

                <div className="opciones-container">
                    {opciones.map((opcion, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <input
                                type="text"
                                className="opcion-input-inv"
                                placeholder={`Opción ${index + 1}`}
                                value={opcion}
                                onChange={(e) => actualizarOpcion(index, e.target.value)}
                                ref={arrayRefs[index]}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (index < opciones.length - 1) {
                                            arrayRefs[index + 1].current?.focus();
                                        } else {
                                            guardarPregunta();
                                        }
                                    }
                                }}
                                style={{ flex: 1, margin: 0 }} 
                            />
                            {/* Botón de eliminar, igual al del editor */}
                            {opciones.length > 2 && (
                                <button 
                                    className="btn-rojo" 
                                    onClick={() => eliminarOpcion(index)} 
                                    style={{ padding: '12px 15px', margin: 0, flexShrink: 0 }}
                                >
                                    X
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Botón de agregar, igual al del editor */}
                    {opciones.length < 4 && (
                        <button 
                            className="btn-gris" 
                            onClick={agregarOpcion} 
                            style={{ width: '100%', marginTop: '5px', padding: '10px', background: '#333' }}
                        >
                            + Agregar otra opción
                        </button>
                    )}
                </div>
            </div>

            <div className="botones-finales-inv">
                <button className="btn-verde" onClick={guardarPregunta} style={{ padding: '15px 30px' }}>
                    GUARDAR
                </button>
                <button className="btn-gris" onClick={onLogout} style={{ padding: '15px 30px' }}>
                    VOLVER
                </button>
            </div>
        </div>
    );
}

export default PantallaInvitado;