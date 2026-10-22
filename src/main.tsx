import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './final-round.css';
import {FinalRoundProvider} from './FinalRoundContext';

createRoot(document.getElementById('root')!).render(<FinalRoundProvider><App /></FinalRoundProvider>);
