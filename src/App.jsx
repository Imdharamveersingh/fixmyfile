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
import BackgroundRemoverTool from './tools/background-remover';
import ImageCompressorTool from './tools/image-compressor';
import ImageResizerTool from './tools/image-resizer';
import ImageConverterTool from './tools/image-converter';
import JpgToPngTool from './tools/jpg-to-png';
import PngToJpgTool from './tools/png-to-jpg';
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
          <Route path="background-remover" element={<BackgroundRemoverTool />} />
          <Route path="image-compressor" element={<ImageCompressorTool />} />
          <Route path="image-resizer" element={<ImageResizerTool />} />
          <Route path="image-converter" element={<ImageConverterTool />} />
          <Route path="jpg-to-png" element={<JpgToPngTool />} />
          <Route path="png-to-jpg" element={<PngToJpgTool />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
