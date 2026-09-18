import React from 'react';
import ToolPlaceholder from '../../components/ToolPlaceholder';
import { getToolById } from '../toolsRegistry';

export default function CompressPdfTool() {
  const tool = getToolById('compress-pdf');
  return <ToolPlaceholder tool={tool} />;
}
