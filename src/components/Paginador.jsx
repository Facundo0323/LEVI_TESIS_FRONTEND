/**
 * @file Paginador.jsx
 * @brief Controles « Anterior · Página X de Y · Siguiente » para los listados
 * paginados (cuestionarios, profesores y tutores).
 *
 * No se muestra si hay una sola página.
 */

/**
 * @param {number}   pagina        Página actual (empieza en 1).
 * @param {number}   totalPaginas  Cantidad total de páginas.
 * @param {Function} onCambiar     Se llama con el número de la nueva página.
 * @param {boolean}  deshabilitado Deshabilita los botones (por ejemplo, mientras carga).
 */
function Paginador({ pagina, totalPaginas, onCambiar, deshabilitado }) {
    if (totalPaginas <= 1) return null;

    return (
        <div className="paginador">
            <button
                className="btn-gris"
                disabled={deshabilitado || pagina <= 1}
                onClick={() => onCambiar(pagina - 1)}
            >
                « Anterior
            </button>

            <span className="paginador-texto">Página {pagina} de {totalPaginas}</span>

            <button
                className="btn-gris"
                disabled={deshabilitado || pagina >= totalPaginas}
                onClick={() => onCambiar(pagina + 1)}
            >
                Siguiente »
            </button>
        </div>
    );
}

export default Paginador;
