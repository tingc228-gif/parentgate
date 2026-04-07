import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddMessage from './pages/AddMessage';
import Messages from './pages/Messages';
import MessageDetail from './pages/MessageDetail';
import Events from './pages/Events';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddMessage />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<MessageDetail />} />
          <Route path="/events" element={<Events />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
