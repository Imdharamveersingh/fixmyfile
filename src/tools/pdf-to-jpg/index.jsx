import React from 'react';
import ToolPlaceholder from '../../components/ToolPlaceholder';
import { getToolById } from '../toolsRegistry';

export default function PdfToJpgTool() {
  const tool = getToolById('pdf-to-jpg');
  return <ToolPlaceholder tool={tool} />;
}
