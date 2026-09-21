import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
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
import QrCodeGeneratorTool from './tools/qr-code-generator';
import BarcodeGeneratorTool from './tools/barcode-generator';
import CurrencyConverterTool from './tools/currency-converter';
import PercentageCalculatorTool from './tools/percentage-calculator';
import PasswordGeneratorTool from './tools/password-generator';
import WordCounterTool from './tools/word-counter';
import EmiCalculatorTool from './tools/emi-calculator';
import SplitPdfTool from './tools/split-pdf';
import PdfToExcelTool from './tools/pdf-to-excel';
import PdfToPowerPointTool from './tools/pdf-to-powerpoint';
import RotatePdfTool from './tools/rotate-pdf';
import ProtectPdfTool from './tools/protect-pdf';
import UnlockPdfTool from './tools/unlock-pdf';
import PdfToTextTool from './tools/pdf-to-text';
import ExtractPdfPagesTool from './tools/extract-pdf-pages';
import DeletePdfPagesTool from './tools/delete-pdf-pages';
import ReorderPdfPagesTool from './tools/reorder-pdf-pages';
import ImageCropperTool from './tools/image-cropper';
import HeicToJpgTool from './tools/heic-to-jpg';
import WebpToJpgTool from './tools/webp-to-jpg';
import JpgToWebpTool from './tools/jpg-to-webp';
import WebpToPngTool from './tools/webp-to-png';
import ImageRotateFlipTool from './tools/image-rotate-flip';
import ImageWatermarkTool from './tools/image-watermark';
import ImageToPdfTool from './tools/image-to-pdf';
import ImageUpscalerTool from './tools/image-upscaler';
import ImageToBase64Tool from './tools/image-to-base64';
import Mp4ToMp3Tool from './tools/mp4-to-mp3';
import VideoCompressorTool from './tools/video-compressor';
import VideoToGifTool from './tools/video-to-gif';
import GifMakerTool from './tools/gif-maker';
import ImageToTextTool from './tools/image-to-text';
import PdfOcrTool from './tools/pdf-ocr';
import JpgToTextTool from './tools/jpg-to-text';
import PngToTextTool from './tools/png-to-text';
import ScreenshotToTextTool from './tools/screenshot-to-text';
import ExtractTextFromPdfTool from './tools/extract-text-from-pdf';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="jpg-to-pdf" element={<JpgToPdfTool />} />
          <Route path="pdf-to-word" element={<PdfToWordTool />} />
          <Route path="pdf-to-excel" element={<PdfToExcelTool />} />
          <Route path="pdf-to-powerpoint" element={<PdfToPowerPointTool />} />
          <Route path="pdf-to-jpg" element={<PdfToJpgTool />} />
          <Route path="word-to-pdf" element={<WordToPdfTool />} />
          <Route path="merge-pdf" element={<MergePdfTool />} />
          <Route path="compress-pdf" element={<CompressPdfTool />} />
          <Route path="split-pdf" element={<SplitPdfTool />} />
          <Route path="rotate-pdf" element={<RotatePdfTool />} />
          <Route path="protect-pdf" element={<ProtectPdfTool />} />
          <Route path="unlock-pdf" element={<UnlockPdfTool />} />
          <Route path="pdf-to-text" element={<PdfToTextTool />} />
          <Route path="extract-pdf-pages" element={<ExtractPdfPagesTool />} />
          <Route path="delete-pdf-pages" element={<DeletePdfPagesTool />} />
          <Route path="reorder-pdf-pages" element={<ReorderPdfPagesTool />} />
          <Route path="background-remover" element={<BackgroundRemoverTool />} />
          <Route path="image-compressor" element={<ImageCompressorTool />} />
          <Route path="image-resizer" element={<ImageResizerTool />} />
          <Route path="image-cropper" element={<ImageCropperTool />} />
          <Route path="heic-to-jpg" element={<HeicToJpgTool />} />
          <Route path="webp-to-jpg" element={<WebpToJpgTool />} />
          <Route path="jpg-to-webp" element={<JpgToWebpTool />} />
          <Route path="webp-to-png" element={<WebpToPngTool />} />
          <Route path="image-rotate-flip" element={<ImageRotateFlipTool />} />
          <Route path="image-watermark" element={<ImageWatermarkTool />} />
          <Route path="image-to-pdf" element={<ImageToPdfTool />} />
          <Route path="image-upscaler" element={<ImageUpscalerTool />} />
          <Route path="image-to-base64" element={<ImageToBase64Tool />} />
          <Route path="mp4-to-mp3" element={<Mp4ToMp3Tool />} />
          <Route path="video-compressor" element={<VideoCompressorTool />} />
          <Route path="video-to-gif" element={<VideoToGifTool />} />
          <Route path="gif-maker" element={<GifMakerTool />} />
          <Route path="image-to-text" element={<ImageToTextTool />} />
          <Route path="pdf-ocr" element={<PdfOcrTool />} />
          <Route path="jpg-to-text" element={<JpgToTextTool />} />
          <Route path="png-to-text" element={<PngToTextTool />} />
          <Route path="screenshot-to-text" element={<ScreenshotToTextTool />} />
          <Route path="extract-text-from-pdf" element={<ExtractTextFromPdfTool />} />
          <Route path="image-converter" element={<ImageConverterTool />} />
          <Route path="jpg-to-png" element={<JpgToPngTool />} />
          <Route path="png-to-jpg" element={<PngToJpgTool />} />
          <Route path="qr-code-generator" element={<QrCodeGeneratorTool />} />
          <Route path="barcode-generator" element={<BarcodeGeneratorTool />} />
          <Route path="currency-converter" element={<CurrencyConverterTool />} />
          <Route path="percentage-calculator" element={<PercentageCalculatorTool />} />
          <Route path="password-generator" element={<PasswordGeneratorTool />} />
          <Route path="word-counter" element={<WordCounterTool />} />
          <Route path="emi-calculator" element={<EmiCalculatorTool />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
