import React from 'react';
import ToolPlaceholder from '../../components/ToolPlaceholder';
import { getToolById } from '../toolsRegistry';

export default function WordToPdfTool() {
  const tool = getToolById('word-to-pdf');
  return <ToolPlaceholder tool={tool} />;
}
