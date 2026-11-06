import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import { AppErrorBoundary } from './app/AppErrorBoundary.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(<AppErrorBoundary><App /></AppErrorBoundary>);
