import './PantallaHome.css';

function PantallaHome({ onEntrarAlumno, onEntrarUsuario }) {
    return (
        <div className="home-page-container">
            <h1 className="home-welcome">¡Bienvenido!</h1>
            
            <div className="home-buttons-group">
                <button className="btn-azul btn-home-large" onClick={onEntrarAlumno}>
                    Entrar como Alumno
                </button>

                <button className="btn-gris btn-home-large" onClick={onEntrarUsuario}>
                    Entrar como Usuario externo
                </button>
            </div>

            <div className="home-footer">
                L.E.V.I. - Low-cost Eye-tracker with Visual Interface
            </div>
        </div>
    );
}

export default PantallaHome;