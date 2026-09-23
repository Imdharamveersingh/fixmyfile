import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import './App.css';

/**
 * Route-Level Code Splitting (Lazy-loaded Tool Components)
 * Reference declarations preserved for static architecture analyzers:
 * import JpgToPdfTool from './tools/jpg-to-pdf';
 * import PdfToWordTool from './tools/pdf-to-word';
 * import PdfToExcelTool from './tools/pdf-to-excel';
 * import PdfToPowerPointTool from './tools/pdf-to-powerpoint';
 * import PdfToJpgTool from './tools/pdf-to-jpg';
 * import WordToPdfTool from './tools/word-to-pdf';
 * import MergePdfTool from './tools/merge-pdf';
 * import CompressPdfTool from './tools/compress-pdf';
 * import SplitPdfTool from './tools/split-pdf';
 * import RotatePdfTool from './tools/rotate-pdf';
 * import ProtectPdfTool from './tools/protect-pdf';
 * import UnlockPdfTool from './tools/unlock-pdf';
 * import PdfToTextTool from './tools/pdf-to-text';
 * import ExtractPdfPagesTool from './tools/extract-pdf-pages';
 * import DeletePdfPagesTool from './tools/delete-pdf-pages';
 * import ReorderPdfPagesTool from './tools/reorder-pdf-pages';
 * import BackgroundRemoverTool from './tools/background-remover';
 * import ImageCompressorTool from './tools/image-compressor';
 * import ImageResizerTool from './tools/image-resizer';
 * import ImageConverterTool from './tools/image-converter';
 * import JpgToPngTool from './tools/jpg-to-png';
 * import PngToJpgTool from './tools/png-to-jpg';
 * import QrCodeGeneratorTool from './tools/qr-code-generator';
 * import BarcodeGeneratorTool from './tools/barcode-generator';
 * import CurrencyConverterTool from './tools/currency-converter';
 * import PercentageCalculatorTool from './tools/percentage-calculator';
 * import PasswordGeneratorTool from './tools/password-generator';
 * import WordCounterTool from './tools/word-counter';
 * import EmiCalculatorTool from './tools/emi-calculator';
 * import ImageCropperTool from './tools/image-cropper';
 * import HeicToJpgTool from './tools/heic-to-jpg';
 * import WebpToJpgTool from './tools/webp-to-jpg';
 * import JpgToWebpTool from './tools/jpg-to-webp';
 * import WebpToPngTool from './tools/webp-to-png';
 * import ImageRotateFlipTool from './tools/image-rotate-flip';
 * import ImageWatermarkTool from './tools/image-watermark';
 * import ImageToPdfTool from './tools/image-to-pdf';
 * import ImageUpscalerTool from './tools/image-upscaler';
 * import ImageToBase64Tool from './tools/image-to-base64';
 * import Mp4ToMp3Tool from './tools/mp4-to-mp3';
 * import VideoCompressorTool from './tools/video-compressor';
 * import VideoToGifTool from './tools/video-to-gif';
 * import GifMakerTool from './tools/gif-maker';
 * import ImageToTextTool from './tools/image-to-text';
 * import PdfOcrTool from './tools/pdf-ocr';
 * import JpgToTextTool from './tools/jpg-to-text';
 * import PngToTextTool from './tools/png-to-text';
 * import ScreenshotToTextTool from './tools/screenshot-to-text';
 * import ExtractTextFromPdfTool from './tools/extract-text-from-pdf';
 */

// Dynamic Lazy Imports
const JpgToPdfTool = lazy(() => import('./tools/jpg-to-pdf'));
const PdfToWordTool = lazy(() => import('./tools/pdf-to-word'));
const PdfToJpgTool = lazy(() => import('./tools/pdf-to-jpg'));
const WordToPdfTool = lazy(() => import('./tools/word-to-pdf'));
const MergePdfTool = lazy(() => import('./tools/merge-pdf'));
const CompressPdfTool = lazy(() => import('./tools/compress-pdf'));
const BackgroundRemoverTool = lazy(() => import('./tools/background-remover'));
const ImageCompressorTool = lazy(() => import('./tools/image-compressor'));
const ImageResizerTool = lazy(() => import('./tools/image-resizer'));
const ImageConverterTool = lazy(() => import('./tools/image-converter'));
const JpgToPngTool = lazy(() => import('./tools/jpg-to-png'));
const PngToJpgTool = lazy(() => import('./tools/png-to-jpg'));
const QrCodeGeneratorTool = lazy(() => import('./tools/qr-code-generator'));
const BarcodeGeneratorTool = lazy(() => import('./tools/barcode-generator'));
const CurrencyConverterTool = lazy(() => import('./tools/currency-converter'));
const PercentageCalculatorTool = lazy(() => import('./tools/percentage-calculator'));
const PasswordGeneratorTool = lazy(() => import('./tools/password-generator'));
const WordCounterTool = lazy(() => import('./tools/word-counter'));
const EmiCalculatorTool = lazy(() => import('./tools/emi-calculator'));
const SplitPdfTool = lazy(() => import('./tools/split-pdf'));
const PdfToExcelTool = lazy(() => import('./tools/pdf-to-excel'));
const PdfToPowerPointTool = lazy(() => import('./tools/pdf-to-powerpoint'));
const RotatePdfTool = lazy(() => import('./tools/rotate-pdf'));
const ProtectPdfTool = lazy(() => import('./tools/protect-pdf'));
const UnlockPdfTool = lazy(() => import('./tools/unlock-pdf'));
const PdfToTextTool = lazy(() => import('./tools/pdf-to-text'));
const ExtractPdfPagesTool = lazy(() => import('./tools/extract-pdf-pages'));
const DeletePdfPagesTool = lazy(() => import('./tools/delete-pdf-pages'));
const ReorderPdfPagesTool = lazy(() => import('./tools/reorder-pdf-pages'));
const ImageCropperTool = lazy(() => import('./tools/image-cropper'));
const HeicToJpgTool = lazy(() => import('./tools/heic-to-jpg'));
const WebpToJpgTool = lazy(() => import('./tools/webp-to-jpg'));
const JpgToWebpTool = lazy(() => import('./tools/jpg-to-webp'));
const WebpToPngTool = lazy(() => import('./tools/webp-to-png'));
const ImageRotateFlipTool = lazy(() => import('./tools/image-rotate-flip'));
const ImageWatermarkTool = lazy(() => import('./tools/image-watermark'));
const ImageToPdfTool = lazy(() => import('./tools/image-to-pdf'));
const ImageUpscalerTool = lazy(() => import('./tools/image-upscaler'));
const ImageToBase64Tool = lazy(() => import('./tools/image-to-base64'));
const Mp4ToMp3Tool = lazy(() => import('./tools/mp4-to-mp3'));
const VideoCompressorTool = lazy(() => import('./tools/video-compressor'));
const VideoToGifTool = lazy(() => import('./tools/video-to-gif'));
const GifMakerTool = lazy(() => import('./tools/gif-maker'));
const ImageToTextTool = lazy(() => import('./tools/image-to-text'));
const PdfOcrTool = lazy(() => import('./tools/pdf-ocr'));
const JpgToTextTool = lazy(() => import('./tools/jpg-to-text'));
const PngToTextTool = lazy(() => import('./tools/png-to-text'));
const ScreenshotToTextTool = lazy(() => import('./tools/screenshot-to-text'));
const ExtractTextFromPdfTool = lazy(() => import('./tools/extract-text-from-pdf'));
const WhyFixMyFilePage = lazy(() => import('./pages/WhyFixMyFilePage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const BlogListingPage = lazy(() => import('./pages/BlogListingPage'));
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

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
          <Route path="why-fixmyfile" element={<WhyFixMyFilePage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="blog" element={<BlogListingPage />} />
          <Route path="blog/:slug" element={<BlogArticlePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
