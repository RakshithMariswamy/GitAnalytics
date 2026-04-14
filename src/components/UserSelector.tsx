/**
 * UserSelector.tsx
 *
 * Tag-style input for selecting GitLab author names or email fragments to
 * filter by. Supports adding tags via Enter/comma and removing via ×.
 * An empty list means "all authors" — shown clearly in the UI.
 */

import { useState, useRef, KeyboardEvent } from 'react';

interface UserSelectorProps {
  authors: string[];
  onChange: (authors: string[]) => void;
  disabled: boolean;
}

export function UserSelector({ authors, onChange, disabled }: UserSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /** Commit the current input value as a new tag */
  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !authors.includes(trimmed)) {
      onChange([...authors, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(authors.filter((a) => a !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && authors.length > 0) {
      // Remove the last tag on backspace when the input is empty
      onChange(authors.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        Author Filter
        <span className="ml-2 text-gray-600 normal-case font-normal">
          — empty = all authors
        </span>
      </label>

      {/* Tag container + input */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`
          flex flex-wrap gap-2 items-center min-h-[2.75rem] px-3 py-2
          bg-gray-800 border border-gray-700 rounded-lg cursor-text
          focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500
          transition-colors
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {authors.map((author) => (
          <span
            key={author}
            className="inline-flex items-center gap-1 bg-brand-700/30 text-brand-300
                       border border-brand-700/50 rounded-md px-2 py-0.5 text-sm font-mono"
          >
            {author}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(author);
              }}
              className="text-brand-400 hover:text-red-400 transition-colors leading-none ml-0.5"
              aria-label={`Remove ${author}`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          disabled={disabled}
          placeholder={authors.length === 0 ? 'Type a name or email, press Enter…' : ''}
          className="flex-1 min-w-[180px] bg-transparent outline-none text-sm text-gray-200
                     placeholder:text-gray-600"
        />
      </div>

      <p className="text-xs text-gray-500">
        Filter by GitLab author name or email fragment. Matching is case-insensitive.
      </p>
    </div>
  );
}
