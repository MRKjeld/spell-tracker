import { AppRouter } from './routes/router';
import { UpdatePrompt } from './components/common/UpdatePrompt';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
      <UpdatePrompt />
    </ErrorBoundary>
  );
}

export default App;
