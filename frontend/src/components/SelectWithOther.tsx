import { useEffect, useRef, useState } from 'react';

// A dropdown whose "Other" choice opens a text box so the faculty can say what
// it actually is. The typed text is stored in the same field as the choice —
// no extra column — so reviewers and the PDF read "Program Chair", not
// "Other". Nothing that scores reads these fields, so free text cannot move a
// score.
//
// Picking Other and leaving the box empty stores the literal "Other". The box
// stays open while its text is cleared or retyped; only picking a listed
// choice closes it.

type Option = string | { value: string; label: string };

interface Props {
  value: string | null | undefined;
  onChange: (value: string) => void;
  /** The listed choices. "Other" is appended automatically — do not include it. */
  options: readonly Option[];
  /** Label for an empty first choice. Omit when the field always has a value. */
  placeholder?: string;
  otherPlaceholder?: string;
  className?: string;
}

const OTHER = 'Other';

export default function SelectWithOther({
  value, onChange, options, placeholder, otherPlaceholder = 'Please specify', className,
}: Props) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const isListed = (v: string) => opts.some((o) => o.value === v);
  const current = value ?? '';

  const [otherMode, setOtherMode] = useState(current !== '' && !isListed(current));
  const [text, setText] = useState(current === OTHER || isListed(current) ? '' : current);
  // The last value this component emitted, so an outside change (the form
  // loading a saved draft) can be told apart from the user's own typing.
  const emitted = useRef<string | null>(null);

  useEffect(() => {
    if (current === emitted.current) return;
    const custom = current !== '' && !isListed(current);
    setOtherMode(custom);
    setText(custom && current !== OTHER ? current : '');
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (next: string) => {
    emitted.current = next;
    onChange(next);
  };

  return (
    <>
      <select
        className={className}
        value={otherMode ? OTHER : current}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOtherMode(true);
            emit(text.trim() ? text : OTHER);
          } else {
            setOtherMode(false);
            emit(e.target.value);
          }
        }}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        <option value={OTHER}>Other</option>
      </select>
      {otherMode && (
        <input
          className={`${className ?? ''} mt-2`}
          placeholder={otherPlaceholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            emit(e.target.value.trim() ? e.target.value : OTHER);
          }}
        />
      )}
    </>
  );
}
