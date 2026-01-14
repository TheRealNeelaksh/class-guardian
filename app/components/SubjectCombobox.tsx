'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

interface SubjectComboboxProps {
    value: string;
    onChange: (val: string) => void;
    options: string[];
    disabled?: boolean;
    placeholder?: string;
}

export function SubjectCombobox({ value, onChange, options, disabled, placeholder }: SubjectComboboxProps) {
    const [query, setQuery] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync internal state if value changes externally (e.g. selection)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // On blur, if query is not empty and not selected, we treat it as new subject?
                // Or just keep the query as the value?
                // The parent manages state via onChange.
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const filteredOptions =
        query === ''
            ? options
            : options.filter((subject) =>
                subject.toLowerCase().includes(query.toLowerCase())
            );

    const handleSelect = (subject: string) => {
        onChange(subject);
        setQuery(subject);
        setIsOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onChange(val);
        setIsOpen(true);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white outline-none disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                    value={query}
                    onChange={handleChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder || "Select or type subject..."}
                    disabled={disabled}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronsUpDown className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {filteredOptions.length === 0 && query !== '' ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-neutral-500">
                            Create &quot;<span className="font-semibold text-neutral-900 dark:text-white">{query}</span>&quot;
                        </div>
                    ) : (
                        <ul className="py-1">
                            {filteredOptions.map((subject) => (
                                <li
                                    key={subject}
                                    className={`relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 cursor-pointer`}
                                    onClick={() => handleSelect(subject)}
                                >
                                    <span className="block truncate">
                                        {subject}
                                    </span>
                                    {subject === value && (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-900 dark:text-white">
                                            <Check className="w-4 h-4" aria-hidden="true" />
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
