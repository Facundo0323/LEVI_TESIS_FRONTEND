import { render } from 'preact'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './assets/App.css'

render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById('root'),
)
