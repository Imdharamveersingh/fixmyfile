import React from 'react';
import ToolPlaceholder from '../../components/ToolPlaceholder';
import { getToolById } from '../toolsRegistry';

export default function JpgToPdfTool() {
  const tool = getToolById('jpg-to-pdf');
  return <ToolPlaceholder tool={tool} />;
}
