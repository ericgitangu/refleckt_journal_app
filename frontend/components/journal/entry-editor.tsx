// frontend/components/journal/EntryEditor.tsx
import React from "react";

interface EntryEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  placeholder?: string;
}

export default function EntryEditor({
  value,
  onChange,
  fontSize = 16,
  placeholder = "Start writing...",
}: EntryEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-64 p-4 rounded border focus:ring-2 focus:ring-primary"
      style={{ fontSize: `${fontSize}px` }}
      placeholder={placeholder}
    />
  );
}
