import React from 'react';
import ToolPlaceholder from '../../components/ToolPlaceholder';
import { getToolById } from '../toolsRegistry';

export default function PdfToWordTool() {
  const tool = getToolById('pdf-to-word');
  return <ToolPlaceholder tool={tool} />;
}
