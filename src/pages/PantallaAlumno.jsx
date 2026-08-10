import { useState, useRef, useEffect, useCallback } from 'react';
import './PantallaAlumno.css';
import { alumnoIniciar, alumnoEstado, alumnoResponder, alumnoHeartbeat } from '../services/api';

// ---------------------------------------------------------------------------
// Constantes OpenCV
// ---------------------------------------------------------------------------
const TAMAÑO_CORTE = 128;
const TAM_MOLDE = 96;
const MARGEN = (TAMAÑO_CORTE - TAM_MOLDE) / 2;
const FPS_LIMIT = 15;
const ZONAS = ['tl', 'tr', 'bl', 'br'];

const ORDEN_CALIBRACION = [
    { id: 'centro', posCss: 'centro', color: '#34495e', msg: 'Mirá fijo al CENTRO' },
    { id: 'tl', posCss: 'arriba-izq', color: '#e74c3c', msg: 'Mirá a la OPCIÓN 1\n(Arriba Izquierda)' },
    { id: 'tr', posCss: 'arriba-der', color: '#3498db', msg: 'Mirá a la OPCIÓN 2\n(Arriba Derecha)' },
    { id: 'bl', posCss: 'abajo-izq', color: '#f1c40f', msg: 'Mirá a la OPCIÓN 3\n(Abajo Izquierda)' },
    { id: 'br', posCss: 'abajo-der', color: '#27ae60', msg: 'Mirá a la OPCIÓN 4\n(Abajo Derecha)' },
    { id: 'cerrado', posCss: 'centro', color: '#e74c3c', msg: '¡Cerrá el ojo AHORA y mantenelo cerrado!' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Caché local de opencv.js en IndexedDB
// ---------------------------------------------------------------------------

const OPENCV_DB_NAME = 'levi-opencv-cache';
const OPENCV_STORE_NAME = 'archivos';
const OPENCV_CACHE_KEY = 'opencv.js';
const OPENCV_TAMANIO_MINIMO_VALIDO = 200 * 1024;

function abrirOpenCvCacheDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(OPENCV_DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(OPENCV_STORE_NAME)) {
                req.result.createObjectStore(OPENCV_STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function leerOpenCvDeCache() {
    try {
        const db = await abrirOpenCvCacheDB();
        return await new Promise((resolve) => {
            const tx = db.transaction(OPENCV_STORE_NAME, 'readonly');
            const req = tx.objectStore(OPENCV_STORE_NAME).get(OPENCV_CACHE_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (_) {
        return null; // IndexedDB no disponible por algún motivo: seguimos por red
    }
}

function conTimeout(promesa, ms, valorPorDefecto) {
    return Promise.race([
        promesa,
        new Promise((resolve) => setTimeout(() => resolve(valorPorDefecto), ms))
    ]);
}

async function guardarOpenCvEnCache(codigoStr) {
    try {
        const db = await abrirOpenCvCacheDB();
        await new Promise((resolve) => {
            const tx = db.transaction(OPENCV_STORE_NAME, 'readwrite');
            tx.objectStore(OPENCV_STORE_NAME).put(codigoStr, OPENCV_CACHE_KEY);
            tx.oncomplete = resolve;
            tx.onerror = resolve;
        });
    } catch (_) {
        // No pasa nada si no se pudo cachear: la próxima vez se vuelve a intentar
    }
}

// Formatea segundos como "MM:SS" (o "H:MM:SS" si el examen duró más de una hora)
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
// Carga de opencv.js — SINGLETON a nivel de módulo
// Evita que remounts (StrictMode, o remount rápido del componente) disparen
// más de una inyección/inicialización del script, lo cual corrompe el
// runtime WASM ("Cannot register public name 'IntVector' twice", etc.)
// ---------------------------------------------------------------------------
let opencvLoadingPromise = null;

function insertarYEsperarWasm(codigoStr, inicioFetch) {
    return new Promise((resolve) => {
        // Última línea de defensa: si por cualquier motivo ya está inyectado
        // o ya está vivo, no volvemos a inyectar, solo esperamos a que esté listo.
        if (document.getElementById('script-opencv-levi') || (window.cv && window.cv.Mat)) {
            console.log("[OpenCV] Script/módulo ya presente. Esperando inicialización existente.");
            const tEsp = setInterval(() => {
                if (window.cv && window.cv.Mat) {
                    clearInterval(tEsp);
                    resolve();
                }
            }, 200);
            return;
        }

        const inicioEval = performance.now();
        const scriptObj = document.createElement("script");
        scriptObj.id = 'script-opencv-levi';
        scriptObj.text = codigoStr;
        document.body.appendChild(scriptObj);
        console.log(`[OpenCV] Script insertado en el DOM en ${(performance.now() - inicioEval).toFixed(0)}ms`);

        const inicioWasm = performance.now();
        let intentos = 0;
        const t = setInterval(() => {
            intentos++;
            if (window.cv && window.cv.Mat) {
                const segWasm = ((performance.now() - inicioWasm) / 1000).toFixed(1);
                const segTotal = ((performance.now() - inicioFetch) / 1000).toFixed(1);
                console.log(`[OpenCV] ¡Listo! WASM tardó ${segWasm}s en inicializar. Total desde el pedido: ${segTotal}s`);
                clearInterval(t);
                resolve();
            } else if (intentos % 10 === 0) {
                console.log(`[OpenCV] Todavía esperando que WASM inicialice... (${intentos}s desde que se insertó el script)`);
            }
        }, 1000);
    });
}

function cargarOpenCVUnaSolaVez() {
    // Ya inicializado (ej: hot reload conservó window.cv) → resolvemos directo
    if (window.cv && window.cv.Mat) {
        return Promise.resolve();
    }
    // Ya hay una carga en curso (otro mount / StrictMode) → reusamos esa promesa
    if (opencvLoadingPromise) {
        return opencvLoadingPromise;
    }

    opencvLoadingPromise = (async () => {
        const inicioFetch = performance.now();
        let controladorActual = null;
        let intentoNro = 0;

        const pedirPorRed = async () => {
            const TIMEOUT_MS = 45000;
            if (controladorActual) controladorActual.abort();
            const controlador = new AbortController();
            controladorActual = controlador;
            const timeoutId = setTimeout(() => controlador.abort(), TIMEOUT_MS);

            try {
                console.log(`[OpenCV] Pidiendo /opencv.js por red (intento ${intentoNro + 1})...`);
                const res = await fetch("/opencv.js", { signal: controlador.signal });
                console.log(`[OpenCV] Respuesta HTTP en ${(performance.now() - inicioFetch).toFixed(0)}ms (status ${res.status})`);

                if (!res.ok) {
                    if (res.status === 429) {
                        console.log("Servidor ocupado. Reintentando...");
                        return await programarReintento();
                    }
                    throw new Error(`Error del servidor: ${res.status}`);
                }

                const inicioBody = performance.now();
                const codigoStr = await res.text();
                console.log(`[OpenCV] Cuerpo descargado: ${(codigoStr.length / 1024).toFixed(0)} KB en ${(performance.now() - inicioBody).toFixed(0)}ms`);

                if (codigoStr.length < OPENCV_TAMANIO_MINIMO_VALIDO) {
                    throw new Error(`Descarga incompleta: solo ${codigoStr.length} bytes`);
                }

                intentoNro = 0;
                guardarOpenCvEnCache(codigoStr);
                await insertarYEsperarWasm(codigoStr, inicioFetch);

            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('[OpenCV] Pedido cancelado o excedió el timeout.');
                } else {
                    console.warn('[OpenCV] Fallo de red:', error.message);
                }
                await programarReintento();
            } finally {
                clearTimeout(timeoutId);
            }
        };

        const programarReintento = () => {
            intentoNro++;
            const esperaMs = Math.min(3000 + intentoNro * 2000, 15000);
            console.log(`[OpenCV] Reintentando en ${(esperaMs / 1000).toFixed(0)}s...`);
            return new Promise((resolve) => {
                setTimeout(() => resolve(pedirPorRed()), esperaMs);
            });
        };

        console.log('[OpenCV] Arrancando carga (revisando caché local)...');
        const cacheado = await conTimeout(leerOpenCvDeCache(), 2000, null);

        if (cacheado && cacheado.length >= OPENCV_TAMANIO_MINIMO_VALIDO) {
            console.log(`[OpenCV] Usando versión cacheada localmente (${(cacheado.length / 1024).toFixed(0)} KB), sin tocar la red.`);
            await insertarYEsperarWasm(cacheado, inicioFetch);
            return;
        }

        console.log('[OpenCV] Sin caché válida (o tardó demasiado en responder). Pidiendo por red...');
        await pedirPorRed();
    })();

    return opencvLoadingPromise;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
function PantallaAlumno({ onLogout, onAlumnoOcupado }) {

    // ── Vista principal ──────────────────────────────────────────────────
    const [vistaAlumno, setVistaAlumno] = useState('menu'); // menu | calibracion | examen

    // ── OpenCV UI ───────────────────────────────────────────────────────
    const [cvListoUI, setCvListoUI] = useState(false);
    const isCvReadyRef = useRef(false);

    // ── Calibración ─────────────────────────────────────────────────────
    const [faseCalibracion, setFaseCalibracion] = useState('inicio');
    const [pasoActivo, setPasoActivo] = useState(null);
    const [mensajeInstruccion, setMensajeInstruccion] = useState('');
    const [textoCuenta, setTextoCuenta] = useState('');
    const cancelarSecuenciaRef = useRef(false);
    const calibradoRef = useRef(false);

    // ── Mats OpenCV ─────────────────────────────────────────────────────
    const srcRef = useRef(null);
    const dstRef = useRef(null);
    const grayRef = useRef(null);
    const moldesMatRef = useRef({ centro: null, tl: null, tr: null, bl: null, br: null, cerrado: null });
    const moldeCanvasRefs = useRef({ centro: null, tl: null, tr: null, bl: null, br: null, cerrado: null });

    // ── Stream ──────────────────────────────────────────────────────────
    const imgStreamRef = useRef(null);
    const canvasOutputRef = useRef(null);
    const hiddenCanvasRef = useRef(null);
    const loopActivoRef = useRef(false);
    const lastTimeRef = useRef(0);

    // ── Tracking ─────────────────────────────────────────────────────────
    const [umbralConfianza, setUmbralConfianza] = useState(0.80);
    const [opcionResaltada, setOpcionResaltada] = useState(null);
    const [opcionRegistrada, setOpcionRegistrada] = useState(null);
    const [logDecision, setLogDecision] = useState('Esperando calibración...');
    const ultimaOpcionValidaRef = useRef(null);
    const esperandoSiguienteRef = useRef(false);
    const respondientoRef = useRef(false); // evita doble envío simultáneo

    // ── Estado del examen (viene del backend) ────────────────────────────
    // 'iniciando' | 'esperando' | 'en_progreso' | 'finalizado' | 'sin_sesion'
    const [estadoExamen, setEstadoExamen] = useState('sin_sesion');
    const estadoExamenRef = useRef('sin_sesion'); // mirror para procesarFrame (evita stale closure)
    const [preguntaActual, setPreguntaActual] = useState(null);
    const preguntaActualRef = useRef(null); // mirror para enviarRespuesta (evita stale closure)
    // { idPregunta, textoPregunta, numeroPregunta, totalPreguntas, opciones:[{idOpcion,opcion}] }
    const [resultado, setResultado] = useState(null);
    // { puntajeObtenido, puntajeParaAprobar, aprobado }

    const umbralConfianzaRef = useRef(0.80); // mirror para procesarFrame (evita stale closure)

    const pollingRef = useRef(null);
    const tokenRef = useRef(sessionStorage.getItem('tokenAlumno') || null);
    const [sesionLista, setSesionLista] = useState(false);

    // Helper: setea estado y su ref mirror en un solo lugar
    const setEstadoExamenSync = (nuevoEstado) => {
        estadoExamenRef.current = nuevoEstado;
        setEstadoExamen(nuevoEstado);
    };

    // Helper: setea preguntaActual y su ref mirror en un solo lugar
    const setPreguntaActualSync = (p) => {
        preguntaActualRef.current = p;
        setPreguntaActual(p);
    };

    // ────────────────────────────────────────────────────────────────────
    // INICIAR SESIÓN ALUMNO — al montar el componente
    // ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const data = await alumnoIniciar();
                tokenRef.current = data.token;
                sessionStorage.setItem('tokenAlumno', data.token);
            } catch (e) {
                try {
                    await alumnoHeartbeat();
                    // Somos nosotros recargando, el token sigue vivo
                } catch (_) {
                    // Otro alumno conectado → alertar ANTES de pedir la cámara
                    alert('Ya hay un alumno conectado.');
                    onAlumnoOcupado(); // redirige a home
                    return;            // ← salimos sin activar sesionLista
                }
            }
            // Solo llegamos acá si la sesión es válida
            setSesionLista(true);
            setEstadoExamenSync('iniciando');
            // consultarEstado();
            // pollingRef.current = setInterval(consultarEstado, 2000);
        };
        init();
        return () => detenerPolling();
    }, []);

    // ────────────────────────────────────────────────────────────────────
    // POLLING DE ESTADO (cada 2s)
    // ────────────────────────────────────────────────────────────────────
    const consultarEstado = useCallback(async () => {
        try {
            await alumnoHeartbeat();
            const data = await alumnoEstado();

            console.log("ESTADO BACKEND:", data);
            const e = data.estado;

            if (e === 'en_progreso' || e === 'invitado') {
                if (data.pregunta) {
                    setPreguntaActualSync(data.pregunta);
                    setEstadoExamenSync('en_progreso');
                } else {
                    setEstadoExamenSync('esperando');
                }
            } else if (e === 'finalizado') {
                setEstadoExamenSync('finalizado');
                setResultado({
                    puntajeObtenido: data.puntajeObtenido,
                    puntajeParaAprobar: data.puntajeParaAprobar,
                    aprobado: data.aprobado,
                    puntajeMaximo: data.puntajeMaximo,
                    tiempoSegundos: data.tiempoSegundos
                });
                detenerPolling();
            } else {
                // 'esperando', 'pausado' u otro: el alumno simplemente espera
                setEstadoExamenSync('esperando');
                setPreguntaActualSync(null);
            }
        } catch (e) {
            console.warn('consultarEstado:', e.message);
        }
    }, []);

    const iniciarPolling = useCallback(() => {
        detenerPolling();
        consultarEstado();
        pollingRef.current = setInterval(consultarEstado, 2000);
    }, [consultarEstado]);

    const detenerPolling = () => {
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };

    // ────────────────────────────────────────────────────────────────────
    // ENVIAR RESPUESTA
    // ────────────────────────────────────────────────────────────────────
    const enviarRespuesta = useCallback(async (zonaElegida) => {
        if (!preguntaActualRef.current || respondientoRef.current) return;
        const idxZona = ZONAS.indexOf(zonaElegida);
        if (idxZona < 0 || !preguntaActualRef.current.opciones[idxZona]) return;

        respondientoRef.current = true;
        const idOpcion = preguntaActualRef.current.opciones[idxZona].idOpcion;
        const idPregunta = preguntaActualRef.current.idPregunta;

        try {
            const res = await alumnoResponder(idPregunta, idOpcion);
            if (res.finalizo) {
                // El backend finalizó automáticamente y devuelve el puntaje
                setResultado({
                    puntajeObtenido: res.puntajeObtenido,
                    puntajeParaAprobar: res.puntajeParaAprobar,
                    aprobado: res.aprobado,
                    puntajeMaximo: res.puntajeMaximo,
                    tiempoSegundos: res.tiempoSegundos
                });
                setEstadoExamenSync('finalizado');
                detenerPolling();
            } else {
                // Avanzamos a la siguiente pregunta
                await consultarEstado();
            }
        } catch (e) {
            console.warn('enviarRespuesta:', e.message);
        } finally {
            respondientoRef.current = false;
            esperandoSiguienteRef.current = false;
            setOpcionRegistrada(null);
            setOpcionResaltada(null);
            ultimaOpcionValidaRef.current = null;
        }
    }, [consultarEstado]);

    // ────────────────────────────────────────────────────────────────────
    // OPENCV — Caché local primero; si no, red con timeout + reintentos
    // ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        let activo = true;

        cargarOpenCVUnaSolaVez().then(() => {
            if (!activo) return; // el componente se desmontó antes de terminar

            isCvReadyRef.current = true;
            setCvListoUI(true);

            // Recreamos las matrices si se perdieron al desmontar/remontar
            if (!srcRef.current || srcRef.current.isDeleted()) {
                srcRef.current = new window.cv.Mat(240, 320, window.cv.CV_8UC4);
                dstRef.current = new window.cv.Mat(TAMAÑO_CORTE, TAMAÑO_CORTE, window.cv.CV_8UC4);
                grayRef.current = new window.cv.Mat();
            }

            cargarCalibracionDeCache();
            consultarEstado();
            pollingRef.current = setInterval(consultarEstado, 2000);
        });

        return () => {
            activo = false;
        };
    }, [consultarEstado]);

    // ────────────────────────────────────────────────────────────────────
    // HEARTBEAT DE LA CÁMARA (Avisarle al CYD que el stream llega bien)
    // ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const intervalPing = setInterval(() => {
            if (loopActivoRef.current && imgStreamRef.current) {
                // Solo verificamos que la imagen tenga dimensiones y un source válido
                const streamVivo = imgStreamRef.current.naturalWidth > 0 && imgStreamRef.current.hasAttribute('src');

                if (streamVivo) {
                    // Ping EXCLUSIVO al CYD. Dejamos a la cámara en paz.
                    fetch('/api/camara/ping', { headers: { 'Connection': 'close' } }).catch(() => { });
                }
            }
        }, 2000);

        return () => clearInterval(intervalPing);
    }, []);

    // ────────────────────────────────────────────────────────────────────
    // LOOP DE VIDEO
    // ────────────────────────────────────────────────────────────────────
    useEffect(() => {
        let frameId;
        const ejecutarLoop = (ts) => {
            procesarFrame(ts);
            if (loopActivoRef.current) frameId = requestAnimationFrame(ejecutarLoop);
        };

        if (vistaAlumno === 'calibracion' || vistaAlumno === 'examen') {
            loopActivoRef.current = true;
            if (imgStreamRef.current && !imgStreamRef.current.src.includes('192.168.4.50')) {
                imgStreamRef.current.src = `http://192.168.4.50/stream?t=${Date.now()}`;
            }
            frameId = requestAnimationFrame(ejecutarLoop);
        } else {
            loopActivoRef.current = false;
            if (imgStreamRef.current) imgStreamRef.current.src = '';
        }

        return () => {
            loopActivoRef.current = false;
            if (frameId) cancelAnimationFrame(frameId);
            if (imgStreamRef.current) imgStreamRef.current.src = '';
        };
    }, [vistaAlumno]);

    // Anti-borrado de React: redibujar moldes en cada render
    useEffect(() => {
        if (!isCvReadyRef.current || !window.cv) return;
        ORDEN_CALIBRACION.forEach(p => {
            const canvas = moldeCanvasRefs.current[p.id];
            const mat = moldesMatRef.current[p.id];
            // Validamos con .cols en vez de .empty()
            if (canvas && mat && mat.cols > 0) {
                try { window.cv.imshow(canvas, mat); } catch (_) { }
            }
        });
    });
    // ────────────────────────────────────────────────────────────────────
    // PROCESAMIENTO DE FRAME
    // ────────────────────────────────────────────────────────────────────
    const procesarFrame = (timestamp) => {
        if (!loopActivoRef.current) return;
        if (timestamp - lastTimeRef.current < 1000 / FPS_LIMIT) return;
        lastTimeRef.current = timestamp;

        const img = imgStreamRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;
        const outputCanvas = canvasOutputRef.current;
        if (!img || img.naturalWidth === 0 || !hiddenCanvas || !outputCanvas) return;

        const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
        hiddenCtx.drawImage(img, 0, 0, 320, 240);

        if (!isCvReadyRef.current || !srcRef.current) {
            outputCanvas.getContext('2d').drawImage(hiddenCanvas, 80, 56, 128, 128, 0, 0, 128, 128);
            return;
        }

        const cv = window.cv;
        try {
            const imgData = hiddenCtx.getImageData(0, 0, 320, 240);
            srcRef.current.data.set(imgData.data);

            const cx = Math.floor(srcRef.current.cols / 2);
            const cy = Math.floor(srcRef.current.rows / 2);
            const roi = new cv.Rect(cx - TAMAÑO_CORTE / 2, cy - TAMAÑO_CORTE / 2, TAMAÑO_CORTE, TAMAÑO_CORTE);
            const roiRecorte = srcRef.current.roi(roi);
            roiRecorte.copyTo(dstRef.current);
            cv.cvtColor(roiRecorte, grayRef.current, cv.COLOR_RGBA2GRAY, 0);

            // ── MATCHING (solo en examen, en progreso y sin esperar) ──
            if (calibradoRef.current && vistaAlumno === 'examen'
                && estadoExamenRef.current === 'en_progreso' && !esperandoSiguienteRef.current) {

                let mejorScore = 0;
                let mejorZona = null;
                for (const zona of ['centro', 'tl', 'tr', 'bl', 'br', 'cerrado']) {
                    const molde = moldesMatRef.current[zona];
                    // Acá estaba el .empty() que hacía explotar todo. Lo cambiamos:
                    if (!molde || molde.cols === undefined || molde.cols === 0) continue;

                    const res = new cv.Mat();
                    cv.matchTemplate(grayRef.current, molde, res, cv.TM_CCOEFF_NORMED);
                    const loc = cv.minMaxLoc(res);
                    res.delete();
                    if (loc.maxVal > mejorScore) { mejorScore = loc.maxVal; mejorZona = zona; }
                }

                if (mejorScore >= umbralConfianzaRef.current) {
                    setLogDecision(`[${mejorZona?.toUpperCase()}] ${(mejorScore * 100).toFixed(1)}%`);

                    if (mejorZona === 'cerrado') {
                        // Parpadeo = confirmar lo que estaba mirando
                        if (ultimaOpcionValidaRef.current && ultimaOpcionValidaRef.current !== 'centro') {
                            const zonaElegida = ultimaOpcionValidaRef.current;
                            esperandoSiguienteRef.current = true;
                            setOpcionRegistrada(zonaElegida);
                            setTimeout(() => enviarRespuesta(zonaElegida), 1500);
                        }
                    } else if (mejorZona !== 'centro') {
                        ultimaOpcionValidaRef.current = mejorZona;
                        setOpcionResaltada(mejorZona);
                    } else {
                        setOpcionResaltada(ultimaOpcionValidaRef.current);
                    }
                } else {
                    setLogDecision(`Buscando... (${mejorZona} ${(mejorScore * 100).toFixed(0)}%)`);
                }
            }

            if (!calibradoRef.current) {
                cv.rectangle(dstRef.current,
                    new cv.Point(MARGEN, MARGEN),
                    new cv.Point(MARGEN + TAM_MOLDE, MARGEN + TAM_MOLDE),
                    new cv.Scalar(255, 255, 0, 255), 1);
            }

            cv.imshow(outputCanvas, dstRef.current);
            roiRecorte.delete();
        } catch (err) {
            outputCanvas.getContext('2d').drawImage(hiddenCanvas, 80, 56, 128, 128, 0, 0, 128, 128);
        }
    };

    // ────────────────────────────────────────────────────────────────────
    // CALIBRACIÓN
    // ────────────────────────────────────────────────────────────────────
    const capturarMolde = (pasoId) => {
        try {
            const cv = window.cv;
            const gray = grayRef.current;

            // Verificación hiper segura sin tocar funciones de C++
            if (!gray || gray.cols === undefined || gray.cols === 0) {
                console.warn(`[Calibración] Imagen no lista, omitiendo ${pasoId}`);
                return;
            }

            const rect = new cv.Rect(MARGEN, MARGEN, TAM_MOLDE, TAM_MOLDE);

            // Si ya había un molde viejo, lo borramos para liberar RAM
            if (moldesMatRef.current[pasoId]) {
                try { moldesMatRef.current[pasoId].delete(); } catch (e) { }
            }

            // Extraer el recorte, clonarlo y limpiar el temporal (Evita fugas de memoria)
            const tempRoi = gray.roi(rect);
            moldesMatRef.current[pasoId] = tempRoi.clone();
            tempRoi.delete();

            const canvas = moldeCanvasRefs.current[pasoId];
            if (canvas) {
                try { cv.imshow(canvas, moldesMatRef.current[pasoId]); } catch (e) { }
            }
        } catch (err) {
            console.error(`Error capturando molde ${pasoId}:`, err);
        }
    };

    const guardarCalibracionEnCache = () => {
        try {
            ['centro', 'tl', 'tr', 'bl', 'br', 'cerrado'].forEach(id => {
                const molde = moldesMatRef.current[id];
                // Validamos con .cols en vez de .empty()
                if (!molde || molde.cols === undefined || molde.cols === 0) return;

                const tmp = document.createElement('canvas');
                tmp.width = TAM_MOLDE;
                tmp.height = TAM_MOLDE;
                window.cv.imshow(tmp, molde);
                sessionStorage.setItem('calib_ojo_' + id, tmp.toDataURL());
            });
        } catch (err) {
            console.error("Error guardando moldes en caché:", err);
        }
    };

    const cargarCalibracionDeCache = () => {
        const pasos = ['centro', 'tl', 'tr', 'bl', 'br', 'cerrado'];
        let cargados = 0;
        pasos.forEach(id => {
            const data = sessionStorage.getItem('calib_ojo_' + id);
            if (!data) return;
            const img = new Image();
            img.onload = () => {
                const tmp = document.createElement('canvas');
                tmp.width = tmp.height = TAM_MOLDE;
                tmp.getContext('2d').drawImage(img, 0, 0);
                const mat = window.cv.imread(tmp);
                window.cv.cvtColor(mat, mat, window.cv.COLOR_RGBA2GRAY);
                if (moldesMatRef.current[id]) moldesMatRef.current[id].delete();
                moldesMatRef.current[id] = mat;
                cargados++;
                if (cargados === pasos.length) { calibradoRef.current = true; }
            };
            img.src = data;
        });
    };

    const iniciarSecuencia = async () => {
        try {
            setFaseCalibracion('calibrando');
            cancelarSecuenciaRef.current = false;
            for (let i = 0; i < ORDEN_CALIBRACION.length; i++) {
                if (cancelarSecuenciaRef.current) return;
                const paso = ORDEN_CALIBRACION[i];
                setPasoActivo(paso.id);
                setMensajeInstruccion(paso.msg);
                for (const n of ['3', '2', '1']) {
                    setTextoCuenta(n); await sleep(1000);
                    if (cancelarSecuenciaRef.current) return;
                }
                setTextoCuenta('¡FOTO!');
                capturarMolde(paso.id);
                await sleep(1000);
            }
            if (!cancelarSecuenciaRef.current) {
                guardarCalibracionEnCache();
                calibradoRef.current = true;
                setFaseCalibracion('confirmacion');
                setPasoActivo(null);
            }
        } catch (err) {
            console.error("Error imprevisto en la secuencia de calibración:", err);
            detenerYReiniciar(); // Devolvemos la UI a un estado seguro si algo falla
        }
    };

    const detenerYReiniciar = () => { cancelarSecuenciaRef.current = true; setFaseCalibracion('inicio'); setPasoActivo(null); };
    const detenerYVolver = () => { cancelarSecuenciaRef.current = true; setVistaAlumno('menu'); };

    // ────────────────────────────────────────────────────────────────────
    // CSS helper cuadrante
    // ────────────────────────────────────────────────────────────────────
    const claseCuadrante = (zona, base) => {
        if (opcionRegistrada === zona) return `${base} cuadrante-registrado`;
        if (opcionResaltada === zona) return `${base} cuadrante-activo`;
        return base;
    };

    const pasoActualObj = ORDEN_CALIBRACION.find(p => p.id === pasoActivo);

    // ────────────────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────────────────
    return (
        <div className="alumno-main-wrapper">


            {/* Stream e hidden canvas — solo cuando la sesión está confirmada */}
            {sesionLista && (
                <>
                    <img ref={imgStreamRef}
                        crossOrigin="anonymous"
                        onError={(e) => {
                            console.warn("Conexión de video interrumpida.");
                            e.target.removeAttribute('src'); // Rompe la imagen congelada
                        }}
                        onAbort={(e) => e.target.removeAttribute('src')}
                        style={{ position: 'absolute', top: 0, left: 0, width: '320px', height: '240px', opacity: 0.01, zIndex: -1, pointerEvents: 'none' }}
                        alt=""
                    />
                    <canvas ref={hiddenCanvasRef} width={320} height={240} style={{ display: 'none' }} />
                </>
            )}

            {/* ══ VISTA: MENÚ ══════════════════════════════════════════ */}
            {vistaAlumno === 'menu' && (
                <div className="alumno-card">
                    <div className={`banner-cv-estado ${cvListoUI ? 'banner-cv-listo' : 'banner-cv-cargando'}`}
                        style={{ position: 'relative', width: '100%', borderRadius: '8px', marginBottom: '20px' }}>
                        {cvListoUI ? '✅ Sistema listo' : '⏳ Cargando sistema de visión...'}
                    </div>
                    <h2 className="alumno-titulo">Panel del Alumno</h2>
                    <div className="alumno-botones-centrales">
                        <button className="btn-menu-gigante color-calibrar"
                            disabled={!cvListoUI}
                            onClick={() => { setVistaAlumno('calibracion'); setFaseCalibracion('inicio'); }}>
                            Calibrar
                        </button>
                        <button className="btn-menu-gigante color-examen"
                            disabled={!cvListoUI}
                            onClick={() => setVistaAlumno('examen')}>
                            Iniciar cuestionario
                        </button>
                        <button className="btn-volver-alumno" onClick={onLogout}>
                            Volver
                        </button>
                    </div>
                </div>
            )}

            {/* ══ VISTA: CALIBRACIÓN ═══════════════════════════════════ */}
            {vistaAlumno === 'calibracion' && (
                <div className="calibracion-pantalla-completa">
                    {faseCalibracion === 'calibrando' && pasoActualObj && (
                        <h2 className={`texto-mira-aqui posicion-${pasoActualObj.posCss}`}
                            style={{ backgroundColor: pasoActualObj.color }}>
                            {pasoActualObj.id === 'cerrado' ? 'CERRADO' : 'MIRA AQUÍ'}
                        </h2>
                    )}
                    <div className="camara-wrapper-absoluto">
                        <canvas ref={canvasOutputRef} width={128} height={128} className="caja-camara-verde" />
                        {faseCalibracion === 'calibrando' && (
                            <button className="btn-abortar" onClick={detenerYReiniciar}>Abortar</button>
                        )}
                    </div>
                    <div className="calibracion-contenido-central">
                        <div className="cuadritos-container">
                            {ORDEN_CALIBRACION.map((punto, index) => (
                                <div className="cuadrito-item" key={punto.id}>
                                    <canvas ref={el => { if (el) moldeCanvasRefs.current[punto.id] = el; }}
                                        width={TAM_MOLDE} height={TAM_MOLDE}
                                        className={`cuadrito-caja ${pasoActivo === punto.id ? 'cuadrito-activo' : ''} ${index === 5 ? 'cuadrito-amarillo' : 'cuadrito-azul'}`}
                                    />
                                    <span className="cuadrito-label">
                                        {punto.id === 'cerrado' ? 'CERRADO' : punto.id === 'centro' ? 'Centro' : `Opción ${index}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="zona-textos-centrales">
                            {faseCalibracion === 'inicio' && (
                                <>
                                    <h1 className="calibracion-titulo-principal">Calibración</h1>
                                    <p className="calibracion-instrucciones">
                                        {calibradoRef.current
                                            ? '✅ Hay una calibración guardada. Podés usarla o rehacerla.'
                                            : 'Acomodate para que tu ojo se vea claro en el recuadro y presioná iniciar.'}
                                    </p>
                                    <button className="btn-iniciar-calibracion" onClick={iniciarSecuencia}>
                                        {calibradoRef.current ? 'RECALIBRAR' : 'INICIAR SECUENCIA'}
                                    </button><br />
                                    <button className="btn-volver-chico" onClick={detenerYVolver}>Volver</button>
                                </>
                            )}
                            {faseCalibracion === 'calibrando' && (
                                <div className="caja-conteo-dinamico">
                                    <h2 className="instruccion-dinamica">{mensajeInstruccion}</h2>
                                    <h1 className="numero-gigante">{textoCuenta}</h1>
                                </div>
                            )}
                            {faseCalibracion === 'confirmacion' && (
                                <>
                                    <h1 className="calibracion-titulo-principal" style={{ color: '#f1c40f' }}>¡Calibración lista!</h1>
                                    <p className="calibracion-instrucciones">Se capturaron los 6 moldes correctamente.</p>
                                    <div className="contenedor-botones-confirmacion">
                                        <button className="btn-confirmacion btn-verde" onClick={() => setVistaAlumno('menu')}>
                                            Aceptar y Volver
                                        </button>
                                        <button className="btn-confirmacion btn-gris" onClick={iniciarSecuencia}>
                                            Rehacer
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ VISTA: EXAMEN ════════════════════════════════════════ */}
            {vistaAlumno === 'examen' && (
                <div className="examen-pantalla-completa">

                    {/* CABECERA */}
                    <div className="examen-header">
                        <h1>
                            {estadoExamen === 'en_progreso' && preguntaActual
                                ? `Pregunta ${preguntaActual.numeroPregunta}/${preguntaActual.totalPreguntas}: ${preguntaActual.textoPregunta}`
                                : estadoExamen === 'esperando' || estadoExamen === 'iniciando'
                                    ? 'ESPERANDO CUESTIONARIO...'
                                    : estadoExamen === 'finalizado'
                                        ? '¡EXAMEN FINALIZADO!'
                                        : '...'}
                        </h1>
                    </div>

                    {/* CÁMARA + SLIDER (fijos arriba a la derecha) */}
                    <div className="camara-wrapper-absoluto">
                        <canvas ref={canvasOutputRef} width={128} height={128} className="caja-camara-verde" />
                        <div className="panel-umbral">
                            <label>Similitud: <strong>{Math.round(umbralConfianza * 100)}%</strong></label>
                            <input type="range" min="40" max="95"
                                value={Math.round(umbralConfianza * 100)}
                                onChange={e => {
                                    const v = parseInt(e.target.value) / 100;
                                    umbralConfianzaRef.current = v;
                                    setUmbralConfianza(v);
                                }} />
                        </div>
                        {estadoExamen === 'en_progreso' && (
                            <div style={{ fontSize: '0.75em', color: '#888', textAlign: 'center', maxWidth: '128px', wordBreak: 'break-all' }}>
                                {logDecision}
                            </div>
                        )}
                    </div>

                    {/* ── INICIANDO ── */}
                    {estadoExamen === 'iniciando' && (
                        <div className="info-pantalla-examen">
                            <h2 style={{ color: '#3498db' }}>Conectando...</h2>
                            <p>Estableciendo sesión con el servidor.</p>
                        </div>
                    )}

                    {/* ── ESPERANDO ── */}
                    {estadoExamen === 'esperando' && (
                        <div className="info-pantalla-examen">
                            <h2 style={{ color: '#3498db' }}>Esperando cuestionario...</h2>
                            <p>El profesor no ha iniciado ningún cuestionario todavía.</p>
                            <button className="btn-recalibrar-normal"
                                style={{ marginTop: '30px' }}
                                onClick={() => { setVistaAlumno('calibracion'); setFaseCalibracion('inicio'); }}>
                                Recalibrar Eye-Tracker
                            </button>
                            <button className="btn-volver-chico" style={{ marginTop: '15px' }}
                                onClick={() => { detenerPolling(); setVistaAlumno('menu'); }}>
                                Volver al menú
                            </button>
                        </div>
                    )}

                    {/* ── EN PROGRESO — GRILLA ── */}
                    {estadoExamen === 'en_progreso' && preguntaActual && (
                        <div className="grilla-examen">
                            {ZONAS.map((zona, i) => {
                                const opcion = preguntaActual.opciones[i];
                                return (
                                    <div key={zona}
                                        className={claseCuadrante(zona,
                                            `cuadrante-opcion bg-${['rojo', 'azul', 'amarillo', 'verde'][i]} ${!opcion ? 'opcion-vacia' : ''}`)}>
                                        <span>
                                            {opcionRegistrada === zona
                                                ? '¡REGISTRADO!'
                                                : (opcion?.opcion || '')}
                                        </span>
                                    </div>
                                );
                            })}
                            <div className="zona-neutra">ZONA NEUTRA</div>
                        </div>
                    )}

                    {/* ── FINALIZADO / RESULTADOS ── */}
                    {estadoExamen === 'finalizado' && resultado && (
                        <div className="info-pantalla-examen">
                            <div style={{ fontSize: '1.8em', textAlign: 'center', lineHeight: '1.6' }}>
                                <p>Puntaje necesario: <strong>{resultado.puntajeParaAprobar}</strong></p>
                                <p>
                                    Puntaje obtenido: <strong>{resultado.puntajeObtenido}</strong> / {resultado.puntajeMaximo || '??'}
                                </p>
                                <p>
                                    Tiempo utilizado: <strong>{formatearTiempo(resultado.tiempoSegundos)}</strong>
                                </p>
                                <p style={{
                                    marginTop: '25px',
                                    fontSize: '1.5em',
                                    color: resultado.aprobado ? '#2ecc71' : '#e74c3c'
                                }}>
                                    Resultado: <strong>{resultado.aprobado ? 'Aprobado' : 'Desaprobado'}</strong>
                                </p>
                            </div>

                            <button className="btn-recalibrar-normal"
                                style={{ background: '#555', marginTop: '40px' }}
                                onClick={() => {
                                    setEstadoExamenSync('sin_sesion');
                                    setResultado(null);
                                    setPreguntaActual(null);
                                    sessionStorage.removeItem('tokenAlumno');
                                    tokenRef.current = null;
                                    setVistaAlumno('menu');
                                }}>
                                Volver al menú
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default PantallaAlumno;
