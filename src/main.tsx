import {createRoot} from 'react-dom/client';
import {installApiFetchInterceptor} from './utils/apiConfig';
import App from './App.tsx';
import './index.css';

installApiFetchInterceptor();

createRoot(document.getElementById('root')!).render(<App />);

