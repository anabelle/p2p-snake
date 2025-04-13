import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { CANVAS } from './game/constants';


document.documentElement.style.setProperty('--canvas-max-width', `${CANVAS.MAX_WIDTH}px`);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);

reportWebVitals();
