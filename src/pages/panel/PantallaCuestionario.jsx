/**
 * @file PantallaCuestionario.jsx
 * @brief Vista de cuestionarios unificada para profesor y tutor.
 *
 * Discrimina por rol:
 *   - profesor: puede crear, editar, eliminar y controlar el estado del cuestionario.
 *   - tutor:    solo puede listar y revisar cuestionarios finalizados.
 */

import { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import '../panel.css';

const formatearTiempo = (totalSegundos) => {
    const s = Math.max(0, Math.round(totalSegundos || 0));
    const horas = Math.floor(s / 3600);
    const minutos = Math.floor((s % 3600) / 60);
    const segundos = s % 60;
    const mm = String(minutos).padStart(2, '0');
    const ss = String(segundos).padStart(2, '0');
    return horas > 0 ? `${horas}:${mm}:${ss}` : `${mm}:${ss}`;
};

// ---------------------------------------------------------------------------
// Sub-vista: lista de cuestionarios
// ---------------------------------------------------------------------------
function ListaCuestionarios({ cuestionarios, rol, cargando, onNuevo, onEditar, onEliminar, onCambiarEstado, onRevisar, onVolver }) {
    return (
        <div className="panel-menu-container">
            <div className="cuestionarios-sub-header">
                <h3 className="sub-header-titulo">Cuestionarios</h3>
                {rol === 'profesor' && (
                    <button className="btn-nuevo-cues" onClick={onNuevo} disabled={cargando}>
                        Nuevo +
                    </button>
                )}
            </div>

            <div className="lista-cuestionarios">
                {cuestionarios.length === 0 ? (
                    <p style={{ color: '#fff', textAlign: 'center' }}>No hay cuestionarios para mostrar.</p>
                ) : (
                    cuestionarios.map(cues => {
                        const estado = cues.estado.toUpperCase();
                        let colorEstado = '#fff';
                        if (estado === 'PENDIENTE')   colorEstado = '#e74c3c';
                        if (estado === 'EN_PROGRESO') colorEstado = '#3498db';
                        if (estado === 'PAUSADO')     colorEstado = '#f1c40f';
                        if (estado === 'FINALIZADO')  colorEstado = '#27ae60';

                        let txtAccion = '';
                        let accionApi = '';
                        if (estado === 'PENDIENTE')   { txtAccion = 'INICIAR';  accionApi = 'iniciar'; }
                        if (estado === 'EN_PROGRESO') { txtAccion = 'PAUSAR';   accionApi = 'pausar'; }
                        if (estado === 'PAUSADO')     { txtAccion = 'REANUDAR'; accionApi = 'reanudar'; }
                        if (estado === 'FINALIZADO')  { txtAccion = 'REVISAR'; }

                        const disableTrash = estado === 'EN_PROGRESO' || estado === 'PAUSADO';
                        const disableEdit  = estado === 'EN_PROGRESO' || estado === 'PAUSADO' || estado === 'FINALIZADO';
                        const disableRojo  = estado === 'PENDIENTE'   || estado === 'FINALIZADO';

                        return (
                            <div className="card-cuestionario" key={cues.idCuestionario}>
                                <div className="card-fila-superior">
                                    <span className="card-titulo">
                                        {cues.titulo}
                                        {rol === 'tutor' && cues.materia && (
                                            <span style={{ fontSize: '0.7em', color: '#aaa', marginLeft: '10px' }}>
                                                ({cues.materia})
                                            </span>
                                        )}
                                    </span>

                                    {rol === 'profesor' && (
                                        <div className="card-iconos">
                                            <button
                                                className="btn-icon-trash"
                                                disabled={disableTrash || cargando}
                                                onClick={() => onEliminar(cues.idCuestionario, cues.titulo)}
                                            >🗑</button>
                                            <button
                                                className="btn-icon-edit"
                                                disabled={disableEdit || cargando}
                                                onClick={() => onEditar(cues)}
                                            >✎</button>
                                        </div>
                                    )}
                                </div>

                                <div className="card-metadata">
                                    <div className="metadata-textos">
                                        <span>Nº preguntas: {cues.cantPreguntas}</span>
                                        <span>Puntaje: "{cues.puntajeObtenido}" ({cues.aprobado ? 'Aprobado' : 'Desaprobado'})</span>
                                        <span style={{ color: colorEstado }}>{estado.replace('_', ' ')}</span>
                                    </div>

                                    <div className="metadata-botones-estado">
                                        {/* Botón verde: acción o REVISAR */}
                                        {rol === 'profesor' ? (
                                            <>
                                                <button
                                                    className="btn-estado-verde"
                                                    disabled={cargando}
                                                    onClick={() => {
                                                        if (estado === 'FINALIZADO') onRevisar(cues);
                                                        else onCambiarEstado(cues.idCuestionario, accionApi);
                                                    }}
                                                >
                                                    {txtAccion}
                                                </button>
                                                <button
                                                    className="btn-estado-rojo"
                                                    disabled={disableRojo || cargando}
                                                    onClick={() => {
                                                        if (window.confirm('¿Finalizar?'))
                                                            onCambiarEstado(cues.idCuestionario, 'finalizar');
                                                    }}
                                                >
                                                    FINALIZAR
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className="btn-estado-verde"
                                                disabled={estado !== 'FINALIZADO' || cargando}
                                                onClick={() => onRevisar(cues)}
                                            >
                                                REVISAR
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <button className="btn-volver-bottom" onClick={onVolver} disabled={cargando}>
                Volver
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-vista: editor de cuestionario
// ---------------------------------------------------------------------------
function EditorCuestionario({ idEditando, tituloTest, setTituloTest, puntosAprobar, setPuntosAprobar, preguntas, setPreguntas, cargando, onGuardar, onVolver }) {
    const [editandoTitulo, setEditandoTitulo] = useState(false);

    const agregarPregunta = () => {
        setPreguntas([...preguntas, { pregunta: '', correcta: 0, puntaje: 1, puntajeNegativo: 0, opciones: ['', '', '', ''] }]);
        setTimeout(() => document.getElementById(`cues-preg-${preguntas.length}`)?.focus(), 100);
    };

    const eliminarPregunta = (i) => setPreguntas(preguntas.filter((_, idx) => idx !== i));

    const mover = (i, dir) => {
        const arr = [...preguntas];
        const dest = i + dir;
        if (dest >= 0 && dest < arr.length) {
            [arr[i], arr[dest]] = [arr[dest], arr[i]];
            setPreguntas(arr);
        }
    };

    const actualizarCampo    = (i, campo, val) => { const arr = [...preguntas]; arr[i][campo] = val; setPreguntas(arr); };
    const actualizarOpcion   = (iP, iO, val)  => { const arr = [...preguntas]; arr[iP].opciones[iO] = val; setPreguntas(arr); };
    const aplicarATodas      = (campo, val)   => setPreguntas(preguntas.map(p => ({ ...p, [campo]: parseFloat(val) || 0 })));

    const agregarOpcion = (iP) => {
        const arr = [...preguntas];
        if (arr[iP].opciones.length < 4) arr[iP].opciones.push('');
        setPreguntas(arr);
    };

    const eliminarOpcion = (iP, iO) => {
        const arr = [...preguntas];
        arr[iP].opciones.splice(iO, 1);
        if (arr[iP].correcta === iO) arr[iP].correcta = 0;
        else if (arr[iP].correcta > iO) arr[iP].correcta -= 1;
        setPreguntas(arr);
    };

    return (
        <div className="panel-page-container">
            {/* Título editable */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
                {editandoTitulo ? (
                    <>
                        <input
                            type="text" value={tituloTest}
                            onChange={e => setTituloTest(e.target.value)}
                            onKeyDown={e => { 
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    setEditandoTitulo(false);
                                    setTimeout(() => document.getElementById('cues-preg-0')?.focus(), 100);
                                } 
                            }}
                            style={{ fontSize: '2.5em', background: '#222', color: '#e74c3c', border: '1px solid #555', borderRadius: '8px', padding: '5px 15px', textAlign: 'center', fontWeight: 'bold' }}
                            autoFocus
                        />
                        <button className="btn-verde" onClick={() => setEditandoTitulo(false)} style={{ padding: '10px 15px', fontSize: '1.2em' }}>✔</button>
                    </>
                ) : (
                    <>
                        <h1 className="panel-titulo" style={{ marginBottom: 0 }}>{tituloTest}</h1>
                        <button className="btn-gris" onClick={() => setEditandoTitulo(true)} style={{ padding: '8px 12px', fontSize: '1.2em', background: '#333' }}>✎</button>
                    </>
                )}
            </div>

            <p className="panel-desc">Escribe tus preguntas. Puedes agregar tantas como desees.</p>

            <div className="contenedor-formularios">
                {preguntas.map((preg, i) => (
                    <div className="form-panel" key={i}>
                        <h3>Pregunta {i + 1}</h3>
                        <div className="controles-preg">
                            <button className="btn-preg" onClick={() => mover(i, -1)}>▲</button>
                            <button className="btn-preg" onClick={() => mover(i, 1)}>▼</button>
                            <button className="btn-preg btn-preg-rojo" onClick={() => eliminarPregunta(i)}>X</button>
                        </div>

                        <input
                            id={`cues-preg-${i}`} 
                            type="text" className="pregunta-input"
                            placeholder="Escribe la pregunta aquí..."
                            value={preg.pregunta}
                            enterKeyHint="next"
                            onChange={e => actualizarCampo(i, 'pregunta', e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                    e.preventDefault();
                                    document.getElementById(`cues-preg-${i}-opc-0`)?.focus();
                                }
                            }}
                        />

                        <div className="input-group" style={{ background: '#2c3e50', borderColor: '#2980b9' }}>
                            <label style={{ color: '#fff', minWidth: '150px' }}>Puntaje a sumar:</label>
                            <input type="number" value={preg.puntaje} onChange={e => actualizarCampo(i, 'puntaje', e.target.value)} />
                            <button className="btn-gris" onClick={() => aplicarATodas('puntaje', preg.puntaje)} style={{ margin: 0, padding: '8px 15px' }}>Aplicar a todas</button>
                        </div>

                        <div className="input-group" style={{ background: '#312424', borderColor: '#c0392b' }}>
                            <label style={{ color: '#e74c3c', minWidth: '150px' }}>Puntaje a restar:</label>
                            <input type="number" value={preg.puntajeNegativo} onChange={e => actualizarCampo(i, 'puntajeNegativo', e.target.value)} />
                            <button className="btn-gris" onClick={() => aplicarATodas('puntajeNegativo', preg.puntajeNegativo)} style={{ margin: 0, padding: '8px 15px' }}>Aplicar a todas</button>
                        </div>

                        <hr style={{ margin: '20px 0', borderColor: '#333' }} />

                        {preg.opciones.map((opcionTexto, iO) => (
                            <div className="input-group" key={iO}>
                                <label>
                                    <input type="radio" name={`correcta-${i}`} checked={preg.correcta === iO} onChange={() => actualizarCampo(i, 'correcta', iO)} />
                                    {' '}Correcta
                                </label>
                                <input 
                                    id={`cues-preg-${i}-opc-${iO}`} 
                                    type="text" 
                                    placeholder={`Opción ${iO + 1}`} 
                                    value={opcionTexto} 
                                    onChange={e => actualizarOpcion(i, iO, e.target.value)} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (iO < preg.opciones.length - 1) {
                                                document.getElementById(`cues-preg-${i}-opc-${iO + 1}`)?.focus();
                                            } else {
                                                document.getElementById('cues-btn-add')?.focus();
                                            }
                                        }
                                    }}
                                />
                                {preg.opciones.length > 2 && (
                                    <button className="btn-rojo" onClick={() => eliminarOpcion(i, iO)} style={{ padding: '8px 12px', margin: 0, flexShrink: 0 }}>X</button>
                                )}
                            </div>
                        ))}

                        {preg.opciones.length < 4 && (
                            <button className="btn-gris" onClick={() => agregarOpcion(i)} style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#333' }}>
                                + Agregar otra opción
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <div className="caja-aprobacion">
                <label>Puntaje necesario para aprobar:</label>
                <input type="number" value={puntosAprobar} onChange={e => setPuntosAprobar(e.target.value)} />
            </div>

            <div className="botones-finales">
                <button 
                    id="cues-btn-add" 
                    className="btn-amarillo" 
                    onClick={agregarPregunta} 
                    style={{ marginTop: '10px', padding: '15px' }}
                >
                    + AÑADIR PREGUNTA
                </button>
                <button className="btn-verde" onClick={onGuardar} disabled={cargando} style={{ marginTop: '10px', padding: '15px', opacity: cargando ? 0.7 : 1 }}>
                    {cargando ? 'GUARDANDO...' : 'GUARDAR CUESTIONARIO'}
                </button>
                <button className="btn-gris" disabled={cargando} onClick={onVolver} style={{ marginTop: '10px', padding: '15px' }}>
                    VOLVER SIN GUARDAR
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-vista: revisión de cuestionario finalizado
// ---------------------------------------------------------------------------
function RevisionCuestionario({ cuestionario, preguntas, cargando, onVolver }) {
    return (
        <div className="panel-menu-container">
            <div className="revision-container">
                <h1 className="revision-titulo-principal">{cuestionario.titulo}</h1>

                <div className="revision-lista-preguntas">
                    {preguntas.length === 0 ? (
                        <p style={{ color: '#fff', textAlign: 'center' }}>No hay respuestas para mostrar.</p>
                    ) : (
                        preguntas.map(resp => (
                            <div
                                className="revision-card-pregunta"
                                key={resp.idPregunta}
                                style={{ borderLeftColor: resp.fueCorrecto ? '#27ae60' : '#e74c3c' }}
                            >
                                <h3 className="revision-consigna">{resp.pregunta}</h3>
                                <div className="revision-detalle">
                                    <div>
                                        <p className="revision-elegida">
                                            <span className="revision-label">Opción elegida:</span> {resp.opcionElegida || 'Sin responder'}
                                        </p>
                                        {!resp.fueCorrecto && (
                                            <p className="revision-elegida" style={{ marginTop: '5px' }}>
                                                <span className="revision-label">Opción correcta era:</span> {resp.opcionCorrecta}
                                            </p>
                                        )}
                                    </div>
                                    <p className="revision-puntaje-individual" style={{ color: resp.fueCorrecto ? '#2ecc71' : '#e74c3c' }}>
                                        {resp.fueCorrecto
                                            ? `+${resp.puntajeCorrecta}`
                                            : resp.puntajeIncorrecta > 0
                                                ? `-${resp.puntajeIncorrecta}`
                                                : `0`
                                        } pts
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="revision-footer">
                    <div className="revision-total-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                        <div>
                            <span className="revision-total-texto">Tiempo utilizado: </span>
                            <span className="revision-total-numero" style={{ fontSize: '1.1em' }}>
                                {formatearTiempo(cuestionario.tiempoSegundos)}
                            </span>
                        </div>
                        <div>
                            <span className="revision-total-texto">Puntaje Total: </span>
                            <span className="revision-total-numero">{cuestionario.puntajeObtenido}</span>
                            <span className="revision-total-estado" style={{ color: cuestionario.aprobado ? '#2ecc71' : '#e74c3c', marginLeft: '5px' }}>
                                ({cuestionario.aprobado ? 'Aprobado' : 'Desaprobado'})
                            </span>
                        </div>
                    </div>
                    <button className="btn-volver-bottom" onClick={onVolver} disabled={cargando}>
                        Volver
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
function PantallaCuestionario() {
    const navigate = useNavigate();
    const rol = sessionStorage.getItem('rol');

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`,
    });

    const [vista, setVista] = useState('lista'); 
    const [cargando, setCargando] = useState(false);

    // Lista
    const [cuestionarios, setCuestionarios] = useState([]);

    // Editor
    const [idEditando, setIdEditando]           = useState(null);
    const [tituloTest, setTituloTest]           = useState('Nuevo Cuestionario');
    const [puntosAprobar, setPuntosAprobar]     = useState(1);
    const [preguntas, setPreguntas]             = useState([]);

    // Revisión
    const [cuestionarioRevision, setCuestionarioRevision] = useState(null);
    const [preguntasRevision, setPreguntasRevision]       = useState([]);

    // Cargar lista al montar
    useEffect(() => { cargarCuestionarios(); }, []);

    const cargarCuestionarios = async () => {
        setCargando(true);
        try {
            const res  = await fetch('/api/cuestionarios', { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) setCuestionarios(data.cuestionarios || []);
            else alert(data.mensaje || 'Error al cargar cuestionarios.');
        } catch (_) { alert('Error de conexión.'); }
        finally { setCargando(false); }
    };

    const cambiarEstado = async (id, accion) => {
        setCargando(true);
        try {
            const res = await fetch(`/api/cuestionario/${accion}?id=${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({}) });
            if (res.ok) await cargarCuestionarios();
            else { const d = await res.json(); alert(d.mensaje || 'Error.'); }
        } catch (_) { alert('Error de conexión.'); }
        finally { setCargando(false); }
    };

    const eliminarCuestionario = async (id, titulo) => {
        if (!window.confirm(`¿Eliminar "${titulo}"?`)) return;
        setCargando(true);
        try {
            const res = await fetch(`/api/cuestionario?id=${id}`, { method: 'DELETE', headers: authHeaders() });
            if (res.ok) await cargarCuestionarios();
            else { const d = await res.json(); alert(d.mensaje || 'Error al eliminar.'); }
        } catch (_) { alert('Error de conexión.'); }
        finally { setCargando(false); }
    };

    const abrirRevision = async (cues) => {
        setCargando(true);
        try {
            const res = await fetch(`/api/cuestionario/revision?id=${cues.idCuestionario}`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) { 
                setCuestionarioRevision({ ...cues, tiempoSegundos: data.tiempoSegundos || 0 }); 
                setPreguntasRevision(data.preguntas || []); 
                setVista('revision'); 
            }
            else alert(data.mensaje || 'Error al cargar revisión.');
        } catch (_) { alert('Error de conexión.'); }
        finally { setCargando(false); }
    };

    const iniciarNuevo = () => {
        setIdEditando(null);
        setTituloTest('Nuevo Cuestionario');
        setPuntosAprobar(1);
        setPreguntas([{ pregunta: '', correcta: 0, puntaje: 1, puntajeNegativo: 0, opciones: ['', '', '', ''] }]);
        setVista('editor');
    };

    const abrirEditor = async (cues) => {
        setCargando(true);
        try {
            const res  = await fetch(`/api/cuestionario?id=${cues.idCuestionario}`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) {
                setTituloTest(data.titulo);
                setPuntosAprobar(data.puntajeParaAprobar);
                setPreguntas((data.preguntas || []).map(p => ({
                    pregunta: p.pregunta || '',
                    puntaje: p.puntajeCorrecta || 1,
                    puntajeNegativo: p.puntajeIncorrecta || 0,
                    correcta: p.opciones ? p.opciones.findIndex(o => o.esCorrecta) : 0,
                    opciones: p.opciones ? p.opciones.map(o => o.opcion) : ['', ''],
                })));
                setIdEditando(cues.idCuestionario);
                setVista('editor');
            } else alert(data.mensaje || 'Error al cargar datos.');
        } catch (_) { alert('Error de conexión.'); }
        finally { setCargando(false); }
    };

    const guardar = async () => {
        const incompleta = preguntas.some(p =>
            !p.pregunta.trim() || p.opciones.length < 2 || p.opciones.some(o => !o.trim())
        );
        if (incompleta) return alert('Revisa el formulario. Hay preguntas u opciones vacías.');

        setCargando(true);
        const payload = {
            titulo: tituloTest,
            puntajeParaAprobar: parseFloat(puntosAprobar),
            preguntas: preguntas.map(p => ({
                pregunta: p.pregunta.trim(),
                puntajeCorrecta: parseFloat(p.puntaje),
                puntajeIncorrecta: parseFloat(p.puntajeNegativo),
                opciones: p.opciones.map((texto, idx) => ({ opcion: texto.trim(), esCorrecta: idx === p.correcta })),
            })),
        };
        const esEdicion = idEditando !== null;
        const url    = esEdicion ? `/api/cuestionario?id=${idEditando}` : '/api/cuestionarios';
        const method = esEdicion ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
            if (res.ok) { alert('¡Guardado con éxito!'); await cargarCuestionarios(); setVista('lista'); }
            else { const d = await res.json(); alert(d.mensaje || 'Error al guardar.'); }
        } catch (_) { alert('Error de red.'); }
        finally { setCargando(false); }
    };

    // -----------------------------------------------------------------------
    // Render según vista
    // -----------------------------------------------------------------------
    if (vista === 'lista') {
        return (
            <ListaCuestionarios
                cuestionarios={cuestionarios}
                rol={rol}
                cargando={cargando}
                onNuevo={iniciarNuevo}
                onEditar={abrirEditor}
                onEliminar={eliminarCuestionario}
                onCambiarEstado={cambiarEstado}
                onRevisar={abrirRevision}
                onVolver={() => navigate('/panel')}
            />
        );
    }

    if (vista === 'editor') {
        return (
            <EditorCuestionario
                idEditando={idEditando}
                tituloTest={tituloTest} setTituloTest={setTituloTest}
                puntosAprobar={puntosAprobar} setPuntosAprobar={setPuntosAprobar}
                preguntas={preguntas} setPreguntas={setPreguntas}
                cargando={cargando}
                onGuardar={guardar}
                onVolver={() => {
                    if (window.confirm('¿Volver sin guardar?')) setVista('lista');
                }}
            />
        );
    }

    if (vista === 'revision') {
        return (
            <RevisionCuestionario
                cuestionario={cuestionarioRevision}
                preguntas={preguntasRevision}
                cargando={cargando}
                onVolver={() => { setCuestionarioRevision(null); setVista('lista'); }}
            />
        );
    }

    return null;
}

export default PantallaCuestionario;
