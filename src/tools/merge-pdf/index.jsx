import React from 'react';
import ToolPlaceholder from '../../components/ToolPlaceholder';
import { getToolById } from '../toolsRegistry';

export default function MergePdfTool() {
  const tool = getToolById('merge-pdf');
  return <ToolPlaceholder tool={tool} />;
}
