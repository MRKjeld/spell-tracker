import { AppRouter } from './routes/router';
import { UpdatePrompt } from './components/common/UpdatePrompt';
import './App.css';

function App() {
  return (
    <>
      <AppRouter />
      <UpdatePrompt />
    </>
  );
}

export default App;
