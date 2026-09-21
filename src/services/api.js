/**
 * @file api.js
 * @brief Cliente HTTP centralizado para comunicación con el backend ESP32.
 *
 * Todas las llamadas a la API pasan por aquí. La URL base apunta
 * directamente a la IP del CYD ya que la app corre desde LittleFS,
 * en la misma red WiFi local.
 */

const BASE_URL = '';

// ---------------------------------------------------------------------------
// HELPERS INTERNOS
// ---------------------------------------------------------------------------

/**
 * Devuelve el token de sesión normal (profesor/tutor/invitado).
 */
const getToken = () => sessionStorage.getItem('token');

/**
 * Devuelve el token temporal del alumno.
 */
const getAlumnoToken = () => sessionStorage.getItem('tokenAlumno');

/**
 * Construye los headers comunes para todos los requests.
 * Si hay token activo lo incluye como Bearer.
 */
const buildHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

/**
 * Construye los headers para los endpoints del alumno,
 * usando el tokenAlumno en lugar del token de sesión normal.
 */
const buildAlumnoHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAlumnoToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

/**
 * Ejecuta un fetch y devuelve el JSON parseado.
 * Lanza un Error con el mensaje del backend si el status no es 2xx.
 * @param {string} method
 * @param {string} path
 * @param {object|null} body
 * @param {boolean} alumno - Si true, usa el tokenAlumno en lugar del token normal.
 */
const request = async (method, path, body = null, alumno = false) => {
    const options = {
        method,
        headers: alumno ? buildAlumnoHeaders() : buildHeaders(),
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.mensaje || 'Error desconocido del servidor.');
    }

    return data;
};

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

/**
 * Inicia sesión con usuario y contraseña.
 * Guarda el token y datos de sesión en sessionStorage.
 * @returns {{ token, rol, idUsuario, nombre }}
 */
export const login = async (usuario, password) => {
    const data = await request('POST', '/api/auth/login', { usuario, password });
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('rol', data.rol);
    sessionStorage.setItem('idUsuario', data.idUsuario);
    sessionStorage.setItem('nombre', data.nombre);
    return data;
};

/**
 * Inicia sesión como invitado.
 * Guarda el token en sessionStorage.
 * @returns {{ token, rol }}
 */
export const loginInvitado = async () => {
    const data = await request('POST', '/api/auth/invitado');
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('rol', data.rol);
    return data;
};

/**
 * Cierra la sesión activa y limpia sessionStorage.
 */
export const logout = async () => {
    try {
        await request('POST', '/api/auth/logout');
    } catch (_) {
        // Si el servidor ya cerró la sesión igual limpiamos el cliente
    } finally {
        sessionStorage.clear();
    }
};

/**
 * Obtiene los datos del perfil del usuario logueado.
 * @returns {Usuario}
 */
export const getPerfil = () => request('GET', '/api/auth/perfil');

/**
 * Mantiene viva la sesión panel. Llamar cada 30 segundos.
 */
export const heartbeat = () => request('POST', '/api/auth/heartbeat');

// ---------------------------------------------------------------------------
// USUARIOS
// ---------------------------------------------------------------------------

/**
 * Crea un usuario nuevo (con programación defensiva).
 * @param {object} datos
 */
export const crearUsuario = async (datos) => {
    const response = await fetch(`${BASE_URL}/api/usuarios`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(datos)
    });

    const textoResp = await response.text();
    let data = {};
    
    try {
        data = textoResp ? JSON.parse(textoResp) : {};
    } catch (e) {
        data = { mensaje: textoResp };
    }

    if (!response.ok) {
        throw new Error(data.mensaje || 'Error al crear el usuario.');
    }

    return data;
};

/**
 * Elimina un usuario por nombre de login.
 * @param {string} nombreUsuario
 * @param {string} claveMaestra
 */
export const eliminarUsuario = (nombreUsuario, claveMaestra) =>
    request('DELETE', `/api/usuarios/${nombreUsuario}`, { claveMaestra });

/**
 * Edita el perfil del usuario logueado.
 * @param {{ usuario, nombre, apellido, materia, contacto }} datos
 */
export const editarPerfil = (datos) =>
    request('PUT', '/api/usuarios/perfil', datos);

/**
 * Recupera la contraseña desde el login (requiere clave maestra y usuario).
 * @param {{ usuario, claveMaestra, passwordNueva, confirmar }} datos
 */
export const recuperarPassword = (datos) =>
    request('PUT', '/api/usuarios/password', datos);

/**
 * Cambia la contraseña del usuario logueado desde su perfil.
 * @param {{ passwordActual, passwordNueva, confirmar }} datos
 */
export const cambiarMiPassword = (datos) =>
    request('PUT', '/api/usuarios/perfil/password', datos);

/**
 * Lista los profesores (para panel tutor y profesor).
 * @returns {{ profesores: ProfesorResumen[] }}
 */
export const getProfesores = () => request('GET', '/api/usuarios/profesores');

/**
 * Lista los tutores (para panel profesor).
 * @returns {{ tutores: TutorResumen[] }}
 */
export const getTutores = () => request('GET', '/api/usuarios/tutores');


/**
 * Elimina la cuenta del usuario actualmente logueado (con programación defensiva).
 * @param {number} id
 */
export const eliminarUsuarioPorId = async (id) => {
    const response = await fetch(`${BASE_URL}/api/usuario?id=${id}`, {
        method: 'DELETE',
        headers: buildHeaders()
    });
    const textoResp = await response.text();
    let data = {};

    try {
        data = textoResp ? JSON.parse(textoResp) : {};
    } catch (e) {
        data = { mensaje: textoResp };
    }

    if (!response.ok) {
        throw new Error(data.mensaje || 'Error al intentar eliminar la cuenta.');
    }

    return data;
};

// ---------------------------------------------------------------------------
// ALUMNO / EXAMEN
// ---------------------------------------------------------------------------


/**
 * Ping ligero a la cámara para mantener el stream vivo (Fire-and-forget)
 */
export const pingCamara = () => {
    return fetch(`${BASE_URL}/api/camara/ping`, { headers: { 'Connection': 'close' } });
};

/**
 * Envía una pregunta rápida como usuario invitado.
 * @param {{ pregunta, opciones }} datos
 */
export const enviarPreguntaInvitado = (datos) => 
    request('POST', '/api/invitado/pregunta', datos);

/**
 * Inicia la sesión del alumno y obtiene un token temporal.
 * Este endpoint NO requiere token previo (no pasa alumno=true).
 */
export const alumnoIniciar = () =>
    request('POST', '/api/alumno/iniciar', {});

/**
 * Mantiene viva la conexión del alumno.
 * Usa el tokenAlumno.
 */
export const alumnoHeartbeat = () =>
    request('POST', '/api/alumno/heartbeat', {}, true);

/**
 * Consulta el estado actual del examen y la pregunta activa.
 * Usa el tokenAlumno.
 */
export const alumnoEstado = () =>
    request('GET', '/api/alumno/estado', null, true);

/**
 * Envía la respuesta del alumno a una pregunta.
 * Usa el tokenAlumno.
 * @param {number} idPregunta 
 * @param {number} idOpcion 
 */
export const alumnoResponder = (idPregunta, idOpcion) =>
    request('POST', '/api/alumno/responder', { idPregunta, idOpcion }, true);

// ---------------------------------------------------------------------------
// CUESTIONARIOS
// ---------------------------------------------------------------------------

/**
 * Obtiene la lista de cuestionarios para el rol actual.
 */
export const getCuestionarios = () => 
    request('GET', '/api/cuestionarios');

/**
 * Cambia el estado de un cuestionario (iniciar, pausar, reanudar, finalizar).
 * @param {number} id 
 * @param {string} accion (e.g. 'iniciar')
 * @param {object} payload 
 */
export const cambiarEstadoCuestionario = (id, accion, payload = {}) => 
    request('PATCH', `/api/cuestionario/${accion}?id=${id}`, payload);

/**
 * Elimina un cuestionario por ID (con programación defensiva).
 * @param {number} id 
 */
export const eliminarCuestionarioPorId = async (id) => {
    const response = await fetch(`${BASE_URL}/api/cuestionario?id=${id}`, {
        method: 'DELETE',
        headers: buildHeaders()
    });

    const textoResp = await response.text();
    let data = {};
    
    try {
        data = textoResp ? JSON.parse(textoResp) : {};
    } catch (e) {
        data = { mensaje: textoResp };
    }

    if (!response.ok) {
        throw new Error(data.mensaje || 'Error al eliminar el cuestionario.');
    }

    return data;
};

/**
 * Obtiene la revisión de un cuestionario finalizado.
 * @param {number} id 
 */
export const getRevisionCuestionario = (id) => 
    request('GET', `/api/cuestionario/revision?id=${id}`);

/**
 * Obtiene un cuestionario completo con sus preguntas y opciones
 */
export async function getCuestionarioCompleto(id) {
    return request('GET', `/api/cuestionario?id=${id}`);
}

/**
 * Edita un cuestionario existente
 */
export async function editarCuestionario(id, datos) {
    return request('PUT', `/api/cuestionario?id=${id}`, datos);
}

/**
 * Crea un cuestionario nuevo (POST)
 */
export async function crearCuestionario(datos) {
    return request('POST', '/api/cuestionarios', datos);
}
