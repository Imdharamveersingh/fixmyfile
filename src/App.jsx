import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import JpgToPdfTool from './tools/jpg-to-pdf';
import PdfToWordTool from './tools/pdf-to-word';
import PdfToJpgTool from './tools/pdf-to-jpg';
import WordToPdfTool from './tools/word-to-pdf';
import MergePdfTool from './tools/merge-pdf';
import CompressPdfTool from './tools/compress-pdf';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="jpg-to-pdf" element={<JpgToPdfTool />} />
          <Route path="pdf-to-word" element={<PdfToWordTool />} />
          <Route path="pdf-to-jpg" element={<PdfToJpgTool />} />
          <Route path="word-to-pdf" element={<WordToPdfTool />} />
          <Route path="merge-pdf" element={<MergePdfTool />} />
          <Route path="compress-pdf" element={<CompressPdfTool />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
