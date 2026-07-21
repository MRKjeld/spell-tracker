import { HashRouter, Route, Routes } from 'react-router-dom';
import { CharacterList } from '../components/CharacterList/CharacterList';
import { CharacterForm } from '../components/CharacterForm/CharacterForm';
import { CharacterSheet } from '../components/CharacterSheet/CharacterSheet';

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<CharacterList />} />
        <Route path="/new" element={<CharacterForm mode="create" />} />
        <Route path="/:id/edit" element={<CharacterForm mode="edit" />} />
        <Route path="/:id" element={<CharacterSheet />} />
      </Routes>
    </HashRouter>
  );
}
